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
Section 1: The procedure for MUSG elections is stated in the MUSG Election Rules.
Section 2: The President, Executive Vice President, and Academic Senators shall be elected annually in the spring election. Officials elected in the spring elections shall take office on April 1st.
Section 3: Residential Senators shall be elected annually in the fall elections.

ARTICLE VI – APPOINTMENT OF MUSG OFFICERS AND ASSISTANTS
Section 1: The Executive Vice President, in consultation with the President, shall appoint the Chief of Staff and the Campus Activities Board Liaison.
Section 2: The Outreach Vice President shall be recommended by the Outreach Selection Committee and approved by a two-thirds affirmative vote of the present Senate.
Section 3: The Financial Vice President shall be recommended by the Financial Selection Committee and approved by a two-thirds affirmative vote of the present Senate.
Section 4: The Communications Vice President shall be recommended by the Communications Selection Committee and approved by a two-thirds affirmative vote of the present Senate.
Section 5: The Legislative Vice President shall be elected from the membership of MUSG by a majority vote of the seated Senate.

ARTICLE VII – MEETINGS
Section 1-7: Various departments must meet at least once per month during fall and spring semesters. Quorum is defined as greater than 50% of current membership.

ARTICLE VIII – FINANCES
The Financial Vice President shall manage MUSG finances under Senate oversight. All expenditures must follow proper approval procedures as outlined in the Financial Policies.

ARTICLE IX – IMPEACHMENT AND REMOVAL
Officers can be removed for cause through specific procedures involving the Senate. A two-thirds vote of the seated Senate shall be necessary to facilitate the removal of any person holding an elected position in MUSG.

ARTICLE X – CONSTITUTIONAL AMENDMENTS
Amendments require a two-thirds vote of the Senate and approval from the Vice President for Belonging and Student Affairs.

===== BY-LAWS =====

ARTICLE I – EXECUTIVE BOARD
The Executive Board, chaired by the President, is comprised of the President, Executive Vice President, Financial Vice President, Communications Vice President, Legislative Vice President, and Outreach Vice President. The Executive Board meets at least once per month during the fall and spring semesters and is responsible for overseeing MUSG operations and strategic direction.

ARTICLE II – EXECUTIVE DEPARTMENT
The Executive Department, chaired by the Executive Vice President, consists of the Chief of Staff and Campus Activities Board Liaison. The Executive Vice President oversees day-to-day operations, chairs the Student Organization Funding Committee, and manages the coordination between MUSG departments.

ARTICLE III – PRESIDENT
Responsibilities include:
- Serving as chief executive and spokesperson for MUSG
- Chairing the Executive Board
- Signing or vetoing legislation passed by the Senate
- Appointing members to various committees
- Managing overall MUSG operations

ARTICLE IV – FINANCIAL DEPARTMENT  
The Financial Department, chaired by the Financial Vice President, consists of Three (3) Financial Office Assistants. The Financial Vice President is responsible for:
- Managing the MUSG Annual Operating Budget
- Chairing the Budget Committee
- Serving as a voting member of the Student Organization Funding Committee
- Overseeing all financial transactions and maintaining financial records
- Preparing financial reports for the Senate

ARTICLE V – COMMUNICATIONS DEPARTMENT
The Communications Department, chaired by the Communications Vice President, consists of Three (3) Directors, Graphic Design Assistants, Multimedia Assistants, and Public Relations Assistants. Responsibilities include managing MUSG's public relations, social media, website, marketing materials, and communications strategy.

ARTICLE VI – SENATE
The Senate, chaired by the Legislative Vice President, consists of the Legislative Clerk and Academic and Residential Senators. The Senate is the legislative body of MUSG responsible for:
- Passing legislation and resolutions
- Approving the annual budget
- Confirming appointments of Vice Presidents
- Representing student concerns

Senate Standing Committees include:
1. Business and Administration Committee – Reviews MUSG appointments and internal operations
2. External Relations Committee – Handles relationships with university administration and external organizations  
3. Student Organization Funding Committee (SOF) – Allocates Student Activity Fee funds to student organizations. The Executive Vice President serves as Chair of this committee.

