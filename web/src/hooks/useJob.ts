import { useEffect, useRef, useState } from "react";
import { ApiError, streamJobOutput, type JobMeta } from "../api.js";
import { speak } from "../voice/speech.js";

export function useJob() {
  const [output, setOutput] = useState("");
  const [status, setStatus] = useState<string | undefined>();
  const [label, setLabel] = useState("Job");
  const stopRef = useRef<(() => void) | null>(null);
  // Bumped on every run() call so a call that's superseded before its
  // launch() promise resolves can tell it's stale and back off instead of
  // clobbering stopRef / state with an orphaned job's stream.
  const tokenRef = useRef(0);

  useEffect(() => () => stopRef.current?.(), []);

  useEffect(() => {
    if (!status || status === "running") return;
    const phrase =
      status === "done" ? `${label} complete.` : status === "error" ? `${label} failed.` : `${label} stopped.`;
    speak(phrase);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  async function run(launch: () => Promise<{ job: JobMeta }>, jobLabel = "Job") {
    const token = ++tokenRef.current;
    setLabel(jobLabel);
    stopRef.current?.();
    stopRef.current = null;
    setOutput("");
    setStatus("running");
    try {
      const { job } = await launch();
      if (token !== tokenRef.current) return; // superseded by a newer run() while this one was in flight
      setStatus(job.status);
      stopRef.current = streamJobOutput(
        job.id,
        (chunk) => setOutput((prev) => prev + chunk),
        (finalStatus) => setStatus(finalStatus),
      );
    } catch (err) {
      if (token !== tokenRef.current) return;
      setStatus("error");
      setOutput(err instanceof ApiError ? `[${err.status}] ${err.message}` : String(err));
    }
  }

  return { output, status, label, running: status === "running", run };
}
