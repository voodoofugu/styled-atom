import type { StyleLoadError, StyleTarget } from "./types";

type RegistryOwner = object;

type RegistryRecord = {
  element: HTMLStyleElement;
  publicKey: string;
  identity: string;
  css: string;
  nonce?: string;
  owners: Set<RegistryOwner>;
};

type ContainerRegistry = {
  records: Map<string, RegistryRecord>;
  identities: Map<string, RegistryRecord>;
};
type SharedRegistry = WeakMap<object, ContainerRegistry>;

export type MountedRegistryEntry = {
  namespace: string;
  publicKey: string;
  kind: "file" | "inline";
  name: string;
  precedence: number;
  css: string;
  nonce?: string;
  target?: StyleTarget;
  owner: RegistryOwner;
};

export type RegistryMountResult =
  | { element: HTMLStyleElement; error?: never }
  | { element?: never; error: StyleLoadError };

const registrySymbol = Symbol.for("styled-atom.registry.v4");
const runtimeCounterSymbol = Symbol.for("styled-atom.runtime-counter.v4");

type RegistryGlobal = typeof globalThis & {
  [registrySymbol]?: SharedRegistry;
  [runtimeCounterSymbol]?: number;
};

export const nextRuntimeNamespace = () => {
  const root = globalThis as RegistryGlobal;
  root[runtimeCounterSymbol] = (root[runtimeCounterSymbol] ?? 0) + 1;
  return `runtime-${root[runtimeCounterSymbol]}`;
};

const sharedRegistry = () => {
  const root = globalThis as RegistryGlobal;
  root[registrySymbol] ??= new WeakMap<object, ContainerRegistry>();
  return root[registrySymbol];
};

const targetContainer = (target?: StyleTarget): ParentNode | undefined => {
  if (!target) return undefined;
  if (target.nodeType === 9) return (target as Document).head ?? undefined;
  return target;
};

const ownerDocument = (target: StyleTarget, fallback: Document) =>
  target.nodeType === 9
    ? (target as Document)
    : target.ownerDocument ?? fallback;

const registryKey = (namespace: string, publicKey: string) =>
  `${namespace}\u0000${publicKey}`;

const identityKey = (
  namespace: string,
  kind: MountedRegistryEntry["kind"],
  name: string,
) => `${namespace}\u0000${kind}\u0000${name}`;

const conflict = (name: string, message: string): StyleLoadError => ({
  code: "conflict",
  source: name,
  error: new Error(`[styled-atom] ${message}`),
});

const findServerElement = (
  container: ParentNode,
  namespace: string,
  publicKey: string,
) =>
  Array.from(
    container.querySelectorAll?.("style[data-styled-atom-namespace]") ?? [],
  ).find(
    (candidate) =>
      candidate.getAttribute("data-styled-atom-namespace") === namespace &&
      candidate.getAttribute("data-styled-atom-key") === publicKey,
  ) as HTMLStyleElement | undefined;