ARTICLE VII – OUTREACH DEPARTMENT
The Outreach Department, chaired by the Outreach Vice President, consists of the Senior Speaker Coordinator, Administrative Assistant, Coordinator for Diversity, Equity, and Social Justice, Coordinator for Community Engagement, Coordinator for Sustainability, and Office Receptionists.

ARTICLE VIII – OFFICER DESCRIPTIONS

President:
- Chief executive officer of MUSG
- Chairs Executive Board meetings
- Signs or vetoes legislation
- Serves as primary spokesperson

Executive Vice President:  
- Chairs the Executive Department
- CHAIRS THE STUDENT ORGANIZATION FUNDING COMMITTEE (SOF)
- Oversees day-to-day MUSG operations
- Becomes President if that office is vacated

Financial Vice President:
- Manages MUSG finances and budget
- Chairs the Budget Committee  
- Voting member of SOF Committee
- Prepares financial reports

Communications Vice President:
- Manages all MUSG communications
- Oversees marketing and public relations
- Maintains MUSG website and social media

Legislative Vice President:
- Chairs the Senate
- Manages Senate legislative process
- Coordinates Senate committees

Outreach Vice President:
- Manages community engagement initiatives
- Coordinates diversity and social justice programs
- Oversees sustainability efforts

===== FINANCIAL POLICIES =====

SECTION I – AUTHORITY
The Marquette University Student Government (MUSG) Financial Policies define the policies and procedures which pertain to the collection and distribution of MUSG funds, as mandated by Article VIII of the MUSG Constitution.

SECTION II – DEFINITIONS

1. MUSG Annual Operating Budget – Comprised of revenues from the MUSG portion of the Student Activity Fee (SAF) and derived funds and their disbursement for the fiscal year of July 1 to June 30.

2. MUSG Budget Committee – Standing committee of MUSG responsible for compiling and submitting annual budget recommendations. Voting members shall be the Financial Vice President as Chair, President, one Academic Senator, one Residential Senator and the Vice President for Belonging and Student Affairs or designee.

3. Student Organization Funding Committee (SOF) – Standing committee of MUSG responsible for compiling and overseeing the periodic allocations of the Student Activity Fee as it pertains to club sports teams and registered student organizations. 

**VOTING MEMBERS OF SOF COMMITTEE:**
- Executive Vice President (CHAIR)
- Financial Vice President  
- Coordinator for Diversity, Equity, and Social Justice
- Two Academic Senators
- Two Residential Senators
- Vice President for Belonging and Student Affairs or Designee (advisor, must be present)

The Executive Vice President chairs the SOF Committee and is responsible for overseeing the Student Organization Funding process, including organizing meetings, coordinating deliberations, and ensuring proper allocation procedures are followed.

4. Student Activity Fee (SAF) – Assessed by the University against the membership of MUSG. The MUSG portion of the SAF shall be collected by the University for MUSG.

5. Derived Funds – Funds derived from MUSG-sponsored qualifying student services, or any interest earned on the investment of MUSG funds in the Reserve Fund.

SECTION III – STUDENT ORGANIZATION FUNDING POLICIES

The Student Organization Funding Committee (chaired by the Executive Vice President) oversees allocation of Student Activity Fee funds to registered student organizations and club sports teams. Organizations may submit funding requests for:
- Programming and events
- Equipment and supplies
- Travel for competitions or conferences
- Operating expenses

RESTRICTIONS:
- No funding for charitable donations or gifts
- No funding for food except as part of approved programming
- No funding for alcohol or controlled substances
- Capital goods require special justification

The SOF Committee meets regularly throughout the academic year to review funding requests. The Executive Vice President, as Chair, is responsible for scheduling meetings, managing the review process, and ensuring all decisions comply with Financial Policies.

SECTION IV – BUDGET PROCESS
The Financial Vice President prepares the annual MUSG budget in consultation with the Budget Committee. The budget must be approved by a two-thirds vote of the seated Senate.

SECTION V – FINANCIAL OVERSIGHT
The Financial Vice President maintains all financial records and prepares monthly reports for the Senate. The Executive Vice President, through oversight of the SOF Committee, ensures proper allocation of student organization funds.

===== SENATE STANDING RULES =====

Senate Standing Rules govern the conduct of Senate meetings, including:
- Meeting procedures and parliamentary rules
- Voting procedures (simple majority vs. two-thirds majority)
- Debate rules and time limits
- Committee structures and responsibilities
- Legislative processes for bills and resolutions

