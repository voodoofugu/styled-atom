![styled-atom](https://raw.githubusercontent.com/voodoofugu/styled-atom/main/src/assets/banner-logo.png)

# styled-atom

CSS that appears and disappears with your UI.

`styled-atom` loads a regular stylesheet or compiles one focused inline style
exactly when a UI surface needs it. The runtime mounts that CSS, shares it
between consumers, reports its state, reloads it and removes it when the last
owner disappears.

Here, **atomic** means a small unit of style ownership. It does not mean
one-property utility classes or the Atomic CSS methodology.

The library is designed for component workbenches, previews, visual editors,
route-owned styles, plugin interfaces and microfrontends. For ordinary static
application CSS, prefer CSS Modules or your bundler's extracted CSS.

## CSS stays CSS

`styled-atom` is additive. It does not require moving application CSS into
JavaScript or replacing the project's existing styling tools.

- `.css` files remain ordinary CSS and are never rewritten;
- selectors, cascade, media queries and keyframes keep browser semantics;
- CSS Modules, global styles and extracted bundles can remain the default;
- the runtime can be introduced only where CSS ownership follows dynamic UI;
- the inline object compiler is an optional, typed way to express focused CSS,
  not a separate styling language.

## Install

```bash
npm install styled-atom
```

React is an optional peer dependency. Import React APIs from
`styled-atom/react`; the root entry contains the framework-agnostic runtime and
compiler.

## Inline style atoms

```tsx
import { StyledAtom, type StyledAtomStyles } from "styled-atom/react";

const styles = {
  display: "grid",
  gap: 12,
  padding: 20,
  borderRadius: 16,
  background: "#111827",
  color: "white",

  ".title": {
    margin: 0,
    fontSize: 20,
  },

  "&:hover": {
    background: "#172033",
  },

  "@media (width < 40rem)": {
    padding: 14,
  },
} satisfies StyledAtomStyles;

export function PreviewCard() {
  return (
    <StyledAtom name="preview-card" scope styles={styles}>
      <h2 className="title">Preview</h2>
    </StyledAtom>
  );
}
```

`scope` creates a wrapper and compiles root declarations against it. Without a
scope, the default root selector is `.preview-card`; add that class to your own
markup when root declarations should apply.

Use a string to choose the wrapper class, or keep advanced wrapper settings in
the same prop:

```tsx
<StyledAtom
  name="preview-card"
  styles={styles}
  scope={{
    element: "section",
    className: "preview-surface",
    "aria-label": "Card preview",
    "data-surface": "docs",
  }}
>
  <PreviewCard />
</StyledAtom>
```

This renders a `section.preview-surface`. `element` defaults to `div`, and the
remaining values become attributes on that element. The runtime always adds
`data-styled-atom-status` to a scope wrapper.

The compiler supports:

- camelCase declarations and custom properties;
- numeric `px` conversion with unitless-property handling;
- nested selectors and `&`;
- selector lists;
- media, supports, container and layer at-rules;
- keyframes, `@font-face` and `@page`;
- repeated fallback declarations through arrays;
- CSS `content` values.

The object syntax may be nested for authoring convenience, but v4 deliberately
compiles it to flat CSS rules. Native CSS Nesting is not part of the current
output contract: it can be reconsidered after the specification stabilizes, the
supported browser matrix is verified and measurements show that it meaningfully
reduces generated CSS.

```ts
const modernColor = {
  display: ["-webkit-box", "flex"],
  color: ["#0969da", "oklch(55% 0.2 250)"],
} satisfies StyledAtomStyles;
```

Compilation is cached by style-object identity and scope. Keep reusable style
objects at module scope when possible and treat them as immutable. Development
builds detect a mutated cached object, recompile it and report a warning;
production keeps the faster identity-only cache.

Inline objects are compiled at runtime in v4. A build-time transform is being
designed for statically analyzable objects, with runtime compilation kept as the
fallback for dynamic values. It must preserve the existing JSX syntax and ship
from this package rather than require a separate styling API.

## CSS files

Create one store for a shell, workspace or isolated UI surface:

```tsx
import { createStyledAtomStore } from "styled-atom/react";

type StyleFile = "reset" | "tokens" | "preview-card";

const modules = import.meta.glob("./styles/*.css", {
  query: "?inline",
  import: "default",
});

export const styles = createStyledAtomStore<StyleFile>({
  namespace: "docs",
  order: ["reset", "tokens", "preview-card"],
  loader(name) {
    const load = modules[`./styles/${name}.css`];
    if (!load) throw new Error(`Unknown style atom: ${name}`);
    return load() as Promise<string>;
  },
});

export const StyleAtom = styles.StyledAtom;
```

```tsx
<StyleAtom files={["tokens", "preview-card"]} scope>
  <PreviewCard />
</StyleAtom>
```

Vite's ordinary `.css` import injects CSS itself. Use `?inline` when
`styled-atom` should receive and own the CSS text.

Imported CSS is not rewritten. `scope` creates a wrapper and a stable class for
the file to target; the file must contain that selector itself. This is a
selector boundary, not Shadow DOM isolation.

## Lifecycle state

Every atom has exactly one state:

- `loading`: at least one requested file is still loading;
- `ready`: every requested style is mounted;
- `failed`: loading or ownership failed and the atom can be retried.

Scoped wrappers expose the state through `data-styled-atom-status`.

```tsx
<StyleAtom
  files="preview-card"
  scope="preview-surface"
  fallback={<Spinner />}
  errorFallback={({ errors, retry }) => (
    <button type="button" onClick={retry}>
      Retry {errors[0].source}
    </button>
  )}
>
  {({ status }) => <Preview status={status} />}
</StyleAtom>
```

Children render eagerly while files load. Passing `fallback`, or setting
`render="ready"`, hides them until styles are ready. A failed atom never counts
as ready.

Use `onStatusChange`, `onReady` and `onError` for external reporting.

## Placement and targets

The default placement is the target document's `head`. Shared head styles are
reference-counted and deduplicated.

Ownership is shared through a document-level registry. Independent stores and
physical copies of `styled-atom` can safely use the same namespace and style
identity: identical CSS shares one element and ref-count, while incompatible
CSS or CSP nonces produce a `failed` conflict instead of overwriting an owner.

```tsx
const styles = createStyledAtomStore({
  target: iframeDocument,
  nonce: requestNonce,
  order: ["reset", "tokens", "components"],
  loader,
});
```

`target` accepts a `Document`, `ShadowRoot` or element container. It can be set
for the runtime or one atom. This covers iframe documents, web-component roots
and isolated preview containers. A target callback that currently returns
`null` produces a retryable `failed` state instead of leaking CSS into the main
document; call `retry()` after the iframe or portal document becomes available.

Use inline placement when the style should travel through a React portal with
its content:

```tsx
createPortal(
  <StyledAtom
    name="portal-card"
    placement="inline"
    styles={portalStyles}
  >
    <PortalCard />
  </StyledAtom>,
  portalRoot,
);
```

With a scope wrapper, inline style tags are its first children. Without a
wrapper, they are siblings of the protected content. Inline placement is not
deduplicated in the DOM and can affect structural selectors such as
`:first-child`; prefer head placement unless locality is useful.

`order` assigns stable precedence to named file atoms. `precedence` overrides it
for one atom. Mount and unmount timing does not change the resulting order.

## Reload and replacement

```ts
styles.reload("preview-card");

styles.replace([
  {
    file: "preview-card",
    css: nextCss,
  },
]);
```

`reload()` calls the configured loader again. `replace()` updates mounted CSS
directly, which is useful for file watchers and live preview tooling. Stale async
responses cannot overwrite a newer revision.

Use `preload()` to keep shared styles mounted without a React component:

```ts
const shellStyles = styles.preload(["reset", "tokens"]);

// Later
shellStyles.dispose();
```

Inspect a runtime without reading private state:

```ts
const report = styles.inspect();

// { namespace, atoms, entries: [{ name, status, localOwners, target, ... }] }
console.table(report.entries);
```

`localOwners` counts atoms registered with this runtime. The DOM registry may
also have owners from another store, package copy or JavaScript realm; those
internal shared owners are intentionally not added to the public inspection
API.

## Source maps

In development, styled-atom adds a stable `sourceURL` to CSS that does not
already have one. This gives each injected stylesheet a readable virtual file
such as `styled-atom/file/card.css` in browser developer tools.

A `sourceURL` names generated CSS; it is not a map back to Sass, TypeScript or
another source language. True source maps must be produced by the tool that
performed that transformation. styled-atom preserves existing
`sourceMappingURL` and `sourceURL` comments in loader results. For dynamically
injected CSS, an inline data URL with `sourcesContent` is the most portable
form because it does not depend on a separately served `.map` file:

```css
/*# sourceMappingURL=data:application/json;base64,... */
/*# sourceURL=app/styles/card.css */
```

Vite's `?inline` output gives the runtime compiled CSS text, but a production
build does not currently carry Sass source maps inside those strings. The
planned build-time transform must generate and preserve its own maps rather
than asking the runtime to reconstruct source positions.

## Server rendering

Inline atoms keep their children in server HTML. Head styles can be collected
per request:

```tsx
import { renderToString } from "react-dom/server";
import { createStyleCollector } from "styled-atom";
import { StyleCollectorProvider } from "styled-atom/react";

const collector = createStyleCollector();

const html = renderToString(
  <StyleCollectorProvider collector={collector}>
    <App />
  </StyleCollectorProvider>,
);

const styleTags = collector.getStyleTags();
```

Imported files need synchronous CSS for server output. Provide an initial style
manifest when creating the per-request store:

```tsx
import cardCss from "./styles/card.css?inline";
import tokensCss from "./styles/tokens.css?inline";

const styles = createStyledAtomStore({
  namespace: "app",
  initialStyles: {
    card: cardCss,
    tokens: tokensCss,
  },
  loader,
});
```

Use the same stable `namespace` on server and client. The browser adopts matching
server style elements instead of inserting duplicates. Create the store and
collector per request; do not share request CSS through a global server store.

If server CSS is unavailable, eager children still render with `loading` status.
Use `render="ready"` only when sending a loading fallback from the server is the
intended result.

## Core without React

```ts
import { createStyleRuntime } from "styled-atom";

const runtime = createStyleRuntime({
  loader: (name) => fetch(`/styles/${name}.css`).then((response) => {
    if (!response.ok) throw new Error(`CSS request failed: ${response.status}`);
    return response.text();
  }),
});

const atom = runtime.registerAtom({ files: ["tokens", "screen"] });

const unsubscribe = atom.subscribe(() => {
  console.log(atom.getSnapshot().status);
});

atom.dispose();
unsubscribe();
```

The core entry does not import React.

## Framework recipes

### React and Vite

Let Vite return CSS text instead of injecting it itself:

```ts
const modules = import.meta.glob("./styles/*.css", {
  query: "?inline",
  import: "default",
});

export const styles = createStyledAtomStore({
  namespace: "workspace",
  loader(name) {
    const load = modules[`./styles/${name}.css`];
    if (!load) throw new Error(`Unknown style atom: ${name}`);
    return load() as Promise<string>;
  },
});
```

### Vite SSR

Create the collector and store for each request. Insert the serialized styles
before returning the HTML:

```tsx
const collector = createStyleCollector();
const styles = createStyledAtomStore({
  namespace: "app",
  initialStyles: cssManifest,
  loader,
});

const appHtml = renderToString(
  <StyleCollectorProvider collector={collector}>
    <App styles={styles} />
  </StyleCollectorProvider>,
);

const html = template
  .replace("<!--app-->", appHtml)
  .replace("<!--styles-->", collector.getStyleTags());
```

For streaming, flush collected styles through the framework's server-style
insertion hook. Do not share a collector between requests.

### Next.js App Router

The App Router requires a Client Component registry and
`useServerInsertedHTML`. The registry can flush collected atoms into the head
during server rendering:

```tsx
"use client";

import { useState, type ReactNode } from "react";
import { useServerInsertedHTML } from "next/navigation";
import { createStyleCollector } from "styled-atom";
import { StyleCollectorProvider } from "styled-atom/react";

export function StyledAtomRegistry({ children }: { children: ReactNode }) {
  const [collector] = useState(createStyleCollector);

  useServerInsertedHTML(() => {
    const styles = collector.getStyles();
    collector.clear();
    return styles.map((style) => (
      <style
        data-styled-atom-key={style.key}
        data-styled-atom-namespace={style.namespace}
        data-styled-atom-precedence={style.precedence}
        key={`${style.namespace}:${style.key}`}
        nonce={style.nonce}
      >
        {style.css}
      </style>
    ));
  });

  return (
    <StyleCollectorProvider collector={collector}>
      {children}
    </StyleCollectorProvider>
  );
}
```

Wrap the application in the root layout. Keep store namespaces and initial CSS
manifests stable between server and client. Components using `StyledAtom` are
Client Components; Server Components can remain outside that boundary.

### Iframe preview

Resolve the target lazily because `contentDocument` may not exist on the first
render:

```tsx
const previewStyles = createStyledAtomStore({
  namespace: "preview",
  target: () => iframeRef.current?.contentDocument,
  loader,
});

// A missing target is `failed`, never a fallback into the host document.
// Retry after the iframe load event.
iframe.addEventListener("load", () => previewStyles.retry());
```

### Shadow DOM

Create one store for the root. Equal style identities in other roots remain
isolated because the registry is scoped by mount destination:

```ts
const shadowStyles = createStyledAtomStore({
  namespace: "user-card",
  target: shadowRoot,
  loader,
});
```

### React portals

Use `placement="inline"` when the style tag must travel through the portal with
its content. Prefer head placement when the portal document can be supplied as
an explicit target.

### Microfrontends

Give shared contracts a shared namespace and private styles distinct
namespaces. The registry coordinates physical package copies in one JavaScript
realm and, for a shared same-origin target, runtimes executing in different
realms such as a host window and its iframe:

```ts
const host = createStyledAtomStore({ namespace: "workspace", loader });
const plugin = createStyledAtomStore({ namespace: "plugin:charts", loader });
```

Using the same namespace and atom name declares that the CSS is the same shared
resource. Different CSS under that identity is an explicit conflict.

Cross-origin iframe DOM is not accessible to the host by browser design. Run
the iframe's style runtime inside that iframe and treat it as a separate target.

### Content Security Policy

Pass the request's style nonce to the runtime and collector. All style elements
owned by that runtime receive it:

```ts
const styles = createStyledAtomStore({ nonce: requestNonce, loader });
```

Style objects and loader results are trusted CSS. `styled-atom` is not a CSS
sanitizer: never compile or mount untrusted user input without validation.

## Troubleshooting

### The atom stays in `loading`

Check that the loader promise settles and that it returns CSS text. Use
`store.inspect()` to find the active entry and call `retry()` after a temporary
loader failure has been fixed.

### The atom is `failed` with a target error

An iframe document or ShadowRoot may not exist on the first render. Resolve the
target lazily and call `retry()` from the iframe load event. styled-atom never
falls back to the host document when an explicit target is unavailable.

### The atom is `failed` with a conflict

The same namespace, atom kind and name identify one shared CSS resource. Every
owner must agree on CSS, nonce and precedence. Give private styles a different
namespace or make the shared contract identical.

### CSS order changes unexpectedly

Declare `order` on the store or an explicit `precedence` on the atom. DOM mount
timing should not be used to express cascade order.

### Developer tools show generated CSS instead of Sass

`sourceURL` provides the virtual CSS filename. Mapping declarations back to
Sass requires a `sourceMappingURL` produced by the Sass/build pipeline and
preserved in the CSS string.

### The document has too many style elements

One unique active head atom owns one `<style>` element; many components sharing
the same atom still share a single element. Keep stable application CSS in
ordinary extracted bundles, reuse atom names and style objects, and choose an
atom granularity that follows real UI ownership. Use `store.inspect()` and the
browser Elements panel to measure the result. Avoid generating a new atom name
on every render.

For example, 1,000 components requesting `files="button"` produce one shared
entry and one `<style>`. By contrast, 1,000 simultaneously mounted atoms named
`button-1` through `button-1000` produce 1,000 entries and 1,000 style elements.
Use per-instance names only when those instances truly need different CSS.

## Tradeoffs and limits

- **Inline objects compile at runtime.** Identity caching keeps repeat work
  small, but static CSS still costs less when extracted during the build. The
  planned transform keeps runtime compilation only as the dynamic fallback.
- **Every unique active head atom owns one style element.** Shared consumers do
  not multiply elements, but thousands of unique atoms do. Keep stable bulk CSS
  in extracted files and use lifecycle atoms at meaningful UI boundaries.
- **The object compiler is intentionally smaller than a CSS parser.** Its
  supported selectors, at-rules and fallback values are tested in real browsers;
  ordinary CSS files remain the escape hatch for syntax outside that contract.
- **Cascade order is explicit.** Use `order` or `precedence`; do not rely on
  component mount timing or the order of a `files` prop.
- **True source maps come from the transforming tool.** styled-atom preserves
  map annotations but cannot reconstruct Sass or TypeScript positions at
  runtime.
- **Dynamic style insertion must satisfy the application's CSP.** Supply the
  request nonce or keep those styles in an allowed external stylesheet.

## When not to use it

Do not route all static application CSS through a runtime only for colocated
syntax. Build-time extraction and CSS Modules avoid runtime insertion and are a
better default for stable product styles.

Use `styled-atom` when style ownership actually follows dynamic UI ownership,
or when inline compilation makes a focused component, preview or tool surface
clearer.

## Migration

v4 changes package entry points, replaces `encap` with `scope`, adds explicit
failure states and makes eager content the default. See [CHANGELOG.md](./CHANGELOG.md)
for the migration examples.

If v3 code relied on the order of the `files` array or component mount timing,
move that contract to the store's `order`. Equal default precedence is sorted
by stable public identity in v4, not insertion time:

```diff
- const styles = createStyledAtomStore(loader);
+ const styles = createStyledAtomStore({
+   loader,
+   order: ["reset", "button", "page"],
+ });
```

Wrapper configuration now lives in `scope`:

```diff
- <StyledAtom
-   scope="preview-surface"
-   as="section"
-   wrapperProps={{ "aria-label": "Preview" }}
- >
+ <StyledAtom
+   scope={{
+     element: "section",
+     className: "preview-surface",
+     "aria-label": "Preview",
+   }}
+ >
```

## License

MIT
