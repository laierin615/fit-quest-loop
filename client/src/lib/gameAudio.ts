/*
 * Style reminder: 音效是原野獵徑的短促觸覺回饋，不是持續背景音樂。音色以篝火橘的明亮木質感、黃銅金的上升音階與莓果紅的低沉擊倒感，對應完成、成就與戰鬥結果。
 */

type Tone = { frequency: number; duration: number; delay?: number; type?: OscillatorType; volume?: number };

let audioContext: AudioContext | null = null;

function getContext() {
  if (typeof window === "undefined") return null;
  const Context = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Context) return null;
  audioContext ??= new Context();
  if (audioContext.state === "suspended") void audioContext.resume();
  return audioContext;
}

function playTones(tones: Tone[]) {
  const context = getContext();
  if (!context) return;
  const now = context.currentTime;
  tones.forEach(({ frequency, duration, delay = 0, type = "sine", volume = 0.045 }) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const start = now + delay;
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  });
}

export function playCycleSound() {
  playTones([
    { frequency: 392, duration: 0.11, type: "triangle", volume: 0.035 },
    { frequency: 523.25, duration: 0.16, delay: 0.07, type: "triangle", volume: 0.05 },
  ]);
}

export function playAchievementSound() {
  playTones([
    { frequency: 392, duration: 0.13, type: "triangle", volume: 0.04 },
    { frequency: 523.25, duration: 0.13, delay: 0.08, type: "triangle", volume: 0.05 },
    { frequency: 659.25, duration: 0.22, delay: 0.16, type: "triangle", volume: 0.06 },
    { frequency: 783.99, duration: 0.3, delay: 0.28, type: "sine", volume: 0.045 },
  ]);
}

export function playDefeatSound() {
  playTones([
    { frequency: 220, duration: 0.18, type: "sawtooth", volume: 0.04 },
    { frequency: 146.83, duration: 0.25, delay: 0.11, type: "triangle", volume: 0.055 },
    { frequency: 98, duration: 0.34, delay: 0.22, type: "sine", volume: 0.045 },
  ]);
}
