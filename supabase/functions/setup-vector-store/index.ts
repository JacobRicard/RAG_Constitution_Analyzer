import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");

// List of constitution documents to upload
const DOCUMENTS = [
  "CONSTITUTION.pdf",
  "CONSTITUTION_BY-LAWS.pdf",
  "BUDGET_APPROVAL_PROCEDURES.pdf",
  "ELECTION_RULES.pdf",
  "FINANCIAL_POLICIES.pdf",
  "SENATE_STANDING_RULES.pdf",
  "SENIOR_SPEAKER_SELECTION_PROCEDURES.pdf",
  "UNIVERSITY_COMMITTEE_STUDENT_REPRESENTATION_PROCEDURES.pdf"
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Only allow admins to run this
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    if (!OPENAI_API_KEY) {
      throw new Error("OpenAI API key not configured");
    }

    console.log("Starting vector store setup...");

    // Step 1: Create vector store
    console.log("Creating vector store...");
    const vectorStoreResponse = await fetch("https://api.openai.com/v1/vector_stores", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
        "OpenAI-Beta": "assistants=v2"
      },
      body: JSON.stringify({
        name: "MUSG Constitution and Documents",
        expires_after: {
          anchor: "last_active_at",
          days: 365
        }
      })
    });

    if (!vectorStoreResponse.ok) {
      const error = await vectorStoreResponse.json();
      console.error("Failed to create vector store:", error);
      throw new Error(`Failed to create vector store: ${JSON.stringify(error)}`);
    }

    const vectorStore = await vectorStoreResponse.json();
    const vectorStoreId = vectorStore.id;
    console.log("Vector store created:", vectorStoreId);

    // Step 2: Upload and add each PDF to the vector store
    const uploadResults = [];
    
    for (const docName of DOCUMENTS) {
      try {
        console.log(`Processing ${docName}...`);
        
        // Fetch the PDF from public storage
        const pdfUrl = `${SUPABASE_URL}/storage/v1/object/public/documents/${docName}`;
        const pdfResponse = await fetch(pdfUrl);
        
        if (!pdfResponse.ok) {
          console.error(`Failed to fetch ${docName} from storage`);
          uploadResults.push({ file: docName, status: "failed", error: "Not found in storage" });
          continue;
        }

        const pdfBlob = await pdfResponse.blob();
        
        // Upload to OpenAI Files API
        const formData = new FormData();
        formData.append("file", pdfBlob, docName);
        formData.append("purpose", "assistants");

        const fileUploadResponse = await fetch("https://api.openai.com/v1/files", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${OPENAI_API_KEY}`,
          },
          body: formData
        });

        if (!fileUploadResponse.ok) {
          const error = await fileUploadResponse.json();
          console.error(`Failed to upload ${docName}:`, error);
          uploadResults.push({ file: docName, status: "failed", error: error.error?.message || "Upload failed" });
          continue;
        }

        const fileData = await fileUploadResponse.json();
        console.log(`${docName} uploaded with ID: ${fileData.id}`);

        // Add file to vector store
        const addToVectorStoreResponse = await fetch(
          `https://api.openai.com/v1/vector_stores/${vectorStoreId}/files`,
          {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${OPENAI_API_KEY}`,
              "Content-Type": "application/json",
              "OpenAI-Beta": "assistants=v2"
            },
            body: JSON.stringify({
              file_id: fileData.id
            })
          }
        );

        if (!addToVectorStoreResponse.ok) {
          const error = await addToVectorStoreResponse.json();
          console.error(`Failed to add ${docName} to vector store:`, error);
          uploadResults.push({ file: docName, status: "failed", error: "Failed to add to vector store" });
          continue;
        }

        console.log(`${docName} added to vector store`);
        uploadResults.push({ file: docName, status: "success", fileId: fileData.id });

      } catch (error) {
        console.error(`Error processing ${docName}:`, error);
        uploadResults.push({ 
          file: docName, 
          status: "failed", 
          error: error instanceof Error ? error.message : "Unknown error" 
        });
      }
    }

    const successCount = uploadResults.filter(r => r.status === "success").length;
    const failCount = uploadResults.filter(r => r.status === "failed").length;

    return new Response(
      JSON.stringify({ 
        message: "Vector store setup complete",
        vectorStoreId,
        results: uploadResults,
        summary: `${successCount} files uploaded successfully, ${failCount} failed`,
        instructions: `Add this to your Supabase secrets: OPENAI_VECTOR_STORE_ID=${vectorStoreId}`
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in setup-vector-store function:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "An unexpected error occurred" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
