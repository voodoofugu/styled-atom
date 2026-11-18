# Build-time inline compilation

Status: deferred design proposal. This is not part of the v4 public API.

Signed SSR hydration already reuses matching collected CSS without invoking the
browser compiler. The external stylesheet backend now provides a lifecycle-safe
destination for extracted assets, while dynamic values keep the runtime
compiler. Revisit this proposal after the link backend has production evidence.

## Goal

Compile static inline style objects during the application build while keeping
the current authoring syntax:

```tsx
const styles = {
  display: "grid",
  gap: 12,
  "&:hover": { color: "tomato" },
} satisfies StyledAtomStyles;

<StyledAtom name="card" scope style={styles} />
```

Dynamic objects must continue to work through the existing runtime compiler.
Applications should be able to adopt the optimization without changing their
components or installing a second styled-atom package.

## Constraints

- Keep the runtime and React entry points unchanged.
- Do not evaluate arbitrary application modules during the build.
- Transform only values that can be proven static.
- Preserve HMR, SSR, CSP and current ownership semantics.
- Generate source maps for both the JavaScript transform and extracted CSS.
- Fall back to runtime compilation when analysis is uncertain.
- Keep the build integration optional; no build dependency belongs in the
  browser runtime.

## Proposed shape

Ship the transformer from the same npm package through build-only subpath
exports. One transform core can expose adapters such as `styled-atom/vite`,
`styled-atom/rollup` and later Webpack or Rspack entry points. These are entry
points of one package, not separate framework helpers.

The first implementation should support React JSX because that is the current
component binding. The transform core should depend on styled-atom's
framework-agnostic compiler and keep its extraction result independent of
React, so another binding can reuse it later.

For each statically analyzable `StyledAtom` use, the transform should:

1. resolve a static `name`, `scope` and style object;
2. run the existing compiler during the build;
3. emit a content-hashed CSS asset;
4. replace only the internal runtime input with that asset URL, leaving source
   JSX unchanged;
5. return an accurate JavaScript source map and attach a CSS source map;
6. retain runtime compilation when the name, scope or object is dynamic.

The exact internal marker between the transform and runtime must remain private.
It should not become a second public way to author atoms.

## Why not a universal runtime trick

Moving work out of runtime requires participation from a build tool. The
runtime sees JavaScript values after TypeScript, Sass and bundler transforms and
cannot recover their original file positions or prove that an object is static.
A shared transform core with thin bundler adapters is the narrow universal
layer available in the JavaScript ecosystem.

## Source maps

The transform needs two related maps:

- the normal JavaScript transform map, so generated internal props or imports
  point back to the JSX source;
- a CSS map from generated declarations to the style-object properties that
  produced them.

Loader-provided CSS files remain transparent: styled-atom preserves their
existing `sourceMappingURL`. Sass maps must still be produced by Sass or the
host build pipeline.

## Acceptance criteria

- Static atoms perform no compiler work in the browser.
- Removing the plugin changes performance, not behavior or authoring syntax.
- Dynamic atoms produce the same CSS through the runtime fallback.
- Dev HMR updates CSS without remounting component state.
- SSR and hydration reuse exactly the same compiled CSS identity.
- Source maps open the original JSX/TS property in Chromium, Firefox and WebKit
  developer tools where supported.
- The plugin adds no code or parser dependency to the browser bundle.
- A fixture covers Vite React first; the transform core is tested without Vite.
- The browser benchmark records static compiler cost separately from DOM mount
  and release cost, so the optimization is judged against measured runtime work.

## Open questions before implementation

- Whether very small extracted atoms should remain precompiled text when a
  separate request and link element cost more than their cache value.
- How static scope attributes and reusable objects used by several atom names
  are represented without duplicating CSS.
- Which parser gives stable JSX and TypeScript locations without making the
  package disproportionately large.
- Whether a unified adapter dependency earns its cost after the Vite prototype
  proves the transform contract.
