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

    // Get submission details to know what tasks student claimed they completed
    const { data: submissionData } = await supabaseClient
      .from('task_submissions')
      .select('answers')
      .eq('id', material.validation_request?.task_submission_id)
      .single();

    const studentAnswers = submissionData?.answers || [];
    const completedTasksCount = Array.isArray(studentAnswers) 
      ? studentAnswers.filter((a: any) => a.options && a.options.length > 0).length 
      : 0;

    // Prepare validation prompt
    const taskInfo = material.validation_request?.task_submission?.task;
    const validationPrompt = `You are validating if a student actually completed the work they claimed to have done.

IMPORTANT: You are NOT checking if answers are correct. You are ONLY verifying that the student actually did the work they claimed.

Task: ${taskInfo?.title || 'Unknown task'}
Task Description: ${taskInfo?.description || 'No description'}

Student claimed to have completed: ${completedTasksCount} tasks/questions

TA's Request: ${material.validation_request?.request_message}

Student's Notes: ${material.notes || 'No notes provided'}

Your job is to check:
1. Does the uploaded document show evidence that the student actually did the work they claimed?
2. Does the number of completed items shown in the document match what they submitted (${completedTasksCount} tasks)?
3. Is there proof of effort and completion (code, screenshots, work artifacts)?

You are NOT judging:
- Whether the answers are correct
- The quality of the work
- Whether they got the right solution

Respond with a JSON object in this exact format:
{
  "approved": true/false,
  "reasoning": "Your detailed explanation here about whether they actually did the work"
}

Approve if the document shows they genuinely completed the work. Reject if the evidence doesn't match their claims.`;

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
