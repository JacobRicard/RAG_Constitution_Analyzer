import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.81.0";

// ─── Configuration ────────────────────────────────────────────────────────────
// LM Studio base URL — change this env var to point at your local AI server.
// Default: http://127.0.0.1:1234  (LM Studio default)
const LM_STUDIO_BASE_URL =
  (Deno.env.get("LM_STUDIO_BASE_URL") ?? "http://127.0.0.1:1234").replace(/\/$/, "");

// Optional API key — required for cloud providers (Groq, OpenRouter, etc.)
// Leave unset when using local LM Studio.
const AI_API_KEY = Deno.env.get("AI_API_KEY");

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// How many past messages to include for context (user+assistant pairs)
const MAX_HISTORY_MESSAGES = 20;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ─── Rate limiting (in-memory, per Deno isolate) ─────────────────────────────
const rateLimiter = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 30;
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

// ─── Main handler ─────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limiting
    const clientIP = req.headers.get("x-forwarded-for") ?? "unknown";
    if (!checkRateLimit(clientIP)) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { question, type = "general", conversationId, constitutionText } = await req.json();

    // Input validation
    if (!question || typeof question !== "string") {
      throw new Error("Invalid question parameter");
    }
    if (question.length > 15_000) {
      throw new Error("Question too long (max 15,000 characters)");
    }
    if (!["general", "validate"].includes(type)) {
      throw new Error("Invalid type. Must be 'general' or 'validate'");
    }
    if (conversationId && typeof conversationId !== "string") {
      throw new Error("conversationId must be a string");
    }

    // Auth is optional — if a valid JWT is provided, load/persist conversation history
    const authHeader = req.headers.get("authorization");
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    let user: any = null;
    if (authHeader) {
      const jwt = authHeader.replace(/^Bearer\s+/i, "");
      const { data: { user: u } } = await supabase.auth.getUser(jwt);
      user = u ?? null;
    }

    // Load conversation history if authenticated and a conversationId was provided
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

    // Fetch approved amendments to inject into system context
    const { data: amendments } = await supabase
      .from("amendments")
      .select("title, amendment_text, approved_at")
      .eq("status", "approved")
      .order("approved_at", { ascending: true });

    let amendmentContext = "";
    if (amendments && amendments.length > 0) {
      amendmentContext =
        "\n\nAPPROVED AMENDMENTS (these override or supplement the base constitution):\n" +
        amendments.map((a: any) => `${a.title}:\n${a.amendment_text}`).join("\n\n");
    }

    // Build system prompt
    const constitutionSection = constitutionText
      ? constitutionText.substring(0, 150_000)
      : "";

    const systemPrompt =
      type === "validate"
        ? `You are a constitutional expert for Marquette University Student Government (MUSG).

Validate amendment proposals by checking:
1. Correct citation of existing articles and sections
2. Proper placement within the constitutional structure
3. Conflicts with existing provisions
4. Compliance with amendment procedures (Article VIII)
5. Overall constitutional soundness

Provide detailed analysis with specific citations like "Article III, Section 2" or "By-Laws Article VI". Be precise and cite the exact sections relevant to your analysis.${amendmentContext}

${constitutionSection ? `\n\nMUSG CONSTITUTION AND GOVERNING DOCUMENTS:\n${constitutionSection}` : ""}`
        : `You are a helpful AI assistant with deep expertise in the Marquette University Student Government (MUSG) Constitution and all its governing documents, including:
- Main Constitution
- Constitution By-Laws
- Budget Approval Procedures
- Election Rules
- Financial Policies
- Senate Standing Rules
- Senior Speaker Selection Procedures
- Student Organization Recognition Procedures
- University Committee Student Representation Procedures

When citing the documents, use natural readable references such as "Article III of the Constitution" or "Section 4.4 of the Election Rules". Never use raw file-reference bracket syntax.

Keep answers clear, well-organized, and accurate. If you're unsure, say so.${amendmentContext}

${constitutionSection ? `\n\nMUSG CONSTITUTION AND GOVERNING DOCUMENTS:\n${constitutionSection}` : ""}`;

    // Build messages array: system + history + new user message
    const messages = [
      { role: "system", content: systemPrompt },
      ...history,
      { role: "user", content: question },
    ];

    // Call LM Studio (OpenAI-compatible chat completions)
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
        max_tokens: 2048,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      throw new Error(`LM Studio error ${aiResponse.status}: ${errText.substring(0, 200)}`);
    }

    const aiData = await aiResponse.json();
    const answer = aiData.choices?.[0]?.message?.content?.trim() ?? "";

    if (!answer) {
      throw new Error("Empty response from AI");
    }

    // Persist this exchange to the database if authenticated and a conversationId was provided
    if (user && conversationId) {
      await supabase.from("chat_messages").insert([
        { user_id: user.id, conversation_id: conversationId, role: "user", content: question },
        { user_id: user.id, conversation_id: conversationId, role: "assistant", content: answer },
      ]);
    }

    return new Response(
      JSON.stringify({ answer }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in analyze-constitution:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "An unexpected error occurred",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
