import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import pdfParse from 'https://esm.sh/pdf-parse@1.1.1';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limiting map: IP -> { count, resetTime }
const rateLimiter = new Map<string, { count: number; resetTime: number }>();

// Clean up old entries every hour
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of rateLimiter.entries()) {
    if (now > data.resetTime) {
      rateLimiter.delete(ip);
    }
  }
}, 3600000);

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Rate limiting
    const clientIp = req.headers.get('x-forwarded-for') || 'unknown';
    const now = Date.now();
    const rateLimit = rateLimiter.get(clientIp);

    if (rateLimit && now < rateLimit.resetTime) {
      if (rateLimit.count >= 20) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      rateLimit.count++;
    } else {
      rateLimiter.set(clientIp, { count: 1, resetTime: now + 60000 });
    }

    const { question, type, pdfBase64 } = await req.json();

    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid or missing question parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (question.length > 1000) {
      return new Response(
        JSON.stringify({ error: 'Question is too long (max 1000 characters)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (type && !['question', 'validate'].includes(type)) {
      return new Response(
        JSON.stringify({ error: 'Invalid type parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!pdfBase64 || typeof pdfBase64 !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid PDF data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processing constitution analysis with PDF...');

    // Extract text from PDF using pdf-parse
    const pdfBuffer = Uint8Array.from(atob(pdfBase64), c => c.charCodeAt(0));
    const pdfData = await pdfParse(pdfBuffer);
    const pdfText = pdfData.text;

    console.log(`Extracted ${pdfText.length} characters from ${pdfData.numpages} pages`);

    // Get approved amendments
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: amendments } = await supabase
      .from('amendments')
      .select('title, amendment_text, approved_at')
      .eq('status', 'approved')
      .order('approved_at', { ascending: true });

    let amendmentsContext = '';
    if (amendments && amendments.length > 0) {
      amendmentsContext = '\n\nAPPROVED AMENDMENTS:\n' + 
        amendments.map(a => `- ${a.title} (Approved: ${a.approved_at})\n${a.amendment_text}`).join('\n\n');
    }

    let systemPrompt = '';
    if (type === 'validate') {
      systemPrompt = `You are a constitutional expert analyzing amendments to the MUSG Constitution. Review the proposed amendment against the current constitution PDF and ALL supporting documents (including Senate Standing Rules, Financial Policies, By-Laws, etc.) for:

1. Constitutional compliance and conflicts
2. Proper citation of existing articles and sections across ALL governing documents
3. Correct placement within the constitution structure
4. Clarity and specificity of language
5. Potential unintended consequences
6. Alignment with MUSG's mission and bylaws
7. Procedural requirements for passage

Provide detailed analysis including:
- Whether the amendment properly cites actual sections and rules from the governing documents
- Any conflicts with existing constitutional provisions or supporting documents
- Suggestions for improvement
- Required approval procedures
- Impact on related constitutional provisions and supporting documents

Be thorough and reference specific sections of the constitution and supporting documents.`;
    } else {
      systemPrompt = `You are a helpful assistant with expertise in the Marquette University Student Government Constitution and ALL its supporting documents. The PDF contains:
- Main Constitution
- Senate Standing Rules (including attendance policies, quorum requirements, and parliamentary procedures)
- By-Laws
- Financial Policies
- Budget Approval Procedures
- Election Rules
- Senior Speaker Selection Procedures
- Student Organization Recognition Procedures
- University Committee Student Representation Procedures

When answering questions about any of these documents, cite the specific section and provide relevant context. Be precise and reference the actual text when appropriate.`;
    }

    console.log('Calling OpenAI GPT-4o for constitution analysis...');
    
    // Build the user message with extracted PDF text
    const userMessage = `CONSTITUTION AND SUPPORTING DOCUMENTS:\n${pdfText}\n\n${amendmentsContext}\n\nQuestion/Request: ${question}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error:', response.status, errorData);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'OpenAI rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else if (response.status === 503) {
        return new Response(
          JSON.stringify({ error: 'OpenAI service is temporarily unavailable. Please try again later.' }),
          { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'Failed to get response from AI service' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const answer = data.choices[0].message.content;

    console.log('Constitution analysis complete');

    return new Response(
      JSON.stringify({ answer }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in constitution analysis:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
