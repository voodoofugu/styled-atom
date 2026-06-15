![logo](https://raw.githubusercontent.com/voodoofugu/styled-atom/refs/heads/main/src/assets/banner-logo.png)

<h2></h2>

### Table of contents

- [About](#about)
- [Installation](#installation)
- [API](#api)
- [Common patterns](#common-patterns)
- [License](#license)

<h2></h2>

### About

`styled-atom` is a tiny TypeScript style runtime for loading CSS atoms only when a preview, component or tool surface needs them.

It is designed for React demo shells, component workbenches, visual editors and render-heavy UI sandboxes: places where many small previews mount, unmount and re-render while sharing the same CSS files.

It is not a CSS framework. It does not generate class names, parse styles, scope selectors for you or replace your bundler. It only owns the runtime part: loading CSS by name, injecting stable style tags, tracking loading state and releasing styles when nobody uses them anymore.

The core idea is simple - one store owns the style cache, and each rendered atom describes the CSS it needs.

<h2></h2>

### Installation

```bash
npm install styled-atom
```

```tsx
import { createStyledAtomStore } from "styled-atom";
```

> **✦ Note:**
>
> - Supports both **ESM** (`import`) and **CommonJS** (`require`) builds.
> - Exposes a React API from `styled-atom` and a framework-agnostic DOM API from `styled-atom/core`.
> - Written in TypeScript and ships declaration files.
> - React is an optional peer dependency for the React entry.
> - The package does not ship runtime CSS. Your project keeps ownership of CSS files and the loader function.

<h2></h2>

### API

<ul><div>

###### **— REACT —**

<details><summary><b><code>createStyledAtomStore</code></b>: <em>create a React-bound style atom store</em></summary><br /><ul><div>

<b>Usage:</b><br />

```tsx
import { createStyledAtomStore } from "styled-atom";

export const styleStore = createStyledAtomStore({
  path: (name) => import(`./styles/${name}.css`),
  layers: ["base", "components", "overrides"],
});

export const StyledAtom = styleStore.StyledAtom;
```

<b>Description:</b><em><br />
Creates one <code>StyledAtomStore</code> and a <code>StyledAtom</code> React component bound to that store.<br />
Use one store for a shell, workbench or isolated UI surface. Every mounted atom shares the same CSS cache, layer order and DOM target.
</em><br />

<b>Return:</b><br />
Returns an object with the raw store, the bound component and convenience methods:

```ts
const { store, StyledAtom, configure, preload, reload, replace, dispose } =
  createStyledAtomStore();
```

<b>Example:</b>

```tsx
export function PreviewCard() {
  return (
    <StyledAtom fileNames={["preview-card"]} fallback={<span>Loading...</span>}>
      <article className="preview-card">Demo preview</article>
    </StyledAtom>
  );
}
```

</div></ul></details>

<h2></h2>

<details><summary><b><code>StyledAtom</code></b>: <em>load CSS atoms before rendering children</em></summary><br /><ul><div>

<b>Usage:</b><br />

```tsx
<StyledAtom
  fileNames={["card", "theme"]}
  layer="components"
  fallback={<span>Loading...</span>}
  onLoad={() => console.log("styles loaded")}
>
  <Card />
</StyledAtom>
```

<b>Props:</b><br />

- `fileNames?: readonly string[]` - CSS atom names passed to the configured loader.
- `encap?: boolean | string | StyleEncapT` - optional wrapper behavior for body-like preview scopes.
- `layer?: string` - optional CSS cascade layer for loaded and inline CSS.
- `css?: string` - raw CSS injected before loaded CSS in the same atom.
- `fallback?: React.ReactNode` - content rendered while CSS is loading.
- `onLoad?: () => void` - called once when this atom changes from loading to loaded.
- `children?: React.ReactNode` - content shown after the atom is loaded.

<br />

<b>Description:</b><em><br />
Registers one style atom for the current React render tree. The component waits for requested CSS files, renders fallback while they load, then renders children when the atom is ready.<br />
Equivalent prop values reuse the same store state, so inline arrays or objects with the same content do not cause unnecessary DOM style churn.
</em><br />

<b>Encapsulation:</b><br />

```tsx
// Adds default classes derived from file names.
<StyledAtom fileNames={["screen-main"]} encap>
  <Screen />
</StyledAtom>

// Adds explicit wrapper classes.
<StyledAtom fileNames={["screen-main"]} encap="customClass">
  <Screen />
</StyledAtom>

// Adds structured wrapper props.
<StyledAtom
  fileNames={["screen-main"]}
  encap={{ className: "customClass", id: "preview-root" }}
>
  <Screen />
</StyledAtom>
```

`encap` only controls the rendered wrapper element. Loaded CSS is injected as raw CSS. For body-like previews, rewrite `body`, `html` and `:root` selectors during the CSS build step and add the same class/id/attribute through `encap`.

</div></ul></details>

<h2></h2>

<details><summary><b><code>createStyledAtomComponent</code></b>: <em>bind a React component to an existing core store</em></summary><br /><ul><div>

<b>Usage:</b><br />

```tsx
import { StyledAtomStore, createStyledAtomComponent } from "styled-atom";

const store = new StyledAtomStore({
  path: (name) => import(`./css/${name}.css`),
});

export const StyledAtom = createStyledAtomComponent(store);
```

<b>Description:</b><em><br />
Creates only the React component layer for a store you already own. This is useful when a project wants direct access to the framework-agnostic store but still needs the familiar React component.
</em><br />

</div></ul></details>

<h2></h2>

###### **— CORE —**

<details><summary><b><code>createStyleStore</code></b>: <em>create the framework-agnostic DOM style store</em></summary><br /><ul><div>

<b>Usage:</b><br />

```ts
import { createStyleStore } from "styled-atom/core";

const store = createStyleStore({
  path: (name) => import(`./styles/${name}.css`),
  layers: ["base", "components"],
});
```

<b>Description:</b><em><br />
Creates a <code>StyledAtomStore</code> without React. Use it from non-React tools, custom renderers, tests or integration code that wants to preload, reload, replace and dispose style atoms directly.
</em><br />

<b>Return:</b><br />
Returns a new `StyledAtomStore` instance.

</div></ul></details>

<h2></h2>

<details><summary><b><code>StyledAtomStore</code></b>: <em>own style tags, cache entries and atom snapshots</em></summary><br /><ul><div>

<b>Usage:</b><br />

```ts
import { StyledAtomStore } from "styled-atom/core";

const store = new StyledAtomStore({
  path: (name) => import(`./css/${name}.css`),
});

const atom = store.registerAtom({
  fileNames: ["reset", "theme"],
  layer: "base",
});

atom.subscribe(() => {
  console.log(atom.getSnapshot());
});

atom.dispose();
```

<b>Description:</b><em><br />
The store owns every style tag it creates. It caches style entries by file name, layer and inline CSS, keeps reference counts for mounted atoms, writes cascade layer order before generated styles, and notifies only the atoms affected by a changed style entry.
</em><br />

<b>Methods:</b><br />

- `configure(options)` - update loader, layer order, DOM target, document or nonce.
- `registerAtom(options)` - register one atom and start loading its styles.
- `preload(fileNames, options?)` - register styles without React content.
- `reload(fileNames?)` - reload all or selected registered files from the loader.
- `replace(styles)` - replace CSS text for already registered files without calling the loader.
- `dispose()` - remove all atoms and all style tags owned by the store.

</div></ul></details>

<h2></h2>

<details><summary><b><code>StyleAtomControllerT</code></b>: <em>control one registered style atom</em></summary><br /><ul><div>

<b>Shape:</b><br />

```ts
type StyleAtomControllerT = {
  id: string;
  update: (options: StyleAtomOptionsT) => void;
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => StyleAtomSnapshotT;
  reload: () => void;
  replace: (styles: readonly StyleAtomCssReplacementT[]) => void;
  dispose: () => void;
};
```

<b>Description:</b><em><br />
Returned by <code>registerAtom</code> and <code>preload</code>. Keep the controller while the styles should stay mounted. Call <code>dispose()</code> to release references and remove unused style tags.
</em><br />

</div></ul></details>

<h2></h2>

<details><summary><b><code>getStyledAtomWrapperProps</code></b>: <em>derive wrapper props from atom options</em></summary><br /><ul><div>

<b>Usage:</b><br />

```ts
const props = getStyledAtomWrapperProps(
  {
    fileNames: ["screen-main"],
    encap: { className: "customClass" },
  },
  "preview-1",
);
```

<b>Description:</b><em><br />
Normalizes <code>encap</code> and returns the wrapper props that React <code>StyledAtom</code> would use. Returns <code>null</code> when the atom does not need a wrapper.
</em><br />

</div></ul></details>

<h2></h2>

<details><summary><b><code>getStyleAtomKey</code></b>: <em>create a stable content key for atom options</em></summary><br /><ul><div>

<b>Usage:</b><br />

```ts
const key = getStyleAtomKey({
  fileNames: ["card", "theme"],
  layer: "components",
});
```

<b>Description:</b><em><br />
Returns a stable JSON key for normalized atom options. React uses this key to avoid store updates when inline arrays or objects contain the same values.
</em><br />

</div></ul></details>

<h2></h2>

</div></ul>

<h2></h2>

### Common patterns

<details><summary><b>Workbench style store</b>: <em>share one store across every preview cell</em></summary><br />

```ts
// src/styles/styledAtom.ts
import { createStyledAtomStore } from "styled-atom";

export const workbenchStyleAtoms = createStyledAtomStore({
  layers: ["workbench", "base", "demo"],
});

export const StyledAtom = workbenchStyleAtoms.StyledAtom;
```

</details>

<details><summary><b>Late loader configuration</b>: <em>create the store before the host app knows its loader</em></summary><br />

```tsx
import { useEffect } from "react";
import { workbenchStyleAtoms } from "./styledAtom";

export function DemoShell({ styleLoader }) {
  useEffect(() => {
    workbenchStyleAtoms.configure({ path: styleLoader });
  }, [styleLoader]);

  return <StyledAtom fileNames={["shell"]} />;
}
```

</details>

<details><summary><b>Cascade layer order</b>: <em>keep async CSS load timing from changing priority</em></summary><br />

```ts
const styleAtoms = createStyledAtomStore({
  path: (name) => import(`./styles/${name}.css`),
  layers: ["reset", "workbench", "host", "demo"],
});
```

Generated styles are wrapped as needed:

```css
@layer reset, workbench, host, demo;

@layer demo {
  /* loaded CSS */
}
```

</details>

<details><summary><b>Inline host CSS</b>: <em>inject variables, resets or preview wrappers without a file</em></summary><br />

```tsx
<StyledAtom
  layer="host"
  css={`
    .customClass {
      color-scheme: dark;
      min-height: 100%;
    }
  `}
/>
```

</details>

<details><summary><b>Dev style reload</b>: <em>replace mounted CSS without remounting previews</em></summary><br />

```ts
styleAtoms.replace([
  {
    fileName: "screen-main",
    css: nextCssText,
  },
]);
```

This updates already registered file atoms and leaves unrelated style entries untouched.

</details>

<details><summary><b>Preload and cleanup</b>: <em>keep shared styles mounted while a tool surface is alive</em></summary><br />

```ts
const preloaded = styleAtoms.preload(["reset", "theme"], {
  layer: "base",
});

function destroySurface() {
  preloaded.dispose();
}
```

</details>

<h2></h2>

### License

- [MIT](./LICENSE)
