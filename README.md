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

Imported CSS is not rewritten. `scope` adds wrapper classes, ids or attributes;
the file must target those selectors itself.

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

// { namespace, atoms, entries: [{ name, status, owners, target, ... }] }
console.table(report.entries);
```

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
namespaces. The global registry coordinates physical package copies in the same
JavaScript realm:

```ts
const host = createStyledAtomStore({ namespace: "workspace", loader });
const plugin = createStyledAtomStore({ namespace: "plugin:charts", loader });
```

Using the same namespace and atom name declares that the CSS is the same shared
resource. Different CSS under that identity is an explicit conflict.

### Content Security Policy

Pass the request's style nonce to the runtime and collector. All style elements
owned by that runtime receive it:

```ts
const styles = createStyledAtomStore({ nonce: requestNonce, loader });
```

Style objects and loader results are trusted CSS. `styled-atom` is not a CSS
sanitizer: never compile or mount untrusted user input without validation.

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

## License

MIT
