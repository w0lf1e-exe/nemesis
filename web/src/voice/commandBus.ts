// A tiny pub/sub bus so the voice interface can trigger the same actions as
// button clicks without lifting all module state up into App.

export interface CommandPayloads {
  "recon.setTarget": { target: string };
  "recon.nmap": { target: string; profile: string };
  "recon.whois": { target: string };
  "recon.dig": { target: string; recordType: string };
  "recon.subdomains": { target: string };
  "dev.git": { subcommand: string };
}

export type CommandName = keyof CommandPayloads;

const bus = new EventTarget();

export function emitCommand<K extends CommandName>(name: K, detail: CommandPayloads[K]): void {
  bus.dispatchEvent(new CustomEvent(name, { detail }));
}

export function onCommand<K extends CommandName>(
  name: K,
  handler: (detail: CommandPayloads[K]) => void,
): () => void {
  const listener = (e: Event) => handler((e as CustomEvent<CommandPayloads[K]>).detail);
  bus.addEventListener(name, listener);
  return () => bus.removeEventListener(name, listener);
}
