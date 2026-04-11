import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import PizZip from "npm:pizzip@3.1.6";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ─── XML helpers ──────────────────────────────────────────────────────────────

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

interface ParaOpts {
  bold?: boolean;
  center?: boolean;
  fontSize?: number;   // half-points (24 = 12pt)
  spaceAfter?: number; // twips
  spaceBefore?: number;
}

function para(text: string, opts: ParaOpts = {}): string {
  const {
    bold = false,
    center = false,
    fontSize = 24,
    spaceAfter = 160,
    spaceBefore = 0,
  } = opts;

  const jc = center ? `<w:jc w:val="center"/>` : `<w:jc w:val="both"/>`;
  const spacing = `<w:spacing w:before="${spaceBefore}" w:after="${spaceAfter}"/>`;
  const rPr = `<w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>${bold ? "<w:b/><w:bCs/>" : ""}<w:sz w:val="${fontSize}"/><w:szCs w:val="${fontSize}"/>`;

  return (
    `<w:p>` +
    `<w:pPr>${jc}${spacing}<w:rPr>${rPr}</w:rPr></w:pPr>` +
    `<w:r><w:rPr>${rPr}</w:rPr><w:t xml:space="preserve">${esc(text)}</w:t></w:r>` +
    `</w:p>`
  );
}

function emptyPara(spaceAfter = 120): string {
  return `<w:p><w:pPr><w:spacing w:after="${spaceAfter}"/></w:pPr></w:p>`;
}

// ─── Line classifier ──────────────────────────────────────────────────────────
// Maps each line from the AI bill text to a formatted OOXML paragraph.

function classifyLine(line: string): string {
  const t = line.trim();

  if (!t) return emptyPara(120);

  // Address header
  if (/^Alumni Memorial Union|^P\.O\. Box|^Milwaukee,\s*WI/i.test(t)) {
    return para(t, { center: true, fontSize: 20, spaceAfter: 60 });
  }

  // Organisation / session heading
  if (/^MARQUETTE UNIVERSITY STUDENT SENATE/i.test(t)) {
    return para(t, { bold: true, center: true, fontSize: 28, spaceBefore: 120, spaceAfter: 200 });
  }

  // Bill type label (e.g. "A Resolution", "A Bill", "A Constitutional Amendment")
  if (/^(A|AN)\s+(Resolution|Bill|Constitutional\s+Amendment)$/i.test(t)) {
    return para(t, { center: true, spaceAfter: 120 });
  }

  // Full-caps title line ("A RESOLUTION TO …", "A BILL TO …")
  if (/^(A|AN)\s+(RESOLUTION|BILL|CONSTITUTIONAL\s+AMENDMENT)\s+TO\b/i.test(t)) {
    return para(t, { bold: true, center: true, spaceAfter: 200 });
  }

  // Metadata lines
  if (/^(Authors?|Sponsors?|Reviewed\s+by|Submitted\s+to)\b/i.test(t)) {
    return para(t, { fontSize: 22, spaceAfter: 80 });
  }

  // Whereas / resolution clauses
  if (
    /^Whereas\b/i.test(t) ||
    /^Therefore,\s+let\s+it\s+be\s+resolved/i.test(t) ||
    /^Let\s+it\s+be\s+resolved/i.test(t) ||
    /^Furthermore,/i.test(t)
  ) {
    return para(t, { spaceAfter: 200 });
  }

  // Signature block labels
  if (/^Action\s+of\s+MUSG/i.test(t)) {
    return para(t, { spaceBefore: 280, spaceAfter: 40 });
  }

  // Signature underscores / date lines
  if (/^_{5,}/.test(t) || /^_{3,}.*Date:/.test(t)) {
    return para(t, { spaceAfter: 240 });
  }

  // Default: body text, justified
  return para(t, { spaceAfter: 160 });
}

// ─── Document builder ─────────────────────────────────────────────────────────

function buildDocxBase64(billText: string): string {
  const paragraphs = billText.split("\n").map(classifyLine).join("\n");

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
            xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
${paragraphs}
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;

  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
          xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>
        <w:sz w:val="24"/>
        <w:szCs w:val="24"/>
      </w:rPr>
    </w:rPrDefault>
    <w:pPrDefault>
      <w:pPr>
        <w:spacing w:after="160"/>
        <w:jc w:val="both"/>
      </w:pPr>
    </w:pPrDefault>
  </w:docDefaults>
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
  </w:style>
</w:styles>`;

  const settingsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:defaultTabStop w:val="720"/>
  <w:compat>
    <w:compatSetting w:name="compatibilityMode"
                     w:uri="http://schemas.microsoft.com/office/word"
                     w:val="15"/>
  </w:compat>
</w:settings>`;

  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>
</Types>`;

  const packageRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1"
    Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument"
    Target="word/document.xml"/>
</Relationships>`;

  const documentRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1"
    Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles"
    Target="styles.xml"/>
  <Relationship Id="rId2"
    Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings"
    Target="settings.xml"/>
</Relationships>`;

  const zip = new PizZip();
  zip.file("[Content_Types].xml", contentTypesXml);
  zip.file("_rels/.rels", packageRelsXml);
  zip.file("word/document.xml", documentXml);
  zip.file("word/_rels/document.xml.rels", documentRelsXml);
  zip.file("word/styles.xml", stylesXml);
  zip.file("word/settings.xml", settingsXml);

  return zip.generate({
    type: "base64",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    compression: "DEFLATE",
  });
}

// ─── Handler ──────────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!req.headers.get("Authorization")) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { billText, billTitle } = await req.json();

    if (!billText || !billTitle) throw new Error("billText and billTitle are required");
    if (typeof billText !== "string" || typeof billTitle !== "string") throw new Error("billText and billTitle must be strings");
    if (billTitle.length > 500) throw new Error("billTitle must be less than 500 characters");
    if (billText.length > 100_000) throw new Error("billText must be less than 100,000 characters");

    const docx = buildDocxBase64(billText);

    return new Response(
      JSON.stringify({ docx }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    console.error("Error generating docx:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to generate document" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
