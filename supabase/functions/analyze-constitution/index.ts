import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const GOOGLE_API_KEY = Deno.env.get('GOOGLE_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const constitutionContext = `
MARQUETTE UNIVERSITY STUDENT GOVERNMENT CONSTITUTION
Last Amended: March 15, 2025

PREAMBLE
Marquette University Student Government serves to actively identify, understand, address, and represent students' needs, concerns, and interests through acts of leadership and service that reflect Catholic, Jesuit ideals and contribute to the betterment of the Marquette University community.

ARTICLE I – NAME
The name of this organization shall be Marquette University Student Government, hereafter referred to as MUSG.

ARTICLE II – MEMBERSHIP
Section 1: The membership of MUSG shall include all full-time undergraduate students of Marquette University.
Section 2—Non-discrimination clause: Consistent with all applicable Federal and State laws and University policies, this organization and its subordinate bodies and officers shall not discriminate on the basis of race, color, age, religion, veteran's status, gender, sexual orientation, national origin, or disability in its selection of officers and appointees.

ARTICLE III – FUNCTIONS
The functions of MUSG shall be the following:
A. To act as the primary student voice of the Marquette Community.
B. To manage the MUSG portion of the Student Activity fee and derived funds.
C. To promote and sponsor services for the student body.
D. To recognize and support student organizations.

ARTICLE IV – ORGANIZATIONAL STRUCTURE
Section 1: The officers of MUSG shall be the President, Executive Vice President, Financial Vice President, Communication Vice President, Legislative Vice President and Outreach Vice President.
Section 2: There shall be an Executive Board of MUSG, chaired by the President, and comprised of the officers of MUSG.
Section 3: There shall be an Executive Department, chaired by the Executive Vice President, and comprised of the Chief of Staff and the Campus Activities Board Liaison.
Section 4: There shall be a Financial Department, chaired by the Financial Vice President, and comprised of Three (3) Financial Office Assistants.
Section 5: There shall be a Communications Department, chaired by the Communications Vice President, and comprised of Three (3) Directors, Graphic Design Assistants, Multimedia Assistants, and Public Relations Assistants.
Section 6: There shall be a Senate, chaired by the Legislative Vice President, and comprised of the Legislative Clerk, and Academic and Residential Senators.
Section 7: There shall be an Outreach Department, chaired by the Outreach Vice President, and comprised of the Senior Speaker Coordinator, the Administrative Assistant, the Coordinator for the Diversity, Equity, and Social Justice Committee, the Coordinator for the Community Engagement Committee, the Coordinator for Sustainability, and the Office Receptionists.
Section 8: There shall be an Elections Committee, chaired by the Elections Coordinator, and comprised of additional Elections Committee members.
Section 9: There shall be a Judicial Administrator.

ARTICLE V – ELECTIONS
Section 1: The procedure for MUSG elections is stated in the MUSG Election Rules. Any changes in the Election Rules are subject to a two-thirds affirmative vote of the seated Senate.
Section 2: The President, Executive Vice President, and Academic Senators shall be elected annually in the spring election. Officials elected in the spring elections shall take office on April 1st.
Section 3: Residential Senators shall be elected annually in the fall elections. The fall elections shall be held the fourth week of the fall semester.

ARTICLE VI – APPOINTMENT OF MUSG OFFICERS AND ASSISTANTS
Various selection committees exist for different positions, including Financial Vice President, Communications Vice President, and Outreach Vice President. The Legislative Vice President is elected by the Senate. All appointments follow specific procedures outlined in the constitution.

ARTICLE VII – MEETINGS
Regular meetings are required for all departments at least once per month during fall and spring semesters. Quorum is defined as greater than 50% of current membership.

ARTICLE VIII – FINANCES
The Financial Vice President manages MUSG finances under Senate oversight. All expenditures must follow proper approval procedures.

ARTICLE IX – IMPEACHMENT AND REMOVAL
Officers can be removed for cause through specific procedures involving the Senate and appropriate committees.

ARTICLE X – CONSTITUTIONAL AMENDMENTS
Amendments require a two-thirds vote of the Senate and approval from the Vice President for Belonging and Student Affairs.
`;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { question } = await req.json();
    
    if (!question) {
      return new Response(
        JSON.stringify({ error: 'Question is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Analyzing constitution question:', question);

    const systemPrompt = `You are an expert assistant specializing in the Marquette University Student Government (MUSG) Constitution. Your role is to help students, faculty, and administrators understand the constitution's provisions, procedures, and organizational structure.

When answering questions:
1. Provide accurate information based on the constitution text
2. Cite specific articles and sections when relevant
3. Explain complex procedures in clear, accessible language
4. If a question falls outside the constitution's scope, acknowledge this and provide context
5. Be concise but thorough
6. Use a professional yet friendly tone

Here is the MUSG Constitution:

${constitutionContext}`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GOOGLE_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: `${systemPrompt}\n\nQuestion: ${question}` }]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI service temporarily unavailable. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const answer = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Unable to generate response';

    console.log('Constitution analysis complete');

    return new Response(
      JSON.stringify({ answer }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in analyze-constitution function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
