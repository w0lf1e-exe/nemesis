// Drop-in hook that runs a NEMESIS job and streams its output live.
// Copy into your Lovable project as e.g. src/hooks/useNemesisJob.ts.

import { useCallback, useRef, useState } from "react";
import { streamNemesisJob, type JobMeta } from "../lib/nemesisApi";

export interface UseNemesisJobState {
  output: string;
  status: JobMeta["status"] | "idle";
  exitCode: number | null;
  running: boolean;
}

export function useNemesisJob() {
  const [state, setState] = useState<UseNemesisJobState>({
    output: "",
    status: "idle",
    exitCode: null,
    running: false,
  });
  const stopRef = useRef<() => void>();

  // Call with a JobMeta returned from any nemesisApi.* / runKaliTool call.
  const attach = useCallback((job: JobMeta) => {
    stopRef.current?.();
    setState({ output: "", status: "running", exitCode: null, running: true });
    stopRef.current = streamNemesisJob(
      job.id,
      (chunk) => setState((s) => ({ ...s, output: s.output + chunk })),
      (status, exitCode) => setState((s) => ({ ...s, status: status as JobMeta["status"], exitCode, running: false })),
    );
  }, []);

  const stop = useCallback(() => {
    stopRef.current?.();
    setState((s) => ({ ...s, running: false }));
  }, []);

  return { ...state, attach, stop };
}
