import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { materialId } = await req.json();
    console.log('Validating material:', materialId);

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

    // Get material
    const { data: material, error: matErr } = await supabaseClient
      .from('validation_materials')
      .select('*')
      .eq('id', materialId)
      .single();

    if (matErr || !material) {
      console.error('Material not found:', matErr);
      return new Response(
        JSON.stringify({ error: 'Material not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update to validating
    await supabaseClient
      .from('validation_materials')
      .update({ ai_validation_status: 'validating' })
      .eq('id', materialId);

    console.log('Step 1: Status updated');

    // Get validation request
    const { data: request } = await supabaseClient
      .from('validation_requests')
      .select('request_message, task_submission_id')
      .eq('id', material.validation_request_id)
      .single();

    console.log('Step 2: Got request');

    // Get task submission
    const { data: submission } = await supabaseClient
      .from('task_submissions')
      .select('answers, task_id')
      .eq('id', request?.task_submission_id)
      .single();

    console.log('Step 3: Got submission');

    // Get task
    const { data: task } = await supabaseClient
      .from('tasks')
      .select('title, description')
      .eq('id', submission?.task_id)
      .single();

    console.log('Step 4: Got task');

    // Calculate completed tasks
    const answers = submission?.answers || [];
    const completedCount = Array.isArray(answers) 
      ? answers.filter((a: any) => a.options?.length > 0).length 
      : 0;

    console.log('Step 5: Calculated count:', completedCount);

    // Download file
    console.log('Step 6: Starting file download');
    const { data: fileData, error: dlErr } = await supabaseClient
      .storage
      .from('validation-materials')
      .download(material.file_path);

    console.log('Step 7: File downloaded');

    if (dlErr || !fileData) {
      console.error('Download error:', dlErr);
      await supabaseClient
        .from('validation_materials')
        .update({ 
          ai_validation_status: 'error',
          ai_validation_result: 'Failed to download file'
        })
        .eq('id', materialId);
      
      return new Response(
        JSON.stringify({ error: 'File download failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Convert to base64
    const buffer = await fileData.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
    
    const fileExt = material.file_path.split('.').pop()?.toLowerCase();
    const mediaTypes: Record<string, string> = {
      'pdf': 'application/pdf',
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg'
    };
    const mediaType = mediaTypes[fileExt || ''] || 'application/pdf';

    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
    if (!ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY not set');
    }

    // Call Anthropic
    const prompt = `You are validating if a student actually completed work they claimed.

IMPORTANT: You are NOT checking correctness, only if they actually did the work.

Task: ${task?.title || 'Unknown'}
Description: ${task?.description || 'None'}
Student completed: ${completedCount} tasks
TA Request: ${request?.request_message}
Student Notes: ${material.notes || 'None'}

Check if:
1. Document shows evidence of claimed work
2. Number of items matches submission (${completedCount})
3. Has proof (code, screenshots, artifacts)

NOT checking: correctness, quality, right answers

Respond JSON:
{
  "approved": true/false,
  "reasoning": "explanation"
}`;

    const anthropicResp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 1024,
        messages: [{
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
              text: prompt
            }
          ]
        }]
      })
    });

    if (!anthropicResp.ok) {
      const errText = await anthropicResp.text();
      console.error('Anthropic error:', errText);
      await supabaseClient
        .from('validation_materials')
        .update({ 
          ai_validation_status: 'error',
          ai_validation_result: 'AI validation failed'
        })
        .eq('id', materialId);
      
      return new Response(
        JSON.stringify({ error: 'AI validation failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiResult = await anthropicResp.json();
    const aiMessage = aiResult.content?.[0]?.text || '';
    
    let validation;
    try {
      validation = JSON.parse(aiMessage);
    } catch {
      validation = { approved: false, reasoning: aiMessage || 'Could not parse result' };
    }

    const status = validation.approved ? 'approved' : 'rejected';

    await supabaseClient
      .from('validation_materials')
      .update({
        ai_validation_status: status,
        ai_validation_result: validation.reasoning,
        ai_validated_at: new Date().toISOString()
      })
      .eq('id', materialId);

    console.log('Validation complete:', status);

    return new Response(
      JSON.stringify({ success: true, status, result: validation.reasoning }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Function error:', error?.message);
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
