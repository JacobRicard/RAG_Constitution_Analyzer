import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.81.0";

// ─── Configuration ────────────────────────────────────────────────────────────
const LM_STUDIO_BASE_URL =
  (Deno.env.get("LM_STUDIO_BASE_URL") ?? "http://127.0.0.1:1234").replace(/\/$/, "");

// Optional API key — required for cloud providers (Groq, OpenRouter, etc.)
const AI_API_KEY = Deno.env.get("AI_API_KEY");

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// How many past exchanges (user+assistant pairs) to include
const MAX_HISTORY_MESSAGES = 10;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ─── Per-IP rate limiting ─────────────────────────────────────────────────────
const rateLimiter = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60_000;

setInterval(() => {
  const now = Date.now();
  for (const [key, val] of rateLimiter) {
    if (now > val.resetTime) rateLimiter.delete(key);
  }
}, 60_000);

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimiter.get(ip);
  if (entry) {
    if (now < entry.resetTime) {
      if (entry.count >= RATE_LIMIT) return false;
      entry.count++;
    } else {
      rateLimiter.set(ip, { count: 1, resetTime: now + RATE_WINDOW_MS });
    }
  } else {
    rateLimiter.set(ip, { count: 1, resetTime: now + RATE_WINDOW_MS });
  }
  return true;
}

// ─── Global token budget ──────────────────────────────────────────────────────
async function isTokenBudgetExceeded(supabase: any): Promise<boolean> {
  const { data } = await supabase
    .from("ai_usage")
    .select("total_tokens, token_limit")
    .eq("id", 1)
    .single();
  if (!data) return false;
  return data.total_tokens >= data.token_limit;
}

async function recordTokenUsage(supabase: any, tokens: number): Promise<void> {
  await supabase.rpc("increment_ai_tokens", { tokens_used: tokens });
}

// ─── Current bill template (2025-2026) ───────────────────────────────────────
const BILL_TEMPLATE = `Alumni Memorial Union, 133
P.O. Box 1881
Milwaukee, WI 53201-1881

MARQUETTE UNIVERSITY STUDENT SENATE 2025-2026

[Bill Type]

TITLE (ie. A resolution to)

Authors:
Sponsors:
Reviewed by [Committee] on [Month Day, Year]
Submitted to the Legislative Vice President [Month Day, Year]

Whereas Marquette University Student Government (MUSG) serves to actively identify, understand, address and represent students' needs, concerns and interests through acts of leadership and service that reflect Catholic, Jesuit ideals and contribute to the betterment of the Marquette University community and,

Whereas

Whereas

Whereas

Therefore, let it be resolved …

Let it be resolved further,

Furthermore,

Furthermore,

Action of MUSG Legislative Vice President Burdin
_________________________________ Date: ___________

Action of MUSG President Ricard
_________________________________ Date: ___________

Action of Student Affairs Designee
_________________________________ Date: ___________`;

