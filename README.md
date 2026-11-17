![logo](https://raw.githubusercontent.com/voodoofugu/styled-atom/refs/heads/main/src/assets/banner-logo.png)

<h2></h2>

### Table of contents

- [About](#about)
- [Installation](#installation)
- [API](#api)
- [Patterns](#patterns)
- [Framework recipes](#framework-recipes)
- [Troubleshooting](#troubleshooting)
- [License](#license)

<h2></h2>

### About

`styled-atom` is a small TypeScript runtime for mounting CSS only while a component, preview or tool surface needs it.

It loads ordinary CSS files by name or compiles focused inline style objects, shares mounted styles between consumers, exposes their lifecycle and removes them after the last owner disappears.

The library is useful in component workbenches, visual editors, previews, route-owned interfaces, portals, iframes and microfrontends. It works alongside CSS Modules, global styles and extracted bundles: traditional CSS can remain in the application shell while `styled-atom` owns dynamic UI surfaces.

Here, **atomic** means a small unit of style ownership. It does not mean one-property utility classes or the Atomic CSS methodology.

<h2></h2>

### Installation

```bash
npm install styled-atom
```

```tsx
import { createStyleRuntime } from "styled-atom";
import { StyledAtom, createStyledAtomStore } from "styled-atom/react";
```

> **✦ Note:**
>
> - Supports both **ESM** (`import`) and **CommonJS** (`require`) builds.
> - Written in TypeScript and ships declaration files with JSDoc.
> - React is an optional peer dependency.
> - The root entry is framework-agnostic; React APIs live in `styled-atom/react`.
> - The package does not ship runtime CSS. Your project keeps ownership of CSS files and loader functions.

<h2></h2>

### API

<ul><div>

<details><summary><b><code>StyledAtom</code></b>: <em>mount inline styles or imported CSS files</em></summary><br /><ul><div>

There are two React entry points:

- `StyledAtom` from `styled-atom/react` mounts one standalone inline style atom.
- `store.StyledAtom` is bound to the loader and configuration of `createStyledAtomStore`.

<h2></h2>

<details><summary><b>Inline usage</b>: <em>compile one focused style object</em></summary><br />

<b>Description:</b><em><br />
Compiles a typed stylesheet object into an owned <code>&lt;style&gt;</code> element and releases it on unmount. It does not render a wrapper unless <code>scope</code> is provided.
</em><br />

<b>Props:</b><br />

- `name: string` - stable atom name, default root selector and development `sourceURL`.
- `style: StyledAtomStyles` - declarations, nested selectors and at-rules.
- `scope?: boolean | string | StyleScopeOptions` - optional wrapper and selector boundary.
- `placement?: "head" | "inline"` - style element destination relative to the component.
- `target?: Document | ShadowRoot | HTMLElement | (() => target)` - optional mount target.
- `render?: "eager" | "ready"` - whether children wait for CSS.
- `fallback`, `errorFallback` - loading and failed content.
- `onStatusChange`, `onReady`, `onError` - lifecycle callbacks.
- `children` - content or a render function receiving status, errors and `retry()`.

<br />

<b>Example:</b><br />

```tsx
import { StyledAtom, type StyledAtomStyles } from "styled-atom/react";

const style = {
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
    <StyledAtom name="preview-card" scope style={style}>
      <h2 className="title">Preview</h2>
    </StyledAtom>
  );
}
```

<b>Style object:</b><br />

The compiler supports camelCase declarations, CSS custom properties, numeric `px` conversion, selector lists, `&`, media/supports/container/layer rules, keyframes, `@font-face`, `@page` and fallback declaration arrays.

Without `scope`, root declarations compile against `.${name}` and that class belongs on your markup. `scope={true}` creates a wrapper with the atom name. A string supplies another class. The object form keeps the element and its attributes in the same prop:

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

The wrapper exposes `loading`, `ready` or `failed` through `data-styled-atom-status`.

</details>

<h2></h2>

<details><summary><b>Store-bound usage</b>: <em>load and share CSS files</em></summary><br />

<b>Description:</b><em><br />
Registers requested CSS files in a shared runtime. Equal file identities share one head style element and one reference count.
</em><br />

<b>Example:</b><br />

```tsx
<styles.StyledAtom
  files={["tokens", "preview-card"]}
  scope="preview-surface"
  fallback={<span>Loading…</span>}
  errorFallback={({ retry }) => (
    <button type="button" onClick={retry}>Retry styles</button>
  )}
>
  {({ status }) => <PreviewCard status={status} />}
</styles.StyledAtom>
```

Imported CSS is not rewritten. It must contain any selector used by its scope wrapper.

</details>

</div></ul></details>

<h2></h2>

<details><summary><b><code>createStyledAtomStore</code></b>: <em>bind the runtime to React</em></summary><br /><ul><div>

<b>Description:</b><em><br />
Creates one React-bound runtime and a typed <code>StyledAtom</code> component. Use one store for a shell, workspace or isolated UI surface.
</em><br />

<b>Example:</b><br />

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

Vite's ordinary `.css` import injects CSS itself. Use `?inline` when the store should receive and own the CSS text.

<b>Return:</b><br />

- `StyledAtom` - component bound to this store.
- `configure(options)` - update loader, target, placement, nonce, order or `sourceURL` defaults.
- `preload(files)` - keep shared styles mounted without a component.
- `reload(files?)` - call the loader again for mounted files.
- `replace(styles)` - update mounted CSS without calling the loader.
- `retry(id?)` - retry failed atoms.
- `inspect()` - read lifecycle, ownership, target, precedence and CSS-size diagnostics.
- `dispose()` - release every atom owned by the store.

</div></ul></details>

<h2></h2>

<details><summary><b><code>createStyleRuntime</code></b>: <em>use the lifecycle without React</em></summary><br /><ul><div>

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

The core entry does not import React. Framework adapters only need to register after mount and dispose on unmount.

</div></ul></details>

<h2></h2>

<details><summary><b><code>compileStyleAtomStyles</code></b>: <em>compile a stylesheet object without mounting it</em></summary><br /><ul><div>

```ts
import { compileStyleAtomStyles } from "styled-atom";

const css = compileStyleAtomStyles("preview-card", {
  display: "grid",
  gap: 12,
  ".title": { fontWeight: 700 },
});
```

The first argument is the root class name. `compileStyles` is an alias for the same compiler.

</div></ul></details>

<h2></h2>

<details><summary><b><code>createStyleCollector</code></b>: <em>collect head styles during SSR</em></summary><br /><ul><div>

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

Create the collector and store per request. Keep the namespace and initial manifest stable on the client so matching server style elements are adopted instead of duplicated.

</div></ul></details>

</div></ul>

<h2></h2>

### Patterns

<details><summary><b>Typed inline styles</b>: <em>keep style data outside render markup</em></summary><br />

```tsx
import { StyledAtom, type StyledAtomStyles } from "styled-atom/react";

const splashStyle: StyledAtomStyles = {
  display: "grid",
  placeItems: "center",
  minHeight: "100vh",
  backgroundColor: "#fff",
  ".logo": { width: 96 },
};

export function SplashScreen() {
  return (
    <StyledAtom name="splash-screen" scope style={splashStyle}>
      <img className="logo" src="/logo.svg" alt="" />
    </StyledAtom>
  );
}
```

Reusable style objects should remain immutable. Compilation is cached by object identity and scope.

</details>

<details><summary><b>Shared CSS atoms</b>: <em>keep shell styles mounted while they are needed</em></summary><br />

```tsx
export function HostStyledShell({ children }) {
  return (
    <styles.StyledAtom files={["reset", "theme"]}>
      {children}
    </styles.StyledAtom>
  );
}
```

Many consumers of the same identity still produce one head `<style>`. Many unique active identities produce many elements, so stable application CSS can stay in ordinary extracted bundles.

</details>

<details><summary><b>Lifecycle and recovery</b>: <em>make loading and failures explicit</em></summary><br />

Every atom is `loading`, `ready` or `failed`. Children render eagerly by default. Passing `fallback`, or setting `render="ready"`, waits for CSS. Loader, target and ownership failures remain retryable.

Use `onStatusChange`, `onReady` and `onError` for external reporting. Scoped wrappers expose the same state as `data-styled-atom-status`.

</details>

<details><summary><b>Portals, iframes and Shadow DOM</b>: <em>mount CSS into the correct document</em></summary><br />

```tsx
const previewStyles = createStyledAtomStore({
  namespace: "preview",
  target: () => iframeRef.current?.contentDocument,
  loader,
});

iframe.addEventListener("load", () => previewStyles.retry());
```

`target` accepts a `Document`, `ShadowRoot`, element or lazy callback. A missing explicit target fails safely instead of leaking CSS into the host document.

Use `placement="inline"` when the style tag must travel through a React portal with its content. Prefer head placement when the destination document can be supplied as a target.

</details>

<details><summary><b>Cascade and microfrontends</b>: <em>keep ordering and ownership deterministic</em></summary><br />

Use `order` on the store or `precedence` on one atom. Component mount timing and the order of a `files` array do not define the cascade.

Equal namespaces and names declare one shared CSS resource across stores and physical package copies. Incompatible CSS, nonce or precedence becomes a `failed` conflict instead of overwriting another owner. Use separate namespaces for private microfrontend styles.

</details>

<details><summary><b>Development reload</b>: <em>update CSS without remounting previews</em></summary><br />

```ts
styles.replace([{ file: changedFileName, css: nextCssText }]);
styles.reload(["main", "card"]);
```

`replace()` updates CSS directly. `reload()` asks the loader for fresh CSS. Stale async responses cannot overwrite a newer revision.

Development and test builds also add a readable `sourceURL`. Production omits generated URLs. Set `sourceURL: true` or `false` to override the environment default. Existing `sourceURL` and `sourceMappingURL` comments are preserved.

</details>

<details><summary><b>Content Security Policy</b>: <em>apply a nonce to dynamic style elements</em></summary><br />

```ts
const styles = createStyledAtomStore({ nonce: requestNonce, loader });
```

Style objects and loader results are trusted CSS. Validate untrusted input before compiling or mounting it.

</details>

<h2></h2>

### Framework recipes

<details><summary><b>Vue</b>: <em>bind the core runtime to component lifecycle</em></summary><br />

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

<details><summary><b>Svelte</b>: <em>return cleanup from <code>onMount</code></em></summary><br />

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

<details><summary><b>Solid</b>: <em>release the atom from the cleanup scope</em></summary><br />

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

<h2></h2>

### Troubleshooting

<details><summary><b>The atom stays in <code>loading</code></b></summary><br />

Check that the loader settles and returns CSS text. Use `inspect()` to find the active entry.

</details>

<details><summary><b>The atom fails with a target error</b></summary><br />

Resolve iframe and Shadow DOM targets lazily, then call `retry()` when the target exists. An explicit missing target never falls back to the host document.

</details>

<details><summary><b>The atom fails with a conflict</b></summary><br />

Every owner of the same namespace, kind and name must agree on CSS, nonce and precedence. Change the namespace or make the shared contract identical.

</details>

<details><summary><b>Developer tools show generated CSS instead of Sass</b></summary><br />

`sourceURL` names generated CSS. Mapping declarations back to Sass requires a `sourceMappingURL` produced by the Sass or build pipeline and preserved in the CSS string.

</details>

<h2></h2>

### License

- [MIT](./LICENSE)
