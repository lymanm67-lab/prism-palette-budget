// Coach Arty voice hook: edge-function TTS with cached phrases and a browser
// speech-synthesis fallback when the voice service is unavailable.
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useCoachVoice(enabled: boolean) {
  const cache = useRef(new Map<string, string>());
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const fallbackRef = useRef(false);

  useEffect(() => {
    return () => {
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
      u.rate = 1.08;
      u.pitch = 1.15;

      u.onend = () => setSpeaking(false);
      setSpeaking(true);
      synth.speak(u);
    } catch {
      setSpeaking(false);
    }
  }, []);

  const speak = useCallback(
    async (text: string) => {
      if (!enabled || !text) return;
      if (fallbackRef.current) {
        browserSpeak(text);
        return;
      }
      try {
        let b64 = cache.current.get(text);
        if (!b64) {
          const { data, error } = await supabase.functions.invoke('coach-voice', { body: { text } });
          if (error) throw error;
          b64 = (data as { audioContent?: string })?.audioContent;
          if (!b64) throw new Error('No audio returned');
          if (cache.current.size < 60) cache.current.set(text, b64);
        }
        audioRef.current?.pause();
        const audio = new Audio(`data:audio/mpeg;base64,${b64}`);
        audioRef.current = audio;
        setSpeaking(true);
        audio.onended = () => setSpeaking(false);
        audio.onerror = () => setSpeaking(false);
        await audio.play();
      } catch (e) {
        console.warn('Coach Arty voice fell back to browser speech', e);
        fallbackRef.current = true;
        browserSpeak(text);
      }
    },
    [enabled, browserSpeak],
  );

  const stop = useCallback(() => {
    audioRef.current?.pause();
    try {
      window.speechSynthesis?.cancel();
    } catch { /* noop */ }
    setSpeaking(false);
  }, []);

  return { speak, stop, speaking };
}
