// High-energy workout backing track, synthesized in the browser with Web Audio.
// No audio files, no network — a driving four-on-the-floor kick, snare, hats,
// bassline and a bright arpeggio, so it never clashes with Coach Arty's voice.
import { useCallback, useEffect, useRef, useState } from 'react';

export type MusicStyle = 'warmup' | 'push' | 'beast';

const BPM: Record<MusicStyle, number> = { warmup: 100, push: 124, beast: 140 };
// Minor pentatonic riffs (semitones from root) keep it motivating, not cheesy.
const RIFF: Record<MusicStyle, number[]> = {
  warmup: [0, 7, 10, 7, 0, 5, 7, 5],
  push: [0, 0, 7, 10, 12, 10, 7, 5],
  beast: [0, 12, 10, 12, 7, 10, 12, 15],
};
const ROOT = 55; // A1

const hz = (semis: number) => ROOT * Math.pow(2, semis / 12);

export function useWorkoutMusic() {
  const ctxRef = useRef<AudioContext | null>(null);
  const masterRef = useRef<GainNode | null>(null);
  const timerRef = useRef<number | null>(null);
  const stepRef = useRef(0);
  const nextTimeRef = useRef(0);
  const styleRef = useRef<MusicStyle>('push');
  const intensityRef = useRef(1);

  const [playing, setPlaying] = useState(false);
  const [style, setStyleState] = useState<MusicStyle>('push');
  const [volume, setVolumeState] = useState(0.35);

  const volumeRef = useRef(0.35);

  const applyGain = useCallback(() => {
    const ctx = ctxRef.current;
    const master = masterRef.current;
    if (!ctx || !master) return;
    master.gain.setTargetAtTime(volumeRef.current * intensityRef.current, ctx.currentTime, 0.25);
  }, []);

  const ensureCtx = useCallback(() => {
    if (!ctxRef.current) {
      const Ctor = window.AudioContext || (window as any).webkitAudioContext;
      if (!Ctor) return null;
      const ctx: AudioContext = new Ctor();
      const master = ctx.createGain();
      master.gain.value = 0;
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -14;
      comp.ratio.value = 4;
      master.connect(comp).connect(ctx.destination);
      ctxRef.current = ctx;
      masterRef.current = master;
    }
    return ctxRef.current;
  }, []);

  const kick = (ctx: AudioContext, out: GainNode, t: number) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    g.gain.setValueAtTime(0.9, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + 0.25);
  };

  const noise = (ctx: AudioContext, out: GainNode, t: number, dur: number, freq: number, gain: number) => {
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(hp).connect(g).connect(out);
    src.start(t);
    src.stop(t + dur);
  };

  const tone = (
    ctx: AudioContext,
    out: GainNode,
    t: number,
    frequency: number,
    dur: number,
    type: OscillatorType,
    gain: number,
  ) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = type === 'sawtooth' ? 2200 : 5000;
    o.type = type;
    o.frequency.value = frequency;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(lp).connect(g).connect(out);
    o.start(t);
    o.stop(t + dur + 0.02);
  };

  // Schedules one 16th-note step of the groove.
  const scheduleStep = useCallback((ctx: AudioContext, out: GainNode, step: number, t: number) => {
    const s = styleRef.current;
    const beat = step % 4;
    const bar16 = step % 16;

    if (beat === 0) kick(ctx, out, t); // four on the floor
    if (s !== 'warmup' && bar16 === 14) kick(ctx, out, t);
    if (bar16 === 4 || bar16 === 12) noise(ctx, out, t, 0.16, 1400, 0.35); // snare
    noise(ctx, out, t, 0.04, 7000, step % 2 === 0 ? 0.1 : 0.16); // hats

    const riff = RIFF[s];
    const note = riff[Math.floor(step / 2) % riff.length];
    if (step % 2 === 0) tone(ctx, out, t, hz(note), 0.22, 'sawtooth', 0.16); // bass
    if (s !== 'warmup' && step % 4 === 2) {
      tone(ctx, out, t, hz(note + 24), 0.14, 'square', 0.06); // bright arp
    }
    if (s === 'beast' && bar16 === 15) tone(ctx, out, t, hz(note + 12), 0.12, 'square', 0.08);
  }, []);

  const stopClock = () => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const start = useCallback(
    async (nextStyle?: MusicStyle) => {
      const ctx = ensureCtx();
      const master = masterRef.current;
      if (!ctx || !master) return;
      if (nextStyle) {
        styleRef.current = nextStyle;
        setStyleState(nextStyle);
      }
      if (ctx.state === 'suspended') await ctx.resume();
      stopClock();
      stepRef.current = 0;
      nextTimeRef.current = ctx.currentTime + 0.1;
      applyGain();
      setPlaying(true);
      timerRef.current = window.setInterval(() => {
        const step16 = 60 / BPM[styleRef.current] / 4;
        while (nextTimeRef.current < ctx.currentTime + 0.35) {
          scheduleStep(ctx, master, stepRef.current, nextTimeRef.current);
          stepRef.current += 1;
          nextTimeRef.current += step16;
        }
      }, 90);
    },
    [applyGain, ensureCtx, scheduleStep],
  );

  const stop = useCallback(() => {
    stopClock();
    const ctx = ctxRef.current;
    const master = masterRef.current;
    if (ctx && master) master.gain.setTargetAtTime(0, ctx.currentTime, 0.12);
    setPlaying(false);
  }, []);

  const setStyle = useCallback((s: MusicStyle) => {
    styleRef.current = s;
    setStyleState(s);
  }, []);

  const setVolume = useCallback(
    (v: number) => {
      volumeRef.current = v;
      setVolumeState(v);
      applyGain();
    },
    [applyGain],
  );

  /** Ducks the music under Coach Arty's voice (0.35 = quiet, 1 = full). */
  const duck = useCallback(
    (level: number) => {
      intensityRef.current = level;
      applyGain();
    },
    [applyGain],
  );

  useEffect(() => {
    return () => {
      stopClock();
      ctxRef.current?.close().catch(() => undefined);
      ctxRef.current = null;
      masterRef.current = null;
    };
  }, []);

  return { start, stop, playing, style, setStyle, volume, setVolume, duck };
}
