import { useEffect, useRef, useState } from "react";
import { ApiError, streamJobOutput, type JobMeta } from "../api.js";

export function useJob() {
  const [output, setOutput] = useState("");
  const [status, setStatus] = useState<string | undefined>();
  const stopRef = useRef<(() => void) | null>(null);

  useEffect(() => () => stopRef.current?.(), []);

  async function run(launch: () => Promise<{ job: JobMeta }>) {
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
