![logo](https://raw.githubusercontent.com/voodoofugu/styled-atom/refs/heads/main/src/assets/banner-logo.png)

<h2></h2>

### Table of contents

- [About](#about)
- [Installation](#installation)
- [API](#api)
- [Patterns](#patterns)
- [License](#license)

<h2></h2>

### About

`styled-atom` is a tiny TypeScript runtime for loading CSS atoms only when a React preview, component or tool surface needs them.

It is designed for React demo shells, component workbenches, visual editors and render-heavy UI sandboxes: places where many small previews mount, unmount and re-render while sharing the same CSS files.

It is not a CSS framework. It does not generate class names, parse styles, scope selectors for you, create cascade layers or replace your bundler. It only owns the runtime part: loading CSS by name, injecting stable style tags, tracking loading state and releasing styles when nobody uses them anymore.

The idea is simple - one React-bound runtime owns the style cache, and each rendered atom describes the CSS files it needs.

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
> - Exposes a React API from `styled-atom`.
> - Written in TypeScript and ships declaration files.
> - React is a peer dependency.
> - The package does not ship runtime CSS. Your project keeps ownership of CSS files and the loader function.

<h2></h2>

### API

<ul><div>

<details><summary><b><code>createStyledAtomStore</code></b>: <em>create a React-bound style atom runtime</em></summary><br /><ul><div>

<b>Usage:</b><br />

```tsx
import { createStyledAtomStore } from "styled-atom";

export const styleAtomsStore = createStyledAtomStore(
  (name) => import(`./styles/${name}.css`),
);

export const StyledAtom = styleAtomsStore.StyledAtom;
```

<b>Description:</b><em><br />
Creates one React-bound style runtime and a <code>StyledAtom</code> component bound to that runtime.<br />
Use one runtime for a shell, workbench or isolated UI surface. Every mounted atom shares the same CSS cache and loader.
</em><br />

<b>Loader:</b><br />

```ts
type ImportStyleResultT =
  | string
  | { default?: unknown }
  | null
  | undefined
  | void;

type ImportStyleT = (
  fileName: string,
) => ImportStyleResultT | Promise<ImportStyleResultT>;
```

<b>Return:</b><br />
Returns the bound component and a small runtime control surface:

```ts
const { StyledAtom, configure, reload, replace, dispose } =
  createStyledAtomStore();
```

- `StyledAtom` - React component that loads requested CSS before rendering children.
- `configure(path)` - set or replace the CSS loader.
- `reload(fileNames?)` - reload all or selected mounted CSS atoms through the configured loader.
- `replace(styles)` - replace mounted CSS text directly without calling the loader.
- `dispose()` - remove all style tags owned by this runtime.

<br />
<b>Example:</b>

```tsx
import { StyledAtom } from "./styled-atom-store";

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
  fallback={<span>Loading...</span>}
  onLoad={() => console.log("styles loaded")}
>
  <Card />
</StyledAtom>
```

<b>Props:</b><br />

- `fileNames?: readonly string[]` - CSS atom names passed to the configured loader.
- `encap?: boolean | string | StyleEncapT` - optional wrapper behavior for body-like preview scopes.
- `fallback?: React.ReactNode` - content rendered while CSS is loading.
- `onLoad?: () => void` - called once when this atom changes from loading to loaded.
- `children?: React.ReactNode` - content shown after the atom is loaded.

<br />

<b>Description:</b><em><br />
Registers one style atom for the current React render tree. The component waits for requested CSS files, renders fallback while they load, then renders children when the atom is ready.<br />
Equivalent prop values reuse the same runtime state, so inline arrays or objects with the same content do not cause unnecessary DOM style churn.
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
  encap={{
    className: "customClass",
    id: "preview-root",
    attribute: { "workbench-scope": "" },
  }}
>
  <Screen />
</StyledAtom>
```

`encap` only controls the rendered wrapper element. Loaded CSS is injected as raw CSS. For body-like previews, rewrite `body`, `html` and `:root` selectors during the CSS build step and add the same class/id/attribute through `encap`.

</div></ul></details>

<h2></h2>

<details><summary><b><code>ReactStyledAtomStoreT</code></b>: <em>runtime returned by <code>createStyledAtomStore</code></em></summary><br /><ul><div>

<b>Shape:</b><br />

```ts
type ReactStyledAtomStoreT = {
  StyledAtom: React.FC<StyledAtomT>;
  configure: (path?: ImportStyleT) => void;
  reload: (fileNames?: readonly string[]) => void;
  replace: (styles: readonly StyleAtomCssReplacementT[]) => void;
  dispose: () => void;
};
```

<b>Description:</b><em><br />
This is the whole public runtime object. It keeps the user-facing API small: configure a CSS loader, render <code>StyledAtom</code>, and optionally refresh mounted CSS during development.
</em><br />

</div></ul></details>

<h2></h2>

</div></ul>

<h2></h2>

### Patterns

<details><summary><b>Workbench style runtime</b>: <em>share one runtime across every preview cell</em></summary><br />

```ts
import { createStyledAtomStore } from "styled-atom";

export const styleAtomsStore = createStyledAtomStore(
  (name) => import(`./workbench-css/${name}.css`),
);

export const StyledAtom = styleAtomsStore.StyledAtom;
```

</details>

<details><summary><b>Shared CSS atoms</b>: <em>keep host styles mounted while a surface is mounted</em></summary><br />

```tsx
export function WorkbenchSurface({ children }) {
  return (
    <>
      <StyledAtom fileNames={["reset", "theme"]} />
      {children}
    </>
  );
}
```

The style tags are released automatically when the `StyledAtom` unmounts and no other mounted atom uses the same files.

</details>

<details><summary><b>Dev style reload</b>: <em>replace mounted CSS without remounting previews</em></summary><br />

The dev server can compile changed CSS to a string and pass it to `replace`. The mounted React preview stays in place; only the owned `<style>` text changes.
Both examples expect the CSS import to return text: Vite uses `?raw`, and Webpack can use `asset/source` or `raw-loader`.

<b>Vite:</b><br />

```ts
import { styleAtomsStore } from "./styledAtom";

if (import.meta.hot) {
  import.meta.hot.accept("./workbench-css/screen-main.css?raw", (mod) => {
    if (!mod?.default) return;

    styleAtomsStore.replace([
      { fileName: "screen-main", css: String(mod.default) },
    ]);
  });
}
```

<b>Webpack:</b><br />

```ts
import { styleAtomsStore } from "./styledAtom";

if (module.hot) {
  module.hot.accept("./workbench-css/screen-main.css", () => {
    const css = require("./workbench-css/screen-main.css").default;

    styleAtomsStore.replace([{ fileName: "screen-main", css: String(css) }]);
  });
}
```

<b>Any dev server:</b><br />

```ts
styleAtomsStore.replace([
  {
    fileName: "screen-main",
    css: nextCssText,
  },
]);
```

This updates already mounted CSS atoms and leaves unrelated style entries untouched. If replacement text is not available, call `styleAtomsStore.reload(["screen-main"])` to ask the configured loader for fresh CSS.

</details>

<h2></h2>

### License

- [MIT](./LICENSE)
