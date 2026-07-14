import { api } from "../api.js";
import { useJob } from "../hooks/useJob.js";
import { ModuleCard } from "./ModuleCard.js";
import { Terminal } from "./Terminal.js";

const GIT_ACTIONS = [
  { id: "status", label: "status" },
  { id: "log", label: "log" },
  { id: "diff", label: "diff --stat" },
  { id: "branch", label: "branches" },
  { id: "remote", label: "remotes" },
  { id: "show-ref", label: "refs" },
];

export function DevPanel() {
  const job = useJob();

  return (
    <ModuleCard title="Dev Module" tag="GIT">
      <div className="row">
        {GIT_ACTIONS.map((a) => (
          <button key={a.id} disabled={job.running} onClick={() => job.run(() => api.gitOp(a.id))}>
            git {a.label}
          </button>
        ))}
      </div>
      <Terminal text={job.output} status={job.status} />
    </ModuleCard>
  );
}
