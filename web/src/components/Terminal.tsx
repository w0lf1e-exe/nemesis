import { useEffect, useRef } from "react";

export function Terminal({ text, status }: { text: string; status?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [text]);

  return (
    <div className="terminal" ref={ref}>
      {text}
      {status && status !== "running" && (
        <div className={`job-status ${status}`}>{`\n[job ${status}]`}</div>
      )}
    </div>
  );
}
