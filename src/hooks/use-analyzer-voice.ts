// Analyzer narration hook: plays the female-voice clips returned by the
// swingedge-voice edge function in order, with a browser speech-synthesis
// fallback (female voice preferred) when the voice service is unavailable.
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

function pickFemaleVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis?.getVoices() ?? [];
  const english = voices.filter((v) => v.lang.startsWith('en'));
  return (
    english.find((v) => /female|samantha|zira|victoria|karen|moira|tessa|fiona|allison|ava|susan/i.test(v.name)) ??
    english.find((v) => /google us english/i.test(v.name)) ??
    english[0]
  );
}

export function useAnalyzerVoice() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const cancelledRef = useRef(false);
  const fallbackRef = useRef(false);
  const [speaking, setSpeaking] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    return () => {
      cancelledRef.current = true;
      audioRef.current?.pause();
      try {
        window.speechSynthesis?.cancel();
      } catch { /* noop */ }
    };
  }, []);

  const browserSpeak = useCallback((text: string) => {
    try {
      const synth = window.speechSynthesis;
      if (!synth) return;
      synth.cancel();
      const u = new SpeechSynthesisUtterance(text);
      const voice = pickFemaleVoice();
      if (voice) u.voice = voice;
      u.rate = 0.98;
      u.pitch = 1.1;
      u.onend = () => setSpeaking(false);
      setSpeaking(true);
      synth.speak(u);
    } catch {
      setSpeaking(false);
    }
  }, []);

  const speak = useCallback(
    async (text: string) => {
      if (!text) return;
      if (fallbackRef.current) {
        browserSpeak(text);
        return;
      }
      cancelledRef.current = false;
      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke('swingedge-voice', { body: { text } });
        if (error) throw error;
        const clips = (data as { clips?: string[] })?.clips ?? [];
        if (clips.length === 0) throw new Error('No audio returned');

        setLoading(false);
        setSpeaking(true);
        for (const clip of clips) {
          if (cancelledRef.current) break;
          const audio = new Audio(`data:audio/mpeg;base64,${clip}`);
          audioRef.current = audio;
          await new Promise<void>((resolve) => {
            audio.onended = () => resolve();
            audio.onerror = () => resolve();
            audio.play().catch(() => resolve());
          });
        }
        setSpeaking(false);
      } catch (e) {
        console.warn('Analyzer narration fell back to browser speech', e);
        setLoading(false);
        fallbackRef.current = true;
        browserSpeak(text);
      }
    },
    [browserSpeak],
  );

  const stop = useCallback(() => {
    cancelledRef.current = true;
    audioRef.current?.pause();
    try {
      window.speechSynthesis?.cancel();
    } catch { /* noop */ }
    setSpeaking(false);
    setLoading(false);
  }, []);

  return { speak, stop, speaking, loading };
}
