import { useEffect } from "react";
import { api } from "../api.js";
import { onCommand } from "../voice/commandBus.js";
import { speak } from "../voice/speech.js";
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

  useEffect(
    () =>
      onCommand("dev.git", ({ subcommand }) => {
        const action = GIT_ACTIONS.find((a) => a.id === subcommand) ?? GIT_ACTIONS[0];
        speak(`Running git ${action.label}.`);
        job.run(() => api.gitOp(action.id), `Git ${action.label}`);
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return (
    <ModuleCard title="Dev Module" tag="GIT">
      <div className="row">
        {GIT_ACTIONS.map((a) => (
          <button key={a.id} disabled={job.running} onClick={() => job.run(() => api.gitOp(a.id), `Git ${a.label}`)}>
            git {a.label}
          </button>
        ))}
      </div>
      <Terminal text={job.output} status={job.status} />
    </ModuleCard>
  );
}
