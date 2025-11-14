import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import PizZip from "https://esm.sh/pizzip@3.1.6";
import Docxtemplater from "https://esm.sh/docxtemplater@3.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { billText, billTitle } = await req.json();
    
    // Input validation
    if (!billText || !billTitle) {
      throw new Error("Bill text and title are required");
    }

    if (typeof billText !== 'string' || typeof billTitle !== 'string') {
      throw new Error("Bill text and title must be strings");
    }

    if (billTitle.length > 500) {
      throw new Error("Bill title must be less than 500 characters");
    }

    if (billText.length > 100000) {
      throw new Error("Bill text must be less than 100,000 characters");
    }

    // Fetch the template
    const templateUrl = `${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/templates/bill-template.docx`;
    let templateResponse;
    
    try {
      templateResponse = await fetch(templateUrl);
    } catch {
      // If template doesn't exist in storage, create a basic docx
      return createBasicDocx(billTitle, billText);
    }

    if (!templateResponse.ok) {
      return createBasicDocx(billTitle, billText);
    }

    const templateBuffer = await templateResponse.arrayBuffer();
    const zip = new PizZip(templateBuffer);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });

    // Set template data
    doc.render({
      title: billTitle,
      billText: billText,
      date: new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }),
    });

    const generatedDocx = doc.getZip().generate({
      type: "base64",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });

    return new Response(
      JSON.stringify({ docx: generatedDocx }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error("Error generating docx:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to generate document" }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

// Fallback: create a basic Word document structure
function createBasicDocx(title: string, content: string) {
  const xmlContent = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:pPr>
        <w:jc w:val="center"/>
        <w:rPr>
          <w:b/>
          <w:sz w:val="32"/>
        </w:rPr>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:b/>
          <w:sz w:val="32"/>
        </w:rPr>
        <w:t>${escapeXml(title)}</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:pPr>
        <w:spacing w:after="240"/>
      </w:pPr>
    </w:p>
    ${content.split('\n').map(line => `
    <w:p>
      <w:r>
        <w:t xml:space="preserve">${escapeXml(line)}</w:t>
      </w:r>
    </w:p>
    `).join('')}
  </w:body>
</w:document>`;

  const zip = new PizZip();
  
  // Add required files for a minimal docx
  zip.file("word/document.xml", xmlContent);
  zip.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`);
  
  zip.file("_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);

  const generatedDocx = zip.generate({
    type: "base64",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });

  return new Response(
    JSON.stringify({ docx: generatedDocx }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
