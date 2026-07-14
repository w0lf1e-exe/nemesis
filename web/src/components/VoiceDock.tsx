import { useEffect, useRef, useState } from "react";
import { api } from "../api.js";
import { emitCommand } from "../voice/commandBus.js";
import { parseCommand } from "../voice/parseCommand.js";
import {
  isSupported as ttsSupported,
  isVoiceEnabled,
  onSpeakingChange,
  onVoiceEnabledChange,
  setVoiceEnabled,
  speak,
} from "../voice/speech.js";

type ListenState = "idle" | "listening" | "processing";

function getRecognitionCtor(): (new () => any) | undefined {
  return (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
}

export function VoiceDock() {
  const [listenState, setListenState] = useState<ListenState>("idle");
  const [transcript, setTranscript] = useState("");
  const [speaking, setSpeaking] = useState(false);
  const [voiceOn, setVoiceOn] = useState(isVoiceEnabled());
  const recognitionRef = useRef<any>(null);
  const sttSupported = !!getRecognitionCtor();

  useEffect(() => onSpeakingChange(setSpeaking), []);
  useEffect(() => onVoiceEnabledChange(setVoiceOn), []);

  function toggleVoice() {
    const next = !voiceOn;
    setVoiceEnabled(next);
    if (next) speak("Voice output online.");
  }

  async function handleTranscript(text: string) {
    setTranscript(text);
    setListenState("processing");
    const parsed = parseCommand(text);
    switch (parsed.kind) {
      case "nmap":
        emitCommand("recon.nmap", { target: parsed.target!, profile: parsed.profile ?? "quick" });
        break;
      case "whois":
        emitCommand("recon.whois", { target: parsed.target! });
        break;
      case "dig":
        emitCommand("recon.dig", { target: parsed.target!, recordType: parsed.recordType ?? "A" });
        break;
      case "subdomains":
        emitCommand("recon.subdomains", { target: parsed.target! });
        break;
      case "git":
        emitCommand("dev.git", { subcommand: parsed.subcommand! });
        break;
      case "setTarget":
        emitCommand("recon.setTarget", { target: parsed.target! });
        speak(`Target set to ${parsed.target}.`);
        break;
      case "systemStatus":
        try {
          const s = (await api.systemStatus()) as Record<string, unknown>;
          const hours = Math.round((s.hostUptimeSeconds as number) / 3600);
          speak(`Systems nominal. Host ${s.hostname}, ${s.cpuCount} cores, up ${hours} hours.`);
        } catch {
          speak("Unable to reach system telemetry.");
        }
        break;
      default:
        speak("I didn't catch a command in that.");
    }
    setListenState("idle");
  }

  function toggleListen() {
    const Recognition = getRecognitionCtor();
    if (!Recognition) return;
    if (listenState === "listening") {
      recognitionRef.current?.stop();
      return;
    }
    const recognition = new Recognition();
    recognitionRef.current = recognition;
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => setListenState("listening");
    recognition.onresult = (e: any) => handleTranscript(e.results[0][0].transcript);
    recognition.onerror = () => setListenState("idle");
    recognition.onend = () => setListenState((s) => (s === "listening" ? "idle" : s));
    recognition.start();
  }

  return (
    <div className="voice-dock">
      <button
        className={`mic-btn ${listenState}`}
        onClick={toggleListen}
        disabled={!sttSupported}
        title={sttSupported ? "Push to talk" : "Speech recognition isn't supported in this browser"}
      >
        {listenState === "listening" ? "● listening" : listenState === "processing" ? "… thinking" : "🎙 talk to NEMESIS"}
      </button>
      <button
        className={`voice-toggle ${voiceOn ? "on" : ""}`}
        onClick={toggleVoice}
        disabled={!ttsSupported()}
        title={ttsSupported() ? "Toggle spoken responses" : "Speech synthesis isn't supported in this browser"}
      >
        {voiceOn ? "🔊 voice on" : "🔈 voice off"}
      </button>
      <div className="voice-transcript">
        {speaking ? (
          <span className="speaking">NEMESIS speaking…</span>
        ) : transcript ? (
          <span>heard: "{transcript}"</span>
        ) : (
          <span className="idle-hint">
            voice interface ready — try "quick scan example.com" or "git status"
          </span>
        )}
      </div>
    </div>
  );
}
