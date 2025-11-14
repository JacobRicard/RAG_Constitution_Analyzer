import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import JSZip from "https://esm.sh/jszip@3.10.1";

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

    // File parsing - logging removed for security

    const fileText = await extractTextFromDocument(file);
    
    if (!fileText || fileText.length < 10) {
      // Failed to extract meaningful text from document
      return new Response(
        JSON.stringify({ 
          title: 'Untitled Amendment',
          amendmentText: '',
          error: 'Could not extract text from document. Please try copying and pasting the text manually.'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract key components
    const title = extractTitle(fileText);
    const amendmentText = extractAmendmentText(fileText);

    // Amendment parsed successfully

    return new Response(
      JSON.stringify({ 
        title,
        amendmentText,
        fullText: fileText
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    // Error parsing amendment - details not logged for security
    return new Response(
      JSON.stringify({ 
        title: 'Untitled Amendment',
        amendmentText: '',
        error: error instanceof Error ? error.message : 'Failed to parse document'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function extractTextFromDocument(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  
  // Handle DOCX files
  if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
      file.name.endsWith('.docx')) {
    // Processing DOCX file
    return await extractTextFromDocx(arrayBuffer);
  }
  
  // Handle PDF files - for now, return empty string with message
  if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
    // PDF parsing not fully implemented yet
    return 'PDF text extraction not available. Please copy and paste the text manually.';
  }
  
  // Handle plain text files
  const text = await file.text();
  return text;
}

async function extractTextFromDocx(arrayBuffer: ArrayBuffer): Promise<string> {
  try {
    // Loading DOCX as ZIP
    const zip = new JSZip();
    await zip.loadAsync(arrayBuffer);
    
    // DOCX files contain the main document in word/document.xml
    const documentXmlFile = zip.file('word/document.xml');
    
    if (!documentXmlFile) {
      // Could not find document.xml in DOCX
      return '';
    }
    
    const documentXml = await documentXmlFile.async('text');
    
    if (Deno.env.get('ENVIRONMENT') === 'development') {
      console.log('Extracting text from XML...');
    }
    // Extract text from <w:t> tags (text runs in Word XML)
    const textMatches = documentXml.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g);
    const textArray: string[] = [];
    
    for (const match of textMatches) {
      if (match[1]) {
        textArray.push(match[1]);
      }
    }
    
    let extractedText = textArray.join(' ');
    
    // Also try to get text from any remaining content by stripping all XML tags if we got too little
    if (extractedText.length < 50) {
      let text = documentXml.replace(/<[^>]+>/g, ' ');
      text = text.replace(/\s+/g, ' ').trim();
      extractedText = text;
    }
    
    // Extracted text
    return extractedText.trim();
  } catch (error) {
    // Error extracting text from DOCX
    throw new Error('Failed to parse DOCX file');
  }
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
