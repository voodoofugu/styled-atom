# styled-atom — project context and decision log

_Last updated: 2026-11-18 · target version: 5.0.0_

## What it is

`styled-atom` provides atomic style ownership: a UI surface declares one small,
focused CSS atom next to the component that owns it. The runtime compiles,
mounts, shares, reloads and releases that atom with the UI lifecycle.

Its primary use cases are component workbenches, visual editors, previews,
route-owned styles, plugin interfaces and microfrontends. It is not intended to
replace CSS Modules or a build-time CSS extractor for ordinary static styles.

Here, "atomic" means a small unit of style ownership, not one-property utility
classes or the Atomic CSS methodology.

The inline style-object compiler is a first-class feature. Its `style` prop lets
a component define a small typed CSS atom directly in JSX while still
supporting nested selectors, at-rules, keyframes and optional scoping.

## v5 decisions

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
- React `inlinePlacement` renders style elements next to the protected content, or
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
  `renderWhenReady` is the explicit blocking mode.
- Wrapper elements expose `sa-status`. Status is also available to
  callbacks and render-function children.
- React components expose one lifecycle callback, `onStatusChange`; the runtime
  keeps `onError` for centralized loader reporting.
- `scope` is the selector and optional wrapper boundary.
- Basic scoping stays `scope` or `scope="name"`; the optional wrapper element
  and DOM attributes live in the same `scope` object instead of separate props.

### SSR

- Inline CSS can be collected during server rendering.
- Imported CSS is server-ready when supplied through an initial CSS manifest.
- A per-request collector serializes style tags for the document head.
- The browser adopts matching server style tags instead of inserting duplicates.
- Matching inline input reuses collected CSS without recompiling it during
  hydration; unsigned or changed input keeps the safe compiler fallback.
- The React entry is an RSC client boundary. The collector targets traditional
  React SSR; server-component integrations must keep stores and non-serializable
  props inside client modules.

### Quality bar

- Runtime, React, SSR, type-level and browser-relevant behavior need tests.
- Browser behavior is checked in Chromium, Firefox and WebKit. Performance
  benchmarks run separately with one worker so they do not make correctness CI
  flaky or distort measurements through contention.
- A production Next.js App Router fixture verifies the packaged React client
  boundary, server pre-render, hydration reuse and a client-side style update.
- Release checks include lint, typecheck, tests, site build, package build,
  tarball inspection and package-resolution smoke tests.
- Every public export and its practical properties are documented with JSDoc in
  the same visual format as morphing-scroll.
- The README-driven documentation site uses morphing-scroll for its own
  navigation and article scrolling. The README structure follows the established
  main-branch format: banner, contents, `<h2>` dividers, a small set of `###`
  sections and nested API disclosures. Migration lives in CHANGELOG.

## Compatibility and migration

The v4 foundation remains intact. v5 adds external stylesheet ownership and
simplifies the component lifecycle API:

- `StaticAtom` requires only `href`; an optional `name` opts into an explicit
  shared identity.
- Component `onReady` and `onError` are replaced by `onStatusChange`.
- Runtime/store `onError` remains available and is not a component prop.

## Documentation UI contract

The documentation shell is intentionally aligned with `morphing-scroll` and
`nexus-state`: brand at the left, a monospace theme control at the right, the
same responsive layout, an animated collapsible side navigation and a project
footer for external links. Only `morphing-scroll` keeps its `docs` / `playground`
mode switch in the header. The theme control supports click, keyboard input and
pointer dragging. Every site links back to the author's site from its footer.
Documentation uses one full-width main scroll. Header, article grid and footer
content share a centered 1180px inner container; their outer surfaces remain
full-width. On desktop the side navigation stays visually fixed in its article
column while the article moves beneath a translucent header. Its available
height shrinks when the footer enters the viewport, so the footer never covers
the menu; long menus keep their own scroll. The header gains a subtle tint and
shadow after scrolling. Shared site scrolls do not render edge gradients.

The implementation stays local to each repository for now. This avoids a shared
UI package and cross-project release coupling for a small amount of code. When
changing the shell, check the other two sites and mirror structural or
interaction changes. Accent colors, available links and navigation depth remain
project-specific. README disclosures that represent complete documentation
sections may become side-navigation pages; disclosures that only reveal an
example stay in the article.

### Source maps and build-time compilation

- Generated `sourceURL` comments default to development and test environments,
  can be forced on or off per runtime, and are not maps to Sass or TypeScript.
- Loader CSS remains transparent: existing `sourceMappingURL` and `sourceURL`
  comments are preserved. The tool that transforms Sass or TypeScript must
  produce the real map.
- Static inline objects may later be compiled by an optional build transform
  shipped from this package. Source JSX remains unchanged and dynamic values
  keep the runtime compiler fallback. The design and acceptance criteria live
  in `BUILD_TIME_COMPILATION.md`.

### External stylesheet research

- `StyledAtom` owns dynamic CSS text and keeps the runtime compiler and
  `<style>` backend. `StaticAtom` owns ready-made immutable CSS assets through
  `<link rel="stylesheet">`.
- Standalone static atoms require only `href`; `name` is optional when shared
  ownership, stable replacement identity or readable diagnostics are useful.
  Store-bound static atoms resolve typed file names through a `stylesheets`
  manifest. This keeps the semantic choice explicit without a misleading
  `cached` or `static` mode prop.
- Removing the last owner removes the link and its CSS from the cascade. HTTP
  cache retention remains browser-owned and can accelerate a later mount.
- Link replacement keeps the previous stylesheet active until the new URL has
  loaded. Errors remain retryable without leaving the UI unstyled.
- Build-time extraction may later turn provably static `style` objects into
  assets consumed by the same link backend. Dynamic values retain runtime CSS.