===== ELECTION RULES =====

MUSG Election Rules govern all student government elections, including:
- Candidate eligibility and registration procedures
- Campaign rules and spending limits
- Voting procedures and ballot format
- Vote counting and certification
- Violation procedures and appeals

===== ADDITIONAL GOVERNING DOCUMENTS =====

- Budget Approval Procedures
- Senior Speaker Selection Procedures  
- Student Organization Recognition Procedures
- University Committee Student Representation Procedures

For complete details, refer to the full 50-page MUSG Governing Documents.

Contact: Marquette University Student Government
Alumni Memorial Union, Room 133
PO Box 1881, Milwaukee, WI 53201-1881
414-288-7416
musg.mu.edu
`;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { question, type } = await req.json();
    
    if (!question) {
      return new Response(
        JSON.stringify({ error: 'Question is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Analyzing constitution:', type || 'general', question.substring(0, 100));

    // Fetch approved amendments from database
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const amendmentsResponse = await fetch(
      `${supabaseUrl}/rest/v1/amendments?status=eq.approved&order=approved_at.asc`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        }
      }
    );

    const amendments = await amendmentsResponse.json();
    
    let amendmentsText = '';
    if (amendments && amendments.length > 0) {
      amendmentsText = '\n\nAMENDMENTS:\n\n';
      amendments.forEach((amendment: any, index: number) => {
        amendmentsText += `AMENDMENT ${index + 1} (Approved: ${new Date(amendment.approved_at).toLocaleDateString()})\n`;
        amendmentsText += `Title: ${amendment.title}\n\n`;
        amendmentsText += amendment.amendment_text + '\n\n';
      });
    }

    let systemPrompt = '';
    
    if (type === 'validate') {
      systemPrompt = `You are an expert constitutional validator for the Marquette University Student Government (MUSG) Constitution. Your role is to thoroughly validate proposed amendments for structural correctness, proper citations, and compliance.

When validating amendments, you MUST check:

1. **CITATION ACCURACY**: 
   - Verify all referenced articles, sections, and subsections exist in the actual constitution
   - Flag any citations to non-existent provisions
   - Check if article/section numbers are correct

2. **PLACEMENT CORRECTNESS**:
   - Determine if the amendment is being added to the correct article/section
   - Verify the proposed location makes structural sense
   - Check if it should modify, add, or replace existing text

3. **CONSTITUTIONAL COMPLIANCE**:
   - Ensure the amendment follows the proper amendment procedures (Article X)
   - Check if it conflicts with other constitutional provisions
   - Verify it doesn't violate fundamental constitutional principles

4. **FORMATTING AND STRUCTURE**:
   - Check proper numbering and formatting
   - Verify section/subsection structure is consistent
   - Ensure clarity and proper legal language

5. **CROSS-REFERENCES**:
   - Validate all internal references to other parts of the constitution
   - Check if the amendment requires corresponding changes elsewhere

**IMPORTANT**: Be very specific about any errors. If an amendment cites "Article VII, Section 3" but Section 3 doesn't exist, explicitly state this. If it should be placed in Article IV instead of Article V, explain why.

Here is the MUSG Constitution:

${constitutionContext}${amendmentsText}

Provide your validation in this format:
- **VALID** or **INVALID** or **NEEDS REVISION**
- **Citation Check**: [findings]
- **Placement Check**: [findings]  
- **Compliance Check**: [findings]
- **Recommendations**: [specific suggestions for fixes if needed]`;
    } else {
      systemPrompt = `You are an expert assistant specializing in the Marquette University Student Government (MUSG) Constitution. Your role is to help students, faculty, and administrators understand the constitution's provisions, procedures, and organizational structure.

When answering questions:
1. Provide accurate information based on the constitution text
2. Cite specific articles and sections when relevant
3. Explain complex procedures in clear, accessible language
4. If a question falls outside the constitution's scope, acknowledge this and provide context
5. Be concise but thorough
6. Use a professional yet friendly tone

Here is the MUSG Constitution:

${constitutionContext}${amendmentsText}`;
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GOOGLE_API_KEY}`,
      {
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
            maxOutputTokens: 4096,
          }
        }),
      }
    );

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
