const bus = new EventTarget();

const CELEBRATE_EVENT = "mascot:celebrate";
const VERSION_EVENT = "mascot:version";
const SCATTER_EVENT = "mascot:scatter";
const PROP_SHOW_EVENT = "mascot:propshow";

export function emitCelebrate(newVersion: string): void {
  bus.dispatchEvent(new CustomEvent(CELEBRATE_EVENT, { detail: { newVersion } }));
}

export function onCelebrate(handler: (newVersion: string) => void): () => void {
  const listener = (e: Event) => {
    const detail = (e as CustomEvent).detail as { newVersion: string };
    handler(detail.newVersion);
  };
  bus.addEventListener(CELEBRATE_EVENT, listener);
  return () => bus.removeEventListener(CELEBRATE_EVENT, listener);
}

export function emitVersion(version: string): void {
  bus.dispatchEvent(new CustomEvent(VERSION_EVENT, { detail: { version } }));
}

export function onVersion(handler: (version: string) => void): () => void {
  const listener = (e: Event) => {
    const detail = (e as CustomEvent).detail as { version: string };
    handler(detail.version);
  };
  bus.addEventListener(VERSION_EVENT, listener);
  return () => bus.removeEventListener(VERSION_EVENT, listener);
}

export function emitScatter(): void {
  bus.dispatchEvent(new CustomEvent(SCATTER_EVENT));
}

export function onScatter(handler: () => void): () => void {
  const listener = () => { handler(); };
  bus.addEventListener(SCATTER_EVENT, listener);
  return () => bus.removeEventListener(SCATTER_EVENT, listener);
}

export function emitPropShow(): void {
  bus.dispatchEvent(new CustomEvent(PROP_SHOW_EVENT));
}

export function onPropShow(handler: () => void): () => void {
  const listener = () => { handler(); };
  bus.addEventListener(PROP_SHOW_EVENT, listener);
  return () => bus.removeEventListener(PROP_SHOW_EVENT, listener);
}
