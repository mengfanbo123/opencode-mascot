const bus = new EventTarget();

const CELEBRATE_EVENT = "mascot:celebrate";

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
