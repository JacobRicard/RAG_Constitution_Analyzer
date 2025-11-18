import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

// Rate limiting
const rateLimiter = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 20;
const RATE_WINDOW = 60000; // 1 minute

// Clean up old rate limit entries every minute
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimiter.entries()) {
    if (now > value.resetTime) {
      rateLimiter.delete(key);
    }
  }
}, 60000);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authorization check
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    // Rate limiting by IP
    const clientIP = req.headers.get("x-forwarded-for") || "unknown";
    const now = Date.now();
    const rateData = rateLimiter.get(clientIP);
    
    if (rateData) {
      if (now < rateData.resetTime) {
        if (rateData.count >= RATE_LIMIT) {
          return new Response(
            JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        rateData.count++;
      } else {
        rateLimiter.set(clientIP, { count: 1, resetTime: now + RATE_WINDOW });
      }
    } else {
      rateLimiter.set(clientIP, { count: 1, resetTime: now + RATE_WINDOW });
    }

    const { question, type = "general" } = await req.json();

    // Input validation
    if (!question || typeof question !== "string") {
      throw new Error("Invalid question parameter");
    }
    if (question.length > 2000) {
      throw new Error("Question too long (max 2000 characters)");
    }
    if (!["general", "validate"].includes(type)) {
      throw new Error("Invalid type parameter");
    }

    if (!OPENAI_API_KEY) {
      throw new Error("OpenAI API key not configured");
    }

    console.log("Processing question:", question.substring(0, 100));

    // Get or create vector store ID from environment
    const vectorStoreId = Deno.env.get("OPENAI_VECTOR_STORE_ID");
    
    if (!vectorStoreId) {
      console.log("No vector store ID found. You need to set up the vector store first.");
      return new Response(
        JSON.stringify({ 
          error: "Vector store not initialized. Please contact administrator to set up the constitution documents." 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch approved amendments
    const supabase = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!);
    const { data: amendments } = await supabase
      .from("amendments")
      .select("title, amendment_text, approved_at")
      .eq("status", "approved")
      .order("approved_at", { ascending: true });

    // Build context with amendments
    let amendmentContext = "";
    if (amendments && amendments.length > 0) {
      amendmentContext = "\n\nApproved Amendments:\n" + 
        amendments.map((a) => `${a.title}:\n${a.amendment_text}`).join("\n\n");
    }

    const systemPrompt = type === "validate"
      ? `You are a constitutional expert for Marquette University Student Government (MUSG). 
         You have access to the complete MUSG Constitution and all supporting documents through the file search tool.
         
         Your task is to validate amendment proposals against the constitution.
         
         Check for:
         1. Correct citation of existing articles and sections
         2. Proper placement in constitutional structure
         3. Conflicts with existing provisions
         4. Compliance with amendment procedures
         5. Constitutional soundness
         
         Provide a detailed analysis with specific references to relevant constitutional sections.
         ${amendmentContext ? "Also consider these approved amendments: " + amendmentContext : ""}`
      : `You are a helpful assistant with expertise in the Marquette University Student Government (MUSG) Constitution.
         You have access to the complete MUSG Constitution and all supporting documents including:
         - Main Constitution
         - Constitution By-Laws
         - Budget Approval Procedures
         - Election Rules
         - Financial Policies
         - Senate Standing Rules
         - Senior Speaker Selection Procedures
         - University Committee Student Representation Procedures
         
         Use the file search tool to find relevant information from these documents to answer questions accurately.
         Always cite specific articles, sections, or document names when referencing information.
         ${amendmentContext ? "\n\nAlso consider these approved amendments:\n" + amendmentContext : ""}
         
         Keep your answers clear, concise, and well-organized.`;

    // Use OpenAI Chat Completions API with file_search tool
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: question }
        ],
        tools: [{
          type: "file_search",
          file_search: {
            vector_store_ids: [vectorStoreId]
          }
        }],
        temperature: 0.7,
        max_tokens: 1500
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("OpenAI API error:", errorData);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "AI service is currently rate limited. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`OpenAI API error: ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    console.log("OpenAI response received");

    const answer = data.choices?.[0]?.message?.content || "I'm sorry, I couldn't generate a response.";

    return new Response(
      JSON.stringify({ answer }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in analyze-constitution function:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "An unexpected error occurred" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
