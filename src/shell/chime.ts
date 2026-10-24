const NOTES = [
  { frequency: 880, at: 0 },
  { frequency: 1320, at: 0.18 },
] as const;

const PEAK = 0.2;

const NOTE_SECONDS = 0.4;

let audio: AudioContext | undefined;

export function armChime(): () => void {
  const create = () => {
    if ("AudioContext" in window) audio ??= new AudioContext();
  };

  document.addEventListener("pointerdown", create, { capture: true, once: true });

  return () => document.removeEventListener("pointerdown", create, { capture: true });
}

export function playChime() {
  if (audio === undefined) return;

  for (const { frequency, at } of NOTES) playNote(audio, frequency, audio.currentTime + at);
}

function playNote(context: AudioContext, frequency: number, start: number) {
  const oscillator = context.createOscillator();

  const gain = context.createGain();

  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(PEAK, start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + NOTE_SECONDS);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start(start);
  oscillator.stop(start + NOTE_SECONDS);
}
