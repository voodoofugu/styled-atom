# styled-atom — project context and decision log

_Last updated: 2026-11-15 · target version: 4.0.0_

## What it is

`styled-atom` provides atomic style ownership: a UI surface declares one small,
focused CSS atom next to the component that owns it. The runtime compiles,
mounts, shares, reloads and releases that atom with the UI lifecycle.

Its primary use cases are component workbenches, visual editors, previews,
route-owned styles, plugin interfaces and microfrontends. It is not intended to
replace CSS Modules or a build-time CSS extractor for ordinary static styles.

Here, "atomic" means a small unit of style ownership, not one-property utility
classes or the Atomic CSS methodology.

The inline style-object compiler is a first-class feature. It allows a component
to define a small typed CSS atom directly in JSX while still supporting nested
selectors, at-rules, keyframes and optional scoping.

## v4 decisions

### Entry points

| Import | Purpose | React dependency |
| --- | --- | --- |
| `styled-atom` | Runtime, compiler, collector and shared types | no |
| `styled-atom/react` | `StyledAtom` and React-bound runtime | optional peer |

The core must be usable without React and must not import React types.

### Runtime ownership

- CSS entries are reference-counted and shared when their identity, content and
  mount destination are compatible.
- A realm-shared registry coordinates DOM ownership across independent stores,
  ESM/CJS instances and physical package copies. Explicit equal namespaces and
  names are a shared-resource contract; incompatible CSS, nonce or precedence
  fails instead of overwriting an owner.
- The target container also carries the versioned registry. This coordinates
  same-origin runtimes from different JavaScript realms when they mount into
  the same iframe document. Default namespaces include a realm identifier so
  unrelated runtimes from different windows cannot collide accidentally.
- Async loads use revisions so stale results cannot replace newer CSS.
- Conflicting inline atoms with the same public name and different CSS are
  reported instead of silently overwriting each other.
- Every atom exposes one explicit status: `loading`, `ready` or `failed`.
- Errors remain retryable and never count as a successful load.

### Mounting and cascade

- Default placement is the target document's `head`.
- `placement="inline"` renders style elements next to the protected content, or
  inside the optional wrapper. This follows React portals into their document.
- A runtime and an individual atom may target a `Document`, `ShadowRoot` or
  element. This covers iframes and isolated preview roots.
- An explicitly requested but unavailable target is a retryable `target` error;
  CSS must never silently fall back into the host document.
- The runtime owns a deterministic precedence order independent of mount order.
- Injected style elements support CSP nonces.
- Default namespaces are unique across package copies; SSR and intentionally
  shared resources use an explicit stable namespace.

### React behavior

- Runtime insertion uses `useInsertionEffect`; external snapshots use
  `useSyncExternalStore`.
- Children render eagerly by default so SSR does not erase page content.
  `render="ready"` is the explicit blocking mode.
- Wrapper elements expose `data-styled-atom-status`. Status is also available to
  callbacks and render-function children.
- `scope` replaces the unclear `encap` name. v4 may provide a deprecated alias
  only where it does not complicate the type contract.
- Basic scoping stays `scope` or `scope="name"`; the optional wrapper element
  and DOM attributes live in the same `scope` object instead of separate props.

### SSR

- Inline CSS can be collected during server rendering.
- Imported CSS is server-ready when supplied through an initial CSS manifest.
- A per-request collector serializes style tags for the document head.
- The browser adopts matching server style tags instead of inserting duplicates.

### Quality bar

- Runtime, React, SSR, type-level and browser-relevant behavior need tests.
- Browser behavior is checked in Chromium, Firefox and WebKit. Performance
  benchmarks run separately with one worker so they do not make correctness CI
  flaky or distort measurements through contention.
- Release checks include lint, typecheck, tests, site build, package build,
  tarball inspection and package-resolution smoke tests.
- The documentation site explains when to use the library, when not to use it,
  the compiler, lifecycle, targets, ordering, failures, SSR and migration from v3.

## Compatibility and migration

v4 is intentionally breaking. The migration guide must cover:

- imports moving from `styled-atom` to `styled-atom/react` for React APIs;
- `encap` becoming `scope`;
- eager children as the default loading behavior;
- explicit error states and retry;
- Vite CSS text imports using `?inline` rather than ordinary CSS imports.
- cascade order moving from insertion timing to explicit `order`/`precedence`.

### Source maps and build-time compilation

- Development `sourceURL` gives injected CSS a stable virtual filename but is
  not a map to Sass or TypeScript.
- Loader CSS remains transparent: existing `sourceMappingURL` and `sourceURL`
  comments are preserved. The tool that transforms Sass or TypeScript must
  produce the real map.
- Static inline objects may later be compiled by an optional build transform
  shipped from this package. Source JSX remains unchanged and dynamic values
  keep the runtime compiler fallback. The design and acceptance criteria live
  in `BUILD_TIME_COMPILATION.md`.