const comparableCss = (css: string) =>
  css
    .replace(/\n?\/\*#\s*sourceURL=styled-atom\/[\s\S]*?\*\/$/, "")
    .replace(/<\\\/style/gi, "</style")
    .trim();

const insertInOrder = (
  container: ParentNode,
  element: HTMLStyleElement,
  namespace: string,
  publicKey: string,
  precedence: number,
) => {
  const siblings = Array.from(
    container.querySelectorAll?.("style[data-styled-atom-precedence]") ?? [],
  ) as HTMLStyleElement[];
  const identity = `${namespace}\u0000${publicKey}`;
  const before = siblings.find((sibling) => {
    if (sibling === element) return false;
    const siblingPrecedence = Number(
      sibling.getAttribute("data-styled-atom-precedence"),
    );
    const siblingIdentity = `${
      sibling.getAttribute("data-styled-atom-namespace") ?? ""
    }\u0000${sibling.getAttribute("data-styled-atom-key") ?? ""}`;
    return (
      siblingPrecedence > precedence ||
      (siblingPrecedence === precedence && siblingIdentity > identity)
    );
  });
  container.insertBefore(element, before ?? null);
};

export const mountRegistryEntry = (
  entry: MountedRegistryEntry,
): RegistryMountResult => {
  const container = targetContainer(entry.target);
  if (!container || typeof document === "undefined" || !entry.target) {
    return {
      error: {
        code: "target",
        source: entry.name,
        error: new Error("[styled-atom] The style target is not available."),
      },
    };
  }

  const registry = sharedRegistry();
  let records = registry.get(container as object);
  if (!records) {
    records = { records: new Map(), identities: new Map() };
    registry.set(container as object, records);
  }

  const key = registryKey(entry.namespace, entry.publicKey);
  const identity = identityKey(entry.namespace, entry.kind, entry.name);
  const identityRecord = records.identities.get(identity);
  if (identityRecord && identityRecord.publicKey !== entry.publicKey) {
    return {
      error: conflict(
        entry.name,
        `Style "${entry.name}" is already mounted with different cascade precedence. Shared identities must use the same order configuration.`,
      ),
    };
  }
  let record = records.records.get(key);
  if (record && record.css !== entry.css) {
    const ownsRecord = record.owners.has(entry.owner);
    if (!ownsRecord || record.owners.size > 1) {
      return {
        error: conflict(
          entry.name,
          `Style "${entry.name}" is already mounted by another runtime with different CSS. Use a different namespace or style name.`,
        ),
      };
    }
  }
  if (
    record?.nonce &&
    entry.nonce &&
    record.nonce !== entry.nonce
  ) {
    return {
      error: conflict(
        entry.name,
        `Style "${entry.name}" is already mounted with a different CSP nonce.`,
      ),
    };
  }

  if (!record) {
    const doc = ownerDocument(entry.target, document);
    const serverElement = findServerElement(
      container,
      entry.namespace,
      entry.publicKey,
    );
    if (
      serverElement &&
      comparableCss(serverElement.textContent ?? "") !== comparableCss(entry.css)
    ) {
      return {
        error: conflict(
          entry.name,
          `Server style "${entry.name}" does not match the client CSS for the same namespace and key.`,
        ),
      };
    }
    const serverNonce = serverElement?.nonce || undefined;
    if (serverNonce && entry.nonce && serverNonce !== entry.nonce) {
      return {
        error: conflict(
          entry.name,
          `Server style "${entry.name}" has a different CSP nonce from the client runtime.`,
        ),
      };
    }
    const element = serverElement ?? doc.createElement("style");
    element.setAttribute("data-styled-atom-namespace", entry.namespace);
    element.setAttribute("data-styled-atom-key", entry.publicKey);
    element.setAttribute(
      "data-styled-atom-precedence",
      String(entry.precedence),
    );
    record = {
      element,
      publicKey: entry.publicKey,
      identity,
      css: entry.css,
      nonce: serverNonce ?? entry.nonce,
      owners: new Set(),
    };
    records.records.set(key, record);
    records.identities.set(identity, record);
  }

  record.css = entry.css;
  record.nonce ??= entry.nonce;
  record.owners.add(entry.owner);
  if (record.nonce) record.element.nonce = record.nonce;
  if (record.element.textContent !== entry.css) {
    record.element.textContent = entry.css;
  }
  insertInOrder(
    container,
    record.element,
    entry.namespace,
    entry.publicKey,
    entry.precedence,
  );

  return { element: record.element };
};

export const releaseRegistryEntry = (
  entry: Pick<MountedRegistryEntry, "namespace" | "publicKey" | "target" | "owner">,
) => {
  const container = targetContainer(entry.target);
  if (!container) return;
  const registry = sharedRegistry();
  const records = registry.get(container as object);
  const key = registryKey(entry.namespace, entry.publicKey);
  const record = records?.records.get(key);
  if (!record) return;
  record.owners.delete(entry.owner);
  if (record.owners.size > 0) return;
  record.element.remove();
  records?.records.delete(key);
  records?.identities.delete(record.identity);
  if (records?.records.size === 0) registry.delete(container as object);
};

export const resetStyleRegistryForTests = () => {
  delete (globalThis as RegistryGlobal)[registrySymbol];
  delete (globalThis as RegistryGlobal)[runtimeCounterSymbol];
};
