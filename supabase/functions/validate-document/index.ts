import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { encodeBase64 } from "https://deno.land/std@0.224.0/encoding/base64.ts";

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

    // Layer 1: Validate file extension
    const fileExt = material.file_path.split('.').pop()?.toLowerCase();
    const allowedExtensions = ['pdf', 'png', 'jpg', 'jpeg', 'webp', 'gif'];
    
    if (!fileExt || !allowedExtensions.includes(fileExt)) {
      console.error('Unsupported file extension:', fileExt);
      await supabaseClient
        .from('validation_materials')
        .update({ 
          ai_validation_status: 'error',
          ai_validation_result: `Unsupported file type: .${fileExt}. Please upload PDF or image files (PNG, JPG, JPEG, WEBP, GIF).`
        })
        .eq('id', materialId);
      
      return new Response(
        JSON.stringify({ error: 'Unsupported file type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Layer 2: Map extension to MIME type
    const mediaTypes: Record<string, string> = {
      'pdf': 'application/pdf',
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'webp': 'image/webp',
      'gif': 'image/gif'
    };
    
    const expectedMediaType = mediaTypes[fileExt];

    const isPdf = expectedMediaType === 'application/pdf';

    // Convert to base64 using Deno's standard library
    const buffer = await fileData.arrayBuffer();
    const uint8Array = new Uint8Array(buffer);
    
    console.log('Step 8: File size:', uint8Array.length, 'bytes');
    
    // Layer 3: Validate file type by checking magic bytes
    const magicBytesCheck = (bytes: Uint8Array): { valid: boolean; actualType?: string } => {
      // PDF: starts with %PDF (37, 80, 68, 70)
      if (bytes[0] === 37 && bytes[1] === 80 && bytes[2] === 68 && bytes[3] === 70) {
        return { valid: expectedMediaType === 'application/pdf', actualType: 'PDF' };
      }
      
      // PNG: starts with 0x89, 0x50, 0x4E, 0x47
      if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
        return { valid: expectedMediaType === 'image/png', actualType: 'PNG' };
      }
      
      // JPEG: starts with 0xFF, 0xD8, 0xFF
      if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
        return { valid: expectedMediaType === 'image/jpeg', actualType: 'JPEG' };
      }
      
      // WEBP: starts with RIFF at 0-3, WEBP at 8-11
      if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
          bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) {
        return { valid: expectedMediaType === 'image/webp', actualType: 'WEBP' };
      }
      
      // GIF: starts with GIF87a or GIF89a
      if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) {
        return { valid: expectedMediaType === 'image/gif', actualType: 'GIF' };
      }
      
      // HTML detection
      const preview = String.fromCharCode(...Array.from(bytes.slice(0, 20)));
      if (preview.startsWith('<!')) {
        return { valid: false, actualType: 'HTML document' };
      }
      
      return { valid: false, actualType: 'unknown or corrupted file' };
    };
    
    const magicBytesValidation = magicBytesCheck(uint8Array);
    
    if (!magicBytesValidation.valid) {
      const errorMsg = magicBytesValidation.actualType 
        ? `Invalid file: Expected ${fileExt.toUpperCase()} but file is actually a ${magicBytesValidation.actualType}. Please ensure you upload the correct file format. If you saved an HTML page, convert it to PDF first.`
        : `Invalid or corrupted ${fileExt.toUpperCase()} file. Please upload a valid PDF or image file.`;
      
      console.error('Magic bytes validation failed:', magicBytesValidation);
      
      await supabaseClient
        .from('validation_materials')
        .update({ 
          ai_validation_status: 'error',
          ai_validation_result: errorMsg
        })
        .eq('id', materialId);
      
      return new Response(
        JSON.stringify({ error: 'Invalid file format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const base64 = encodeBase64(uint8Array);
    
    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
    if (!ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY not set');
    }

    // Determine content type for Anthropic API
    const contentType = isPdf ? 'document' : 'image';
    
    console.log('Step 9: File validated - Type:', contentType, 'MediaType:', expectedMediaType);

    // Call Anthropic
    const prompt = `You are validating if a document contains evidence of task/question 1 with multiple choice options.

IMPORTANT: You are ONLY checking if the document shows task/question 1 with options (a, b, etc.).

Task: ${task?.title || 'Unknown'}
Description: ${task?.description || 'None'}
Student completed: ${completedCount} tasks
TA Request: ${request?.request_message}
Student Notes: ${material.notes || 'None'}

Check ONLY (case-insensitive):
1. Does the document contain any identifier for task/question/item 1 (e.g., "Task 1", "Question 1", "1a", "1.", etc.)?
2. Does it show multiple choice options like:
   - "a." or "a)" followed by content
   - "b." or "b)" followed by content
   - Can be on separate lines or same line
   - Can be "A.", "A)", "a.", "a)" - case doesn't matter
3. This can be handwritten or typed text
4. It could appear anywhere in the document

You are NOT checking:
- Specific wording like "question 1 option a"
- Whether it's answered correctly
- If there's any work shown
- Quality of answers
- Code, screenshots, or artifacts

Respond JSON:
{
  "approved": true/false,
  "reasoning": "explanation"
}

Approve if you can identify task/question 1 with options (a, b, etc.) anywhere in the document (handwritten or typed).
Reject if you cannot find this pattern.`;

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
              type: contentType,
              source: {
                type: 'base64',
                media_type: expectedMediaType,
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
      console.error('Anthropic API error:', anthropicResp.status, errText);
      await supabaseClient
        .from('validation_materials')
        .update({ 
          ai_validation_status: 'error',
          ai_validation_result: `AI validation failed: ${errText.substring(0, 200)}`
        })
        .eq('id', materialId);
      
      return new Response(
        JSON.stringify({ error: 'AI validation failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiResult = await anthropicResp.json();
    console.log('Full AI result:', JSON.stringify(aiResult));
    const aiMessage = aiResult.content?.[0]?.text || '';
    
    console.log('AI Response:', aiMessage);
    
    let validation;
    try {
      validation = JSON.parse(aiMessage);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('AI message was:', aiMessage);
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
