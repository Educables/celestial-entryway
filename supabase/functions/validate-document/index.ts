import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { materialId } = await req.json();

    if (!materialId) {
      return new Response(
        JSON.stringify({ error: 'Material ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the validation material details
    const { data: material, error: materialError } = await supabaseClient
      .from('validation_materials')
      .select(`
        *,
        validation_request:validation_requests(
          request_message,
          task_submission:task_submissions(
            task:tasks(title, description)
          )
        )
      `)
      .eq('id', materialId)
      .single();

    if (materialError || !material) {
      console.error('Error fetching material:', materialError);
      return new Response(
        JSON.stringify({ error: 'Material not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update status to validating
    await supabaseClient
      .from('validation_materials')
      .update({ ai_validation_status: 'validating' })
      .eq('id', materialId);

    // Download the file from storage
    const { data: fileData, error: downloadError } = await supabaseClient
      .storage
      .from('validation-materials')
      .download(material.file_path);

    if (downloadError || !fileData) {
      console.error('Error downloading file:', downloadError);
      await supabaseClient
        .from('validation_materials')
        .update({ 
          ai_validation_status: 'error',
          ai_validation_result: 'Failed to download file for validation'
        })
        .eq('id', materialId);
      
      return new Response(
        JSON.stringify({ error: 'Failed to download file' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Convert file to base64
    const arrayBuffer = await fileData.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    
    // Determine media type
    const fileExt = material.file_path.split('.').pop()?.toLowerCase();
    const mediaTypeMap: Record<string, string> = {
      'pdf': 'application/pdf',
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'webp': 'image/webp',
      'gif': 'image/gif'
    };
    const mediaType = mediaTypeMap[fileExt || ''] || 'application/pdf';

    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
    if (!ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY not configured');
    }

    // Prepare validation prompt
    const taskInfo = material.validation_request?.task_submission?.task;
    const validationPrompt = `You are reviewing a student's submission for validation.

Task: ${taskInfo?.title || 'Unknown task'}
Task Description: ${taskInfo?.description || 'No description'}

TA's Request: ${material.validation_request?.request_message}

Student's Notes: ${material.notes || 'No notes provided'}

Please analyze the submitted document and determine if it adequately demonstrates the work claimed by the student. 

Respond with a JSON object in this exact format:
{
  "approved": true/false,
  "reasoning": "Your detailed explanation here"
}

Be thorough but fair in your assessment.`;

    // Call Anthropic API
    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'document',
                source: {
                  type: 'base64',
                  media_type: mediaType,
                  data: base64
                }
              },
              {
                type: 'text',
                text: validationPrompt
              }
            ]
          }
        ]
      })
    });

    if (!anthropicResponse.ok) {
      const errorText = await anthropicResponse.text();
      console.error('Anthropic API error:', errorText);
      
      await supabaseClient
        .from('validation_materials')
        .update({ 
          ai_validation_status: 'error',
          ai_validation_result: 'AI validation service error'
        })
        .eq('id', materialId);
      
      return new Response(
        JSON.stringify({ error: 'AI validation failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiResult = await anthropicResponse.json();
    const aiMessage = aiResult.content?.[0]?.text || '';
    
    // Parse the AI response
    let validationResult;
    try {
      validationResult = JSON.parse(aiMessage);
    } catch {
      // If JSON parsing fails, treat as error
      validationResult = {
        approved: false,
        reasoning: aiMessage || 'Unable to parse validation result'
      };
    }

    const status = validationResult.approved ? 'approved' : 'rejected';

    // Update the validation material with AI results
    await supabaseClient
      .from('validation_materials')
      .update({
        ai_validation_status: status,
        ai_validation_result: validationResult.reasoning,
        ai_validated_at: new Date().toISOString()
      })
      .eq('id', materialId);

    console.log(`Document validated successfully: ${status}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        status,
        result: validationResult.reasoning
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in validate-document function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
