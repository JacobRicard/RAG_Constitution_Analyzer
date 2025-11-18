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
    const vectorStoreId = Deno.env.get("OPENAI_VECTOR_STORE_ID")?.trim();
    
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

    const instructions = type === "validate"
      ? `You are a constitutional expert for Marquette University Student Government (MUSG). 
         You have access to the complete MUSG Constitution and all supporting documents through file search.
         
         Validate amendment proposals by checking:
         1. Correct citation of existing articles and sections
         2. Proper placement in constitutional structure
         3. Conflicts with existing provisions
         4. Compliance with amendment procedures
         5. Constitutional soundness
         
         Provide detailed analysis with specific references to relevant constitutional sections.
         ${amendmentContext ? "Also consider these approved amendments: " + amendmentContext : ""}`
      : `You are a helpful assistant with expertise in the Marquette University Student Government (MUSG) Constitution.
         You have access to the complete MUSG Constitution and all supporting documents including:
         - Main Constitution, Constitution By-Laws, Budget Approval Procedures, Election Rules
         - Financial Policies, Senate Standing Rules, Senior Speaker Selection Procedures
         - University Committee Student Representation Procedures
         
         Use file search to find relevant information and always cite specific articles, sections, or document names.
         ${amendmentContext ? "\n\nAlso consider these approved amendments:\n" + amendmentContext : ""}
         
         Keep answers clear, concise, and well-organized.`;

    console.log("Creating assistant with file_search capability...");

    // Create or get assistant
    const assistantResponse = await fetch("https://api.openai.com/v1/assistants", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
        "OpenAI-Beta": "assistants=v2"
      },
      body: JSON.stringify({
        name: "MUSG Constitution Assistant",
        instructions: instructions,
        model: "gpt-4o-mini",
        tools: [{ type: "file_search" }],
        tool_resources: {
          file_search: {
            vector_store_ids: [vectorStoreId]
          }
        }
      })
    });

    if (!assistantResponse.ok) {
      const error = await assistantResponse.json();
      console.error("Failed to create assistant:", error);
      throw new Error(`Failed to create assistant: ${JSON.stringify(error)}`);
    }

    const assistant = await assistantResponse.json();
    console.log("Assistant created:", assistant.id);

    // Create a thread
    const threadResponse = await fetch("https://api.openai.com/v1/threads", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
        "OpenAI-Beta": "assistants=v2"
      },
      body: JSON.stringify({})
    });

    if (!threadResponse.ok) {
      const error = await threadResponse.json();
      console.error("Failed to create thread:", error);
      throw new Error(`Failed to create thread: ${JSON.stringify(error)}`);
    }

    const thread = await threadResponse.json();
    console.log("Thread created:", thread.id);

    // Add message to thread
    const messageResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
        "OpenAI-Beta": "assistants=v2"
      },
      body: JSON.stringify({
        role: "user",
        content: question
      })
    });

    if (!messageResponse.ok) {
      const error = await messageResponse.json();
      console.error("Failed to add message:", error);
      throw new Error(`Failed to add message: ${JSON.stringify(error)}`);
    }

    console.log("Message added to thread");

    // Run the assistant
    const runResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
        "OpenAI-Beta": "assistants=v2"
      },
      body: JSON.stringify({
        assistant_id: assistant.id
      })
    });

    if (!runResponse.ok) {
      const error = await runResponse.json();
      console.error("Failed to create run:", error);
      throw new Error(`Failed to create run: ${JSON.stringify(error)}`);
    }

    const run = await runResponse.json();
    console.log("Run created:", run.id);

    // Poll for completion
    let runStatus = run.status;
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds timeout

    while (runStatus !== "completed" && runStatus !== "failed" && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const statusResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs/${run.id}`, {
        headers: {
          "Authorization": `Bearer ${OPENAI_API_KEY}`,
          "OpenAI-Beta": "assistants=v2"
        }
      });

      if (!statusResponse.ok) {
        throw new Error("Failed to check run status");
      }

      const statusData = await statusResponse.json();
      runStatus = statusData.status;
      attempts++;
      
      console.log(`Run status: ${runStatus} (attempt ${attempts})`);
    }

    if (runStatus !== "completed") {
      throw new Error(`Run did not complete. Status: ${runStatus}`);
    }

    // Get messages
    const messagesResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "OpenAI-Beta": "assistants=v2"
      }
    });

    if (!messagesResponse.ok) {
      const error = await messagesResponse.json();
      throw new Error(`Failed to get messages: ${JSON.stringify(error)}`);
    }

    const messages = await messagesResponse.json();
    const assistantMessages = messages.data.filter((msg: any) => msg.role === "assistant");
    
    if (assistantMessages.length === 0) {
      throw new Error("No response from assistant");
    }

    const answer = assistantMessages[0].content[0].text.value;
    console.log("Got response from assistant");

    // Clean up - delete thread and assistant
    await fetch(`https://api.openai.com/v1/threads/${thread.id}`, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "OpenAI-Beta": "assistants=v2"
      }
    });

    await fetch(`https://api.openai.com/v1/assistants/${assistant.id}`, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "OpenAI-Beta": "assistants=v2"
      }
    });


    return new Response(
      JSON.stringify({ answer }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in analyze-constitution function:", error);
    
    // Handle rate limit errors
    if (error instanceof Error && error.message.includes("429")) {
      return new Response(
        JSON.stringify({ error: "AI service rate limit exceeded. Please try again in a moment." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "An unexpected error occurred" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
