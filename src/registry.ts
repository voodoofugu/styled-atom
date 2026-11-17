import type { StyleLoadError, StyleTarget } from "./types";

const registrySymbol = Symbol.for("styled-atom.registry.v4");
const containerRegistrySymbol = Symbol.for(
  "styled-atom.container-registry.v4",
);
const runtimeCounterSymbol = Symbol.for("styled-atom.runtime-counter.v4");
const runtimeRealmSymbol = Symbol.for("styled-atom.runtime-realm.v4");

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
type RegistryContainer = object & {
  [containerRegistrySymbol]?: ContainerRegistry;
};

export type MountedRegistryEntry = {
  namespace: string;
  publicKey: string;
  kind: "file" | "inline";
  name: string;
  precedence: number;
  css: string;
  signature?: string;
  nonce?: string;
  target?: StyleTarget;
  owner: RegistryOwner;
};

export type RegistryMountResult =
  | { element: HTMLStyleElement; error?: never }
  | { element?: never; error: StyleLoadError };

type RegistryGlobal = typeof globalThis & {
  [registrySymbol]?: SharedRegistry;
  [runtimeCounterSymbol]?: number;
  [runtimeRealmSymbol]?: string;
};

export const nextRuntimeNamespace = () => {
  const root = globalThis as RegistryGlobal;
  root[runtimeRealmSymbol] ??=
    globalThis.crypto?.randomUUID?.().slice(0, 8) ??
    Math.random().toString(36).slice(2, 10);
  root[runtimeCounterSymbol] = (root[runtimeCounterSymbol] ?? 0) + 1;
  return `runtime-${root[runtimeRealmSymbol]}-${root[runtimeCounterSymbol]}`;
};

const sharedRegistry = () => {
  const root = globalThis as RegistryGlobal;
  root[registrySymbol] ??= new WeakMap<object, ContainerRegistry>();
  return root[registrySymbol];
};

const getContainerRegistry = (container: object) => {
  const carrier = container as RegistryContainer;
  const shared = carrier[containerRegistrySymbol];
  if (shared) return shared;
  return sharedRegistry().get(container);
};

const getOrCreateContainerRegistry = (container: object) => {
  const carrier = container as RegistryContainer;
  const existing = getContainerRegistry(container);
  if (existing) return existing;
  const records: ContainerRegistry = {
    records: new Map(),
    identities: new Map(),
  };
  try {
    Object.defineProperty(carrier, containerRegistrySymbol, {
      configurable: true,
      value: records,
    });
  } catch {
    sharedRegistry().set(container, records);
  }
  return records;
};

const releaseContainerRegistry = (container: object) => {
  const carrier = container as RegistryContainer;
  if (carrier[containerRegistrySymbol]) {
    delete carrier[containerRegistrySymbol];
  }
  sharedRegistry().delete(container);
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

export const findServerStyleCss = ({
  target,
  placement,
  namespace,
  publicKey,
}: {
  target?: StyleTarget;
  placement: "head" | "inline";
  namespace: string;
  publicKey: string;
}) => {
  if (typeof document === "undefined") return undefined;
  const container = placement === "head" ? targetContainer(target) : target;
  if (!container) return undefined;
  const element = findServerElement(container, namespace, publicKey);
  if (!element) return undefined;
  return {
    css: (element.textContent ?? "").replace(/<\\\/style/gi, "</style"),
    signature:
      element.getAttribute("data-styled-atom-signature") ?? undefined,
  };
};

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

  const records = getOrCreateContainerRegistry(container as object);

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
  if (entry.signature) {
    record.element.setAttribute("data-styled-atom-signature", entry.signature);
  } else {
    record.element.removeAttribute("data-styled-atom-signature");
  }
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
  const records = getContainerRegistry(container as object);
  const key = registryKey(entry.namespace, entry.publicKey);
  const record = records?.records.get(key);
  if (!record) return;
  record.owners.delete(entry.owner);
  if (record.owners.size > 0) return;
  record.element.remove();
  records?.records.delete(key);
  records?.identities.delete(record.identity);
  if (records?.records.size === 0) {
    releaseContainerRegistry(container as object);
  }
};

export const resetStyleRegistryForTests = () => {
  const root = globalThis as RegistryGlobal;
  if (typeof document !== "undefined" && document.head) {
    delete (document.head as RegistryContainer)[containerRegistrySymbol];
  }
  delete root[registrySymbol];
  delete root[runtimeCounterSymbol];
  delete root[runtimeRealmSymbol];
};
