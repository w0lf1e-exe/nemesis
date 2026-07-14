import type { PropsWithChildren } from "react";

export function ModuleCard({
  title,
  tag,
  children,
}: PropsWithChildren<{ title: string; tag?: string }>) {
  return (
    <section className="card">
      <div className="card-header">
        <h2>{title}</h2>
        {tag && <span className="tag">{tag}</span>}
      </div>
      <div className="card-body">{children}</div>
    </section>
  );
}
