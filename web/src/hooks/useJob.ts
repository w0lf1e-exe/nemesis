import { useEffect, useRef, useState } from "react";
import { ApiError, streamJobOutput, type JobMeta } from "../api.js";
import { speak } from "../voice/speech.js";

export function useJob() {
  const [output, setOutput] = useState("");
  const [status, setStatus] = useState<string | undefined>();
  const [label, setLabel] = useState("Job");
  const stopRef = useRef<(() => void) | null>(null);

  useEffect(() => () => stopRef.current?.(), []);

  useEffect(() => {
    if (!status || status === "running") return;
    const phrase =
      status === "done" ? `${label} complete.` : status === "error" ? `${label} failed.` : `${label} stopped.`;
    speak(phrase);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  async function run(launch: () => Promise<{ job: JobMeta }>, jobLabel = "Job") {
    setLabel(jobLabel);
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

  return { output, status, label, running: status === "running", run };
}
