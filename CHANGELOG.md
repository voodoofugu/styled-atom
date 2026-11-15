# Changelog

All notable changes to `styled-atom` are documented here. The project follows
Semantic Versioning.

## [Unreleased]

## [4.0.0] - 2026-11-15

### Added

- Framework-agnostic `styled-atom` core entry with the runtime, style compiler,
  SSR collector and shared types.
- React APIs in the separate `styled-atom/react` entry.
- Explicit `loading`, `ready` and `failed` atom states.
- `errorFallback`, `onError`, `onReady`, `onStatusChange` and retry support.
- `data-styled-atom-status` on scoped wrappers.
- `placement="inline"` for style tags that travel with component content and
  React portals.
- Runtime and per-atom targets for `Document`, `ShadowRoot`, iframe documents and
  element containers.
- Retryable target failures when an iframe or deferred document is not yet
  available, without falling back to the main document.
- Stable CSS precedence independent of component mount order.
- CSP nonce support.
- SSR style collection, initial CSS manifests and client adoption of server
  style elements.
- `as`, `wrapperProps` and render-function children.
- Conflict reporting for simultaneously mounted inline atoms that reuse a name
  with different CSS.
- Runtime, React, SSR and compiler test suites.

### Changed

- The library is positioned around atomic style ownership and CSS lifecycle
  management for dynamic UI surfaces.
- React children render eagerly while CSS loads unless `render="ready"` or a
  `fallback` requests blocking behavior.
- `scope` replaces `encap`.
- Inline style compilation is cached by style-object identity and scope.
- Reconfiguring a runtime now updates existing atoms, including loader retries,
  target migration and precedence changes.
- Vite examples load CSS text through `?inline`; ordinary CSS imports remain
  owned by Vite.
- The root package is private and releases are prepared in `./publish`.

### Removed

- React exports from the root `styled-atom` entry.
- The ambiguous `encap` prop.
- The implicit behavior that treated a failed CSS load as successfully loaded.

### Migration from v3

```diff
- import StyledAtom, { createStyledAtomStore } from "styled-atom";
+ import { StyledAtom, createStyledAtomStore } from "styled-atom/react";
```

```diff
- <StyledAtom name="card" encap styles={styles}>
+ <StyledAtom name="card" scope styles={styles}>
```

For Vite loaders:

```diff
- (name) => import(`./styles/${name}.css`)
+ (name) => import(`./styles/${name}.css?inline`)
```

Use `render="ready"` when children must stay hidden until every requested style
is ready. Use `errorFallback` or `onError` to handle failed files explicitly.

## [3.0.3] - 2026-07-02

- Fixed nested selector-list scoping in the inline style compiler.
- Shipped the v3 runtime store, inline compiler, reload and replacement APIs.

[Unreleased]: https://github.com/voodoofugu/styled-atom/compare/v4.0.0...HEAD
[4.0.0]: https://github.com/voodoofugu/styled-atom/compare/v3.0.3...v4.0.0
[3.0.3]: https://github.com/voodoofugu/styled-atom/releases/tag/v3.0.3
