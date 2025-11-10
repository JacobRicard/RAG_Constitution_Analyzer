import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch approved amendments
    const { data: amendments, error } = await supabase
      .from('amendments')
      .select('*')
      .eq('status', 'approved')
      .order('approved_at', { ascending: true });

    if (error) throw error;

    // Generate HTML content for PDF
    let htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            font-family: 'Times New Roman', serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 40px auto;
            padding: 20px;
          }
          h1 {
            text-align: center;
            color: #003366;
            margin-bottom: 30px;
          }
          h2 {
            color: #003366;
            border-bottom: 2px solid #003366;
            padding-bottom: 10px;
            margin-top: 40px;
          }
          .amendment {
            margin: 30px 0;
            padding: 20px;
            border: 1px solid #ddd;
            border-radius: 5px;
            page-break-inside: avoid;
          }
          .amendment-header {
            font-weight: bold;
            color: #003366;
            margin-bottom: 10px;
          }
          .amendment-date {
            font-size: 0.9em;
            color: #666;
            font-style: italic;
          }
          .amendment-title {
            font-size: 1.2em;
            font-weight: bold;
            margin: 15px 0 10px 0;
          }
          .amendment-text {
            white-space: pre-wrap;
            line-height: 1.8;
          }
        </style>
      </head>
      <body>
        <h1>MARQUETTE UNIVERSITY STUDENT GOVERNMENT</h1>
        <h1>CONSTITUTION 2025-2026</h1>
        <p style="text-align: center; margin-bottom: 40px;">
          <em>For the full constitution text, please refer to the original PDF document.</em>
        </p>
    `;

    if (amendments && amendments.length > 0) {
      htmlContent += '<h2>APPROVED AMENDMENTS</h2>';
      
      amendments.forEach((amendment, index) => {
        const approvedDate = new Date(amendment.approved_at).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
        
        htmlContent += `
          <div class="amendment">
            <div class="amendment-header">Amendment ${index + 1}</div>
            <div class="amendment-date">Approved: ${approvedDate}</div>
            <div class="amendment-title">${amendment.title}</div>
            <div class="amendment-text">${amendment.amendment_text}</div>
          </div>
        `;
      });
    }

    htmlContent += `
      </body>
      </html>
    `;

    return new Response(htmlContent, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/html',
      },
    });
  } catch (error) {
    console.error('Error generating constitution document:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to generate document' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});