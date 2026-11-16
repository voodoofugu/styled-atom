![styled-atom](https://raw.githubusercontent.com/voodoofugu/styled-atom/main/src/assets/banner-logo.png)

# styled-atom

CSS that appears and disappears with your UI.

`styled-atom` mounts regular CSS files or compiles a focused inline style when
a UI surface needs it. Styles are shared between consumers and removed after
the last owner disappears.

Here, **atomic** means a small unit of style ownership, not utility classes.
Use the library alongside CSS Modules, global styles or extracted bundles and
introduce it only where CSS ownership follows dynamic UI.

## Install

```bash
npm install styled-atom
```

React is optional. React APIs live in `styled-atom/react`; the root entry
contains the framework-agnostic runtime and compiler.

## Inline styles

```tsx
import { StyledAtom, type StyledAtomStyles } from "styled-atom/react";

const style = {
  display: "grid",
  gap: 12,
  padding: 20,
  borderRadius: 16,
  background: "#111827",
  color: "white",

  ".title": { margin: 0, fontSize: 20 },
  "&:hover": { background: "#172033" },
  "@media (width < 40rem)": { padding: 14 },
} satisfies StyledAtomStyles;

export function PreviewCard() {
  return (
    <StyledAtom name="preview-card" scope style={style}>
      <h2 className="title">Preview</h2>
    </StyledAtom>
  );
}
```

`style` accepts declarations, nested selectors and at-rules. `scope` adds a
wrapper, uses its class as the root selector and exposes lifecycle state through
`data-styled-atom-status`.

<details>
<summary><b>Scope wrapper</b></summary>

Use a string for a custom class or an object for the element and its attributes:

```tsx
<StyledAtom
  name="preview-card"
  style={style}
  scope={{
    element: "section",
    className: "preview-surface",
    "aria-label": "Card preview",
  }}
>
  <PreviewCard />
</StyledAtom>
```

Without `scope`, the root selector is `.preview-card`; add that class to your
own markup when root declarations should apply.

</details>

<details>
<summary><b>Compiler contract</b></summary>

The compiler supports camelCase declarations, custom properties, numeric `px`
conversion, selector lists, `&`, media/supports/container/layer rules,
keyframes, `@font-face`, `@page` and fallback declaration arrays.

```ts
const color = {
  display: ["-webkit-box", "flex"],
  color: ["#0969da", "oklch(55% 0.2 250)"],
} satisfies StyledAtomStyles;
```

Output is flat CSS. Native CSS Nesting is not part of the v4 contract.
Compilation is cached by style-object identity and scope, so reusable objects
should stay immutable. Development detects mutations and recompiles; production
keeps the faster identity cache.

Inline objects compile at runtime. A future build transform may precompile
static objects while preserving this JSX syntax and keeping dynamic values as
the runtime fallback.

</details>

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
  namespace: "workspace",
  order: ["reset", "tokens", "preview-card"],
  loader(name) {
    const load = modules[`./styles/${name}.css`];
    if (!load) throw new Error(`Unknown style atom: ${name}`);
    return load() as Promise<string>;
  },
});
```

```tsx
<styles.StyledAtom files={["tokens", "preview-card"]} scope>
  <PreviewCard />
</styles.StyledAtom>
```

Use Vite's `?inline` query so `styled-atom`, rather than Vite, owns injection.
Imported CSS is not rewritten. A file must contain any selector used by its
scope wrapper.

## Lifecycle

Every atom is `loading`, `ready` or `failed`:

```tsx
<styles.StyledAtom
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
</styles.StyledAtom>
```

Children render while files load. Passing `fallback`, or `render="ready"`,
waits for CSS. Use `onStatusChange`, `onReady` and `onError` for reporting.

## Placement and targets

Head placement is the default. Equal style identities share one `<style>` and
one reference count, including across stores and physical package copies.
Identity conflicts become `failed` instead of overwriting another owner.

```tsx
const styles = createStyledAtomStore({
  namespace: "preview",
  target: () => iframeRef.current?.contentDocument,
  nonce: requestNonce,
  loader,
});
```

`target` accepts a `Document`, `ShadowRoot`, element or lazy callback. A missing
explicit target fails safely; call `retry()` when an iframe or portal target is
ready.

<details>
<summary><b>Inline placement and portals</b></summary>

Use inline placement when a style tag should travel through a portal with its
content:

```tsx
createPortal(
  <StyledAtom name="portal-card" placement="inline" style={portalStyle}>
    <PortalCard />
  </StyledAtom>,
  portalRoot,
);
```

Inline styles are local but not DOM-deduplicated. Prefer head placement unless
locality is required.

</details>

<details>
<summary><b>Ordering and microfrontends</b></summary>

Use `order` on the store or `precedence` on one atom. Mount timing and the order
of a `files` array do not define the cascade.

Use a shared namespace for shared CSS contracts and distinct namespaces for
private microfrontend styles. Same-origin iframe runtimes can coordinate through
the target document; cross-origin iframes need their own runtime.

</details>

## Runtime commands

```ts
styles.reload("preview-card");
styles.replace([{ file: "preview-card", css: nextCss }]);