// ─── Main handler ─────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Per-IP rate limit
    const clientIP = req.headers.get("x-forwarded-for") ?? "unknown";
    if (!checkRateLimit(clientIP)) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { mode, input, clarification, constitutionText, conversationId } = await req.json();

    // Global token budget check
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    if (await isTokenBudgetExceeded(supabase)) {
      return new Response(
        JSON.stringify({ error: "Service is temporarily unavailable. Please try again later." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Input validation
    if (!mode || !input) throw new Error("mode and input are required");
    if (!["A", "B"].includes(mode)) throw new Error("Invalid mode. Must be 'A' or 'B'");
    if (typeof input !== "string") throw new Error("input must be a string");
    if (input.length > 50_000) throw new Error("input must be less than 50,000 characters");
    if (clarification && typeof clarification !== "string") throw new Error("clarification must be a string");
    if (clarification && clarification.length > 10_000) throw new Error("clarification must be less than 10,000 characters");
    if (constitutionText && typeof constitutionText !== "string") throw new Error("constitutionText must be a string");
    if (constitutionText && constitutionText.length > 200_000) throw new Error("constitutionText must be less than 200,000 characters");
    if (conversationId && typeof conversationId !== "string") throw new Error("conversationId must be a string");

    // Auth is optional — if a valid JWT is provided, load/persist conversation history
    const authHeader = req.headers.get("Authorization");
    let user: any = null;
    if (authHeader) {
      const jwt = authHeader.replace(/^Bearer\s+/i, "");
      const { data: { user: u } } = await supabase.auth.getUser(jwt);
      user = u ?? null;
    }

    // Load conversation history if authenticated
    let history: Array<{ role: string; content: string }> = [];
    if (user && conversationId) {
      const { data: rows } = await supabase
        .from("chat_messages")
        .select("role, content")
        .eq("user_id", user.id)
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true })
        .limit(MAX_HISTORY_MESSAGES);

      if (rows) {
        history = rows.map((r: any) => ({ role: r.role, content: r.content }));
      }
    }

    const constitution = constitutionText
      ? constitutionText.substring(0, 100_000)
      : "(Constitution not provided — use general MUSG knowledge)";

    // System prompt always carries the constitution so history messages stay clean
    let systemPrompt: string;
    let userPrompt: string;

    if (mode === "A") {
      systemPrompt = `You are a legislative drafting assistant for Marquette University Student Government (MUSG). Draft complete, formally-styled bills that follow the provided template exactly. Write in neutral, formal legislative style with concrete thresholds over vague standards. Ensure constitutional compliance and fill every template field.

If prior bills exist in the conversation, the user may be asking you to refine them — incorporate their feedback precisely.

MUSG CONSTITUTION:
${constitution}`;

      userPrompt = `Bill Template:
${BILL_TEMPLATE}

Policy Goal:
${input}

Fill in all template fields (bill type, title, authors, sponsors, committee, dates, whereas clauses, resolutions, signature blocks). Use placeholder values for author/sponsor names and dates. Respond using this exact format:

TITLE: [Short descriptive title]
BILL_TEXT:
[Complete bill text matching the template]

EXPLANATION:
[Which constitutional provisions authorize this bill]`;

    } else {
      const clarificationText = clarification ? `\n\nDesired Clarification:\n${clarification}` : "";

      systemPrompt = `You are a legislative drafting assistant for Marquette University Student Government (MUSG). Fix constitutional weaknesses by drafting precise, enforceable bill language that follows the provided template exactly. Preserve lawful policy goals while curing every identified defect. Write in neutral, formal legislative style.

If prior bills exist in the conversation, the user may be asking you to refine them — incorporate their feedback precisely.

MUSG CONSTITUTION:
${constitution}`;

      userPrompt = `Bill Template:
${BILL_TEMPLATE}

Constitutional Weaknesses to Fix:
${input}${clarificationText}

Draft a single bill that addresses all weaknesses. Fill in all template fields. Respond using this exact format:

TITLE: [Short descriptive title]
BILL_TEXT:
[Complete bill text matching the template]

EXPLANATION:
[How each weakness was addressed]`;
    }

    // Build messages: system + history + current user message
    const messages = [
      { role: "system", content: systemPrompt },
      ...history,
      { role: "user", content: userPrompt },
    ];

    // Call LM Studio
    const aiResponse = await fetch(`${LM_STUDIO_BASE_URL}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(AI_API_KEY ? { "Authorization": `Bearer ${AI_API_KEY}` } : {}),
      },
      body: JSON.stringify({
        model: Deno.env.get("LM_STUDIO_MODEL") ?? "local-model",
        messages,
        temperature: 0.3,
        max_tokens: 6144,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      throw new Error(`LM Studio error ${aiResponse.status}: ${errText.substring(0, 200)}`);
    }

    const aiData = await aiResponse.json();
    const fullResponse = aiData.choices?.[0]?.message?.content?.trim() ?? "";

    if (!fullResponse) throw new Error("Empty response from AI");

    // Record token usage against global budget
    const tokensUsed = aiData.usage?.total_tokens ?? 0;
    if (tokensUsed > 0) await recordTokenUsage(supabase, tokensUsed);

    // Parse structured response
    const titleMatch = fullResponse.match(/TITLE:\s*(.*?)(?:\n|$)/i);
    const billMatch = fullResponse.match(/BILL_TEXT:\s*([\s\S]*?)(?=EXPLANATION:|$)/i);
    const explanationMatch = fullResponse.match(/EXPLANATION:\s*([\s\S]*?)$/i);

    const title = titleMatch ? titleMatch[1].trim() : "MUSG Legislative Draft";
    const billText = billMatch ? billMatch[1].trim() : fullResponse;
    const explanation = explanationMatch
      ? explanationMatch[1].trim()
      : "See bill text above for constitutional analysis.";

    // Persist exchange so the next call in this session has context (only when authenticated)
    if (user && conversationId) {
      // Store the plain user input (not the full prompt with constitution) to keep history lean
      const storedUserMessage =
        mode === "A"
          ? `Policy Goal: ${input}`
          : `Weaknesses: ${input}${clarification ? `\n\nClarification: ${clarification}` : ""}`;

      await supabase.from("chat_messages").insert([
        { user_id: user.id, conversation_id: conversationId, role: "user", content: storedUserMessage },
        { user_id: user.id, conversation_id: conversationId, role: "assistant", content: fullResponse },
      ]);
    }

    return new Response(
      JSON.stringify({ title, billText, explanation }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in generate-bill:", error);
    return new Response(
      JSON.stringify({ error: error.message ?? "Failed to generate bill" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
