const STORAGE_KEY = "nemesis.voiceEnabled";

export function isSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

let enabled = isSupported() && localStorage.getItem(STORAGE_KEY) !== "0";

export function isVoiceEnabled(): boolean {
  return enabled && isSupported();
}

type ToggleListener = (enabled: boolean) => void;
const toggleListeners = new Set<ToggleListener>();

export function setVoiceEnabled(next: boolean): void {
  enabled = next;
  localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
  if (!next) window.speechSynthesis?.cancel();
  toggleListeners.forEach((l) => l(enabled));
}

export function onVoiceEnabledChange(cb: ToggleListener): () => void {
  toggleListeners.add(cb);
  return () => toggleListeners.delete(cb);
}

type SpeakingListener = (speaking: boolean) => void;
const speakingListeners = new Set<SpeakingListener>();

export function onSpeakingChange(cb: SpeakingListener): () => void {
  speakingListeners.add(cb);
  return () => speakingListeners.delete(cb);
}

// A calm, low-pitched voice reads closest to the JARVIS archetype — prefer a
// UK/male-leaning system voice where one exists, otherwise fall back cleanly.
const PREFERRED_VOICE_NAMES = ["Daniel", "Google UK English Male", "Microsoft Ryan", "Alex", "Arthur"];

let cachedVoice: SpeechSynthesisVoice | null = null;

function pickVoice(): SpeechSynthesisVoice | null {
  if (!isSupported()) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  for (const name of PREFERRED_VOICE_NAMES) {
    const match = voices.find((v) => v.name.includes(name));
    if (match) return match;
  }
  return voices.find((v) => v.lang.startsWith("en")) ?? voices[0];
}

if (isSupported()) {
  cachedVoice = pickVoice();
  window.speechSynthesis.addEventListener("voiceschanged", () => {
    cachedVoice = pickVoice();
  });
}

export function speak(text: string): void {
  if (!isVoiceEnabled()) return;
  const synth = window.speechSynthesis;
  synth.cancel(); // interrupt whatever it was saying — one line at a time
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.voice = cachedVoice ?? pickVoice();
  utterance.rate = 1.03;
  utterance.pitch = 0.82;
  utterance.onstart = () => speakingListeners.forEach((l) => l(true));
  utterance.onend = () => speakingListeners.forEach((l) => l(false));
  utterance.onerror = () => speakingListeners.forEach((l) => l(false));
  synth.speak(utterance);
}