const shell = styles.preload(["reset", "tokens"]);
const report = styles.inspect();

shell.dispose();
```

- `reload()` calls the loader again;
- `replace()` updates mounted CSS without a loader round trip;
- `preload()` keeps shared styles mounted without a component;
- `inspect()` returns public lifecycle and ownership diagnostics;
- `retry()` retries failed atoms.

Stale async responses cannot replace a newer revision.

## Source maps

Development and test builds add a stable `sourceURL` when CSS does not already
have one. Production omits generated URLs. Set `sourceURL: true` or `false` to
override that default.

`sourceURL` gives injected CSS a readable virtual filename. A real map back to
Sass or another source must come from that transformer. Existing `sourceURL`
and `sourceMappingURL` comments are preserved.

## Server rendering

Create the collector and store per request. Initial CSS must be synchronous:

```tsx
const collector = createStyleCollector();
const styles = createStyledAtomStore({
  namespace: "app",
  initialStyles: cssManifest,
  loader,
});

const app = renderToString(
  <StyleCollectorProvider collector={collector}>
    <App />
  </StyleCollectorProvider>,
);

const styleTags = collector.getStyleTags();
```

Keep the namespace and manifest stable on the client so it adopts server style
elements instead of inserting duplicates.

<details>
<summary><b>Next.js App Router</b></summary>

Use a Client Component registry with `useServerInsertedHTML`. Keep one collector
per request, call `getStyles()`, render the returned entries as `<style>` nodes,
then call `clear()`. Wrap client components using `StyledAtom` in the matching
`StyleCollectorProvider`.

</details>

## Core API

The root entry has no React dependency:

```ts
import { createStyleRuntime } from "styled-atom";

const runtime = createStyleRuntime({ loader });
const atom = runtime.registerAtom({ files: ["tokens", "screen"] });

const unsubscribe = atom.subscribe(() => {
  console.log(atom.getSnapshot().status);
});

atom.dispose();
unsubscribe();
```

## Troubleshooting

<details>
<summary><b>The atom stays in <code>loading</code></b></summary>

Check that the loader settles and returns CSS text. Use `inspect()` to find the
active entry.

</details>

<details>
<summary><b>The atom fails with a target error</b></summary>

Resolve iframe and Shadow DOM targets lazily, then call `retry()` when the target
exists. An explicit missing target never falls back to the host document.

</details>

<details>
<summary><b>The atom fails with a conflict</b></summary>

Every owner of the same namespace, kind and name must agree on CSS, nonce and
precedence. Change the namespace or make the shared contract identical.

</details>

<details>
<summary><b>The document has many style elements</b></summary>

Many consumers of one atom still produce one head `<style>`. Many unique active
atoms produce many elements. Reuse stable names and style objects, and keep bulk
application CSS in ordinary bundles.

</details>

## Tradeoffs

- inline objects compile at runtime, with identity caching for repeat work;
- each unique active head atom owns one style element;
- the object compiler covers focused styling, while CSS files remain the escape
  hatch for syntax outside its contract;
- cascade order is explicit through `order` and `precedence`;
- dynamic insertion must satisfy the application's CSP through a nonce or an
  allowed stylesheet policy.

These costs stay local: stable application CSS can remain in traditional
bundles while `styled-atom` manages only dynamic surfaces.

## Framework recipes

Every framework uses the same core lifecycle: register after mount, subscribe
when UI needs state, and dispose on unmount.

```ts
import { createStyleRuntime } from "styled-atom";

export const runtime = createStyleRuntime({ loader });
```

<details>
<summary><b>React and Vite</b></summary>

Use `createStyledAtomStore` and load CSS as text with `?inline`. The returned
`StyledAtom` component owns registration and cleanup.

</details>

<details>
<summary><b>Vue</b></summary>

```ts
import { onMounted, onUnmounted } from "vue";
import type { StyleAtomController } from "styled-atom";
import { runtime } from "./styles";

let atom: StyleAtomController | undefined;

onMounted(() => {
  atom = runtime.registerAtom({ files: "preview-card" });
});

onUnmounted(() => atom?.dispose());
```

</details>

<details>
<summary><b>Svelte</b></summary>

```svelte
<script lang="ts">
  import { onMount } from "svelte";
  import { runtime } from "./styles";

  onMount(() => {
    const atom = runtime.registerAtom({ files: "preview-card" });
    return () => atom.dispose();
  });
</script>
```

</details>

<details>
<summary><b>Solid</b></summary>

```tsx
import { onCleanup, onMount } from "solid-js";
import type { StyleAtomController } from "styled-atom";
import { runtime } from "./styles";

let atom: StyleAtomController | undefined;

onMount(() => {
  atom = runtime.registerAtom({ files: "preview-card" });
});

onCleanup(() => atom?.dispose());
```

</details>

## License

MIT
