import { useEffect, useRef, useState } from "react";
import { ApiError, streamJobOutput, type JobMeta } from "../api.js";
import { speak } from "../voice/speech.js";

export function useJob() {
  const [output, setOutput] = useState("");
  const [status, setStatus] = useState<string | undefined>();
  const stopRef = useRef<(() => void) | null>(null);
  const labelRef = useRef("Job");

  useEffect(() => () => stopRef.current?.(), []);

  useEffect(() => {
    if (!status || status === "running") return;
    const label = labelRef.current;
    const phrase =
      status === "done" ? `${label} complete.` : status === "error" ? `${label} failed.` : `${label} stopped.`;
    speak(phrase);
  }, [status]);

  async function run(launch: () => Promise<{ job: JobMeta }>, label = "Job") {
    labelRef.current = label;
    stopRef.current?.();
    setOutput("");
    setStatus("running");
    try {
      const { job } = await launch();
      setStatus(job.status);
      stopRef.current = streamJobOutput(
        job.id,
        (chunk) => setOutput((prev) => prev + chunk),
        (finalStatus) => setStatus(finalStatus),
      );
    } catch (err) {
      setStatus("error");
      setOutput(err instanceof ApiError ? `[${err.status}] ${err.message}` : String(err));
    }
  }

  return { output, status, running: status === "running", run };
}
