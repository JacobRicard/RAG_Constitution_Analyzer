import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CONSTITUTION_TEXT = `MARQUETTE UNIVERSITY STUDENT GOVERNMENT CONSTITUTION
[Full constitution text would be included here - abbreviated for space]`;

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

Action of MUSG Legislative Vice President Reagen
_________________________________ Date: ___________

Action of MUSG President Browne
_________________________________ Date: ___________

Action of Student Affairs Designee
_________________________________ Date: ___________`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { mode, input, clarification, constitutionText } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    let systemPrompt = "";
    let userPrompt = "";

    if (mode === "A") {
      systemPrompt = `You are a legislative drafting assistant for Marquette University Student Government (MUSG). You draft complete, formally styled bills using the MUSG constitution and bill template.

Your task:
1. Understand the policy goal provided
2. Infer necessary mechanisms (definitions, authorizations, procedures, enforcement, funding)
3. Draft a complete bill following the template structure
4. Ensure constitutional compliance
5. After the bill text, provide a brief explanation of constitutional support

Write in neutral, formal legislative style. Avoid vague standards when concrete thresholds can be specified. Prefer options that align with the constitution while advancing the core goal.`;

      userPrompt = `Constitutional Text:
${constitutionText || CONSTITUTION_TEXT}

Bill Template:
${BILL_TEMPLATE}

Policy Goal:
${input}

Please draft a complete bill following the template structure and explain which constitutional provisions support it.

Format your response as:
TITLE: [Short descriptive title]
BILL_TEXT:
[Complete bill text here]

EXPLANATION:
[Constitutional analysis here]`;

    } else if (mode === "B") {
      systemPrompt = `You are a legislative drafting assistant for Marquette University Student Government (MUSG). You fix constitutional weaknesses by drafting precise bill language.

Your task:
1. Analyze each weakness provided
2. Understand the constitutional problem (vague, overbroad, unenforceable, etc.)
3. Draft bill language (amendments, repeals, or additions) that cures the weaknesses
4. Preserve lawful policy goals while fixing constitutional issues
5. Integrate all fixes into one coherent bill following the template
6. Explain how each weakness has been addressed

Write in neutral, formal legislative style with precise, enforceable language.`;

      const clarificationText = clarification ? `\n\nDesired Clarification:\n${clarification}` : "";

      userPrompt = `Constitutional Text:
${constitutionText || CONSTITUTION_TEXT}

Bill Template:
${BILL_TEMPLATE}

Constitutional Weaknesses to Fix:
${input}${clarificationText}

Please draft a bill that fixes these weaknesses and explain how each issue has been addressed.

Format your response as:
TITLE: [Short descriptive title]
BILL_TEXT:
[Complete bill text here]

EXPLANATION:
[Analysis of how each weakness was fixed]`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const fullResponse = data.choices?.[0]?.message?.content || "";

    // Parse the response
    const titleMatch = fullResponse.match(/TITLE:\s*(.*?)(?:\n|$)/i);
    const billMatch = fullResponse.match(/BILL_TEXT:\s*([\s\S]*?)(?=EXPLANATION:|$)/i);
    const explanationMatch = fullResponse.match(/EXPLANATION:\s*([\s\S]*?)$/i);

    const title = titleMatch ? titleMatch[1].trim() : "MUSG Legislative Draft";
    const billText = billMatch ? billMatch[1].trim() : fullResponse;
    const explanation = explanationMatch ? explanationMatch[1].trim() : "See bill text above for constitutional analysis.";

    return new Response(
      JSON.stringify({ title, billText, explanation }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    // Error in generate-bill function
    return new Response(
      JSON.stringify({ error: error.message || "Failed to generate bill" }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
