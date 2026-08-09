// Coach Arty voice: short spoken cues for the guided exercise timer.
// Returns base64 MP3 so the client can cache repeated phrases ("Rest", "Grab water").
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const MAX_CHARS = 400;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const key = Deno.env.get('LOVABLE_API_KEY');
    if (!key) {
      return new Response(JSON.stringify({ error: 'Missing LOVABLE_API_KEY' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const text = typeof body?.text === 'string' ? body.text.trim() : '';
    if (!text) {
      return new Response(JSON.stringify({ error: 'text is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const res = await fetch('https://ai.gateway.lovable.dev/v1/audio/speech', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini-tts',
        input: text.slice(0, MAX_CHARS),
        voice: 'ash',
        response_format: 'mp3',
        speed: 1.05,
        instructions:
          'You are Coach Arty, a high-energy, uplifting personal trainer hyping up a 59-year-old man mid-workout. ' +
          'Sound genuinely excited and proud of him — like a coach courtside. Bright, warm, upbeat tone with real ' +
          'dynamic range: lift your pitch on encouragement, punch key words ("let\'s GO", "strong", "you got this"), ' +
          'and vary your rhythm so nothing sounds flat or robotic. Smile while you speak. Crisp, confident, ' +
          'conversational pacing — never monotone, never droning, never reading a list.',
      }),

    });

    if (!res.ok) {
      const details = await res.text().catch(() => '');
      console.error(`coach-voice TTS failed [${res.status}]: ${details}`);
      return new Response(JSON.stringify({ error: 'Voice generation failed', status: res.status, details }), {
        status: res.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const bytes = new Uint8Array(await res.arrayBuffer());
    let binary = '';
    const CHUNK = 8192;
    for (let i = 0; i < bytes.length; i += CHUNK) {
      binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
    }

    return new Response(JSON.stringify({ audioContent: btoa(binary) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('coach-voice error', err);
    return new Response(JSON.stringify({ error: (err as Error).message ?? 'Unexpected error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
