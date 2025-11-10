import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return new Response(
        JSON.stringify({ error: 'No file provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Parsing amendment file:', file.name);

    // Convert file to base64
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    const base64 = btoa(String.fromCharCode(...bytes));

    // Use a document parsing service or simple text extraction
    // For now, we'll use a simple approach with PDFium or similar
    // This is a placeholder - in production, you'd use a proper PDF parsing library
    
    // For demonstration, we'll extract text using a hypothetical parsing approach
    // In reality, you'd need to integrate with a PDF parsing service
    
    const fileText = await extractTextFromDocument(file);
    
    // Extract key components
    const title = extractTitle(fileText);
    const amendmentText = extractAmendmentText(fileText);

    console.log('Amendment parsed successfully');

    return new Response(
      JSON.stringify({ 
        title,
        amendmentText,
        fullText: fileText
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error parsing amendment:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to parse document' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function extractTextFromDocument(file: File): Promise<string> {
  // This is a simplified implementation
  // In production, you'd use proper PDF/DOCX parsing libraries
  const text = await file.text();
  return text;
}

function extractTitle(text: string): string {
  // Extract title from "Amendment to..." pattern
  const titleMatch = text.match(/Amendment to ([^\n]+)/i);
  return titleMatch ? titleMatch[0] : 'Untitled Amendment';
}

function extractAmendmentText(text: string): string {
  // Extract the text between "Therefore, let it be resolved" and "So be it resolved"
  const startMatch = text.match(/Therefore,?\s*let it be resolved[^:]*:\s*/i);
  const endMatch = text.match(/So be it resolved/i);
  
  if (startMatch && endMatch) {
    const startIndex = startMatch.index! + startMatch[0].length;
    const endIndex = endMatch.index!;
    return text.substring(startIndex, endIndex).trim();
  }
  
  return text;
}
