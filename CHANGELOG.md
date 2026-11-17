# Changelog

All notable changes to `styled-atom` are documented here. The project follows
Semantic Versioning.

## [Unreleased]

## [4.0.0] - 2026-11-17

### Added

- Framework-agnostic `styled-atom` core entry with the runtime, style compiler,
  SSR collector and shared types.
- React APIs in the separate `styled-atom/react` entry.
- Explicit `loading`, `ready` and `failed` atom states.
- `errorFallback`, `onError`, `onReady`, `onStatusChange` and retry support.
- `data-styled-atom-status` on scoped wrappers.
- React `inlinePlacement` for style tags that travel with component content and
  React portals.
- Runtime and per-atom targets for `Document`, `ShadowRoot`, iframe documents and
  element containers.
- Retryable target failures when an iframe or deferred document is not yet
  available, without falling back to the main document.
- Stable CSS precedence independent of component mount order.
- CSP nonce support.
- SSR style collection, initial CSS manifests and client adoption of server
  style elements.
- Hydration signatures that let matching inline style input reuse collected CSS
  without running the compiler again in the browser.
- A `"use client"` boundary on the React entry for React Server Component
  bundlers.
- A production Next.js App Router fixture covering a Server Component import,
  SSR inline CSS reuse, hydration and a dynamic client update.
- Scope wrapper configuration and render-function children.
- Conflict reporting for simultaneously mounted inline atoms that reuse a name
  with different CSS.
- Runtime, React, SSR and compiler test suites.
- A realm-shared ownership registry that coordinates independent stores and
  physical package copies without premature removal or silent overwrites.
- Cross-runtime conflict reporting for CSS, CSP nonce and cascade precedence.
- Globally unique default runtime namespaces across physical bundle copies.
- `runtime.inspect()` / `store.inspect()` diagnostics for active atoms,
  local ownership, targets, status, precedence and CSS size.
- Fallback declaration arrays in the inline compiler.
- Development detection and recompilation of mutated cached style objects.
- Chromium coverage for computed cascade, iframe and ShadowRoot targets,
  portals, hydration, CSP enforcement, physical bundle copies and 1,000-atom
  cleanup.
- Framework recipes for Vite, Next.js, SSR, iframe previews, Shadow DOM,
  portals, microfrontends and CSP.
- Chromium, Firefox and WebKit lifecycle coverage, including target migration,
  in-place replacement, repeated cleanup and 1,000 shared owners.
- A separate single-worker browser benchmark for unique atoms, shared owners
  and repeated toggling.
- Source-map guidance and a troubleshooting reference.
- Cross-realm ownership for a shared same-origin iframe document and
  realm-unique automatic namespaces.
- Real-browser validation that representative compiler output remains valid CSS
  in Chromium, Firefox and WebKit.
- Vue, Svelte and Solid lifecycle recipes built on the framework-agnostic core.
- Public API declarations documented with practical JSDoc.

### Changed

- The library is positioned around atomic style ownership and CSS lifecycle
  management for dynamic UI surfaces.
- React children render eagerly while CSS loads unless `renderWhenReady` or a
  `fallback` requests blocking behavior.
- `scope` replaces `encap`.
- The inline compiler prop is now `style` instead of `styles`.
- Scope wrapper element and attributes now live in the `scope` prop instead of
  separate `as` and `wrapperProps` props.
- Runtime and store creation now use one object configuration form; the loader
  function shorthand was removed.
- Generated `sourceURL` comments now default to development and test builds;
  `sourceURL` can force them on or off per runtime.
- Inline style compilation is cached by style-object identity and scope.
- Initially ready atoms now call `onReady` and `onStatusChange` after mount.
- Reconfiguring a runtime now updates existing atoms, including loader retries,
  target migration and precedence changes.
- Server style adoption validates CSS and nonce compatibility before taking
  ownership.
- Client-only mounts and dynamic updates keep the direct compiler path; only
  initial hydration input pays the cheaper signature check.
- The documentation site now renders README content as its source of truth and
  uses `morphing-scroll` for its navigation and article scrolling, with the same
  scrollbar and documentation shell grammar. The README keeps the established
  main-branch layout with its banner, contents, section dividers and nested API
  disclosure blocks.
- Vite examples load CSS text through `?inline`; ordinary CSS imports remain
  owned by Vite.
- The root package is private and releases are prepared in `./publish`.

### Removed

- React exports from the root `styled-atom` entry.
- The ambiguous `encap` prop.
- The duplicate `as`, `wrapperProps`, `statusAttribute` and `store.runtime`
  escape hatches from the React API.
- The implicit behavior that treated a failed CSS load as successfully loaded.

### Migration from v3

```diff
- import StyledAtom, { createStyledAtomStore } from "styled-atom";
+ import { StyledAtom, createStyledAtomStore } from "styled-atom/react";
```

```diff
- <StyledAtom name="card" encap styles={styles}>
+ <StyledAtom name="card" scope style={styles}>
```

For Vite loaders:

```diff
- (name) => import(`./styles/${name}.css`)
+ (name) => import(`./styles/${name}.css?inline`)
```

Use `renderWhenReady` when children must stay hidden until every requested style
is ready. Use `errorFallback` or `onError` to handle failed files explicitly.
If v3 relied on insertion order, declare the cascade through the store's
`order`; equal default precedence is sorted by stable identity in v4.

## [3.0.3] - 2026-07-02

- Fixed nested selector-list scoping in the inline style compiler.
- Shipped the v3 runtime store, inline compiler, reload and replacement APIs.

[Unreleased]: https://github.com/voodoofugu/styled-atom/compare/v4.0.0...HEAD
[4.0.0]: https://github.com/voodoofugu/styled-atom/compare/v3.0.3...v4.0.0
[3.0.3]: https://github.com/voodoofugu/styled-atom/releases/tag/v3.0.3
