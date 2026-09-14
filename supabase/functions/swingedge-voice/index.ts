// SwingEdge analysis narration: reads the Analyzer's computed signal aloud in a
// calm female voice. Splits longer scripts at sentence boundaries, synthesizes
// each chunk, and returns base64 MP3 clips in playback order. Never narrates
// numbers it was not given — the client sends the finished script.
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const MAX_CHARS = 3600;
const CHUNK_CHARS = 550;
const MAX_CHUNKS = 8;

function chunkText(text: string): string[] {
  const trimmed = text.trim().slice(0, MAX_CHARS);
  const sentences = trimmed.match(/[^.!?]+[.!?]*\s*/g) ?? [trimmed];
  const chunks: string[] = [];
  let current = '';
  for (const sentence of sentences) {
    if (current && (current + sentence).length > CHUNK_CHARS) {
      chunks.push(current.trim());
      current = '';
      if (chunks.length >= MAX_CHUNKS) return chunks;
    }
    current += sentence;
  }
  if (current.trim() && chunks.length < MAX_CHUNKS) chunks.push(current.trim());
  return chunks;
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  const CHUNK = 8192;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

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

    const chunks = chunkText(text);
    const clips: string[] = [];

    for (const chunk of chunks) {
      const res = await fetch('https://ai.gateway.lovable.dev/v1/audio/speech', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'openai/gpt-4o-mini-tts',
          input: chunk,
          voice: 'nova',
          response_format: 'mp3',
          speed: 1.0,
          instructions:
            'You are a calm, clear female financial narrator reading a stock chart analysis to an experienced trader. ' +
            'Measured, confident pacing — like a thoughtful market commentator, not a newsreader and not a salesperson. ' +
            'Neutral and factual: never excited about gains, never alarmed about risk. Pronounce ticker symbols letter ' +
            'by letter. Brief natural pauses between sections.',
        }),
      });

      if (!res.ok) {
        const details = await res.text().catch(() => '');
        console.error(`swingedge-voice TTS failed [${res.status}]: ${details}`);
        return new Response(JSON.stringify({ error: 'Voice generation failed', status: res.status, details }), {
          status: res.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      clips.push(toBase64(new Uint8Array(await res.arrayBuffer())));
    }

    return new Response(JSON.stringify({ clips }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('swingedge-voice error', err);
    return new Response(JSON.stringify({ error: (err as Error).message ?? 'Unexpected error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
