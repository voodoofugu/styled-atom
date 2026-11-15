![styled-atom](https://raw.githubusercontent.com/voodoofugu/styled-atom/main/src/assets/banner-logo.png)

# styled-atom

Atomic style ownership for dynamic UI surfaces.

`styled-atom` lets a component declare a focused CSS atom next to the UI that
owns it. Its compiler turns a typed style object into real CSS. Its runtime
mounts that CSS, shares it between consumers, reports its state, reloads it and
removes it when the last owner disappears.

Here, **atomic** means a small unit of style ownership. It does not mean
one-property utility classes or the Atomic CSS methodology.

The library is designed for component workbenches, previews, visual editors,
route-owned styles, plugin interfaces and microfrontends. For ordinary static
application CSS, prefer CSS Modules or your bundler's extracted CSS.

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
- CSS `content` values.

Compilation is cached by style-object identity and scope. Keep reusable style
objects at module scope when possible.

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
