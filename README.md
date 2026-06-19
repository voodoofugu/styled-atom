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

`styled-atom` is a tiny TypeScript runtime for mounting CSS atoms only when a React preview, component or tool surface needs them.

It is designed for React demo shells, component workbenches, visual editors and render-heavy UI sandboxes: places where many small previews mount, unmount and re-render while sharing CSS files or small inline style atoms.

It is not a CSS framework. It does not create cascade layers or replace your bundler. It owns the runtime part: loading CSS by name, compiling small React-like style objects, injecting stable style tags, tracking loading state and releasing styles when nobody uses them anymore.

The idea is simple - imported CSS goes through a React-bound runtime store, while inline CSS can use `StyledAtom` directly.

<h2></h2>

### Installation

```bash
npm install styled-atom
```

```tsx
import { StyledAtom, createStyledAtomStore } from "styled-atom";
```

> **✦ Note:**
>
> - Supports both **ESM** (`import`) and **CommonJS** (`require`) builds.
> - Written in TypeScript and ships declaration files.
> - React is a peer dependency.
> - The package does not ship runtime CSS. Your project keeps ownership of CSS files and the loader function.

<h2></h2>

### API

<ul><div>

<details><summary><b><code>StyledAtom</code></b>: <em>mount inline styles or imported CSS files</em></summary><br /><ul><div>

There are two `StyledAtom` entry points:

- `import { StyledAtom } from "styled-atom"` - a standalone inline style atom. It does not need a store or loader and accepts `name` + `styles`.
- `styleAtomsStore.StyledAtom` - a store-bound style atom returned by `createStyledAtomStore`. It accepts `files` and loads CSS through the store loader.

The inline component is useful for small self-contained UI states, loaders and shell elements where the style data already lives in JS. The store-bound component is for shared CSS files, async imports, dev reload and multiple previews using the same CSS cache.

<b>Inline usage:</b><br />

```tsx
import { StyledAtom } from "styled-atom";

export function LoadingScreen() {
  return (
    <StyledAtom
      name="loading-screen"
      styles={{
        backgroundColor: "#fff",
        minHeight: "100vh",

        ".title": {
          color: "#111",
          fontWeight: 600,
        },

        "@media (max-width: 640px)": {
          padding: 16,
        },
      }}
    >
      <section>
        <h1 className="title">Loading</h1>
      </section>
    </StyledAtom>
  );
}
```

<b>Description:</b><em><br />
Mounts one inline CSS atom without creating a store. The component compiles a React-like style object into an owned <code>&lt;style&gt;</code> tag and releases it on unmount.<br />
By default the rendered content is wrapped with a class derived from <code>name</code>, so root declarations target that atom.
</em><br />

<b>Inline props:</b><br />

- `name: string` - inline atom name used for the style tag, default wrapper class and dev `sourceURL`.
- `styles: StyledAtomStylesT` - React-like CSS object.
- `encap?: boolean | string | StyleEncapT` - optional wrapper behavior for body-like preview scopes.
- `fallback?: React.ReactNode` - content rendered before the style atom is mounted.
- `onLoad?: () => void` - called once when this atom changes from loading to loaded.
- `children?: React.ReactNode` - content shown after the atom is mounted.

<br />

<b>Style object:</b><br />

```ts
import type { StyledAtomStylesT } from "styled-atom";

const styles = {
  backgroundColor: "#fff",
  color: "#111",

  "&:hover": {
    color: "#333",
  },

  "[data-state='active']": {
    color: "#000",
  },

  ".child": {
    marginTop: 12,
  },
} satisfies StyledAtomStylesT;
```

Nested selectors are resolved from the atom class. At-rules such as `@media` and `@keyframes` are supported. Numeric values receive `px` unless the CSS property is unitless.

<br />

<b>Store-bound usage:</b><br />

```tsx
const StyledAtomImport = styleAtomsStore.StyledAtom;

<StyledAtomImport
  files={["reset", "preview-card"]}
  fallback={<span>Loading...</span>}
>
  <PreviewCard />
</StyledAtomImport>
```

The store-bound component registers requested files in the shared runtime, renders `fallback` while the loader resolves them and reuses already mounted style tags with other atoms from the same store.

<b>Store-bound props:</b><br />

- `files?: string | readonly string[]` - CSS atom names passed to the configured loader.
- `encap?: boolean | string | StyleEncapT` - optional wrapper behavior.
- `fallback?: React.ReactNode` - content rendered while requested files are loading.
- `onLoad?: () => void` - called once when this atom changes from loading to loaded.
- `children?: React.ReactNode` - content shown after the requested files are loaded.

<br />

<b>Encap:</b><br />

`encap` controls only the wrapper around `children`; it does not rewrite or scope CSS selectors by itself.

- Inline `StyledAtom` enables `encap` by default and adds a class derived from `name`, so root declarations in `styles` target that wrapper.
- Store-bound `StyledAtom` does not wrap content by default. Pass `encap` when the loaded CSS expects a wrapper class, id or attribute.
- `encap={true}` adds default classes derived from `name` or `files`.
- `encap="customClass"` adds that class and the default class.
- `encap={{ className, id, attribute }}` lets you choose exact wrapper props.
- `encap={{ content: false }}` mounts styles without adding a wrapper, useful for resets, themes and other global CSS atoms.

</div></ul></details>

<h2></h2>

<details><summary><b><code>createStyledAtomStore</code></b>: <em>load CSS files through a shared runtime</em></summary><br /><ul><div>

<b>Usage:</b><br />

```tsx
import { createStyledAtomStore } from "styled-atom";

export const styleAtomsStore = createStyledAtomStore(
  (name) => import(`./styles/${name}.css`),
);

export const StyledAtomImport = styleAtomsStore.StyledAtom;
```

<b>Description:</b><em><br />
Creates one React-bound style runtime and a <code>StyledAtom</code> component bound to that runtime.<br />
Use one runtime for a shell, workspace or isolated UI surface. Every mounted atom shares the same CSS cache and loader.
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

- `StyledAtom` - React component that loads requested CSS files before rendering children.
- `configure(path)` - set or replace the CSS loader.
- `reload(files?)` - reload all or selected mounted CSS atoms through the configured loader.
- `replace(styles)` - replace mounted CSS text directly without calling the loader.
- `dispose()` - remove all style tags owned by this runtime.

<br /><b>Example:</b>

```tsx
import { StyledAtomImport } from "./styled-atom-store";

export function PreviewCard() {
  return (
    <StyledAtomImport files="preview-card" fallback={<span>Loading...</span>}>
      <article className="preview-card">Demo preview</article>
    </StyledAtomImport>
  );
}
```

</div></ul></details>

</div></ul>

<h2></h2>

### Patterns

<details><summary><b>Typed inline styles</b>: <em>keep style data outside render markup</em></summary><br />

```tsx
import { StyledAtom, type StyledAtomStylesT } from "styled-atom";

const splashStyles: StyledAtomStylesT = {
  display: "grid",
  placeItems: "center",
  minHeight: "100vh",
  backgroundColor: "#fff",

  ".logo": {
    width: 96,
  },
};

export function SplashScreen() {
  return (
    <StyledAtom name="splash-screen" styles={splashStyles}>
      <img className="logo" src="/logo.svg" alt="" />
    </StyledAtom>
  );
}
```

</details>

<details><summary><b>Shared CSS atoms</b>: <em>keep host styles mounted while a surface is mounted</em></summary><br />

```tsx
export function HostStyledShell({ children }) {
  return (
    <>
      <StyledAtomImport files={["reset", "theme"]} />
      {children}
    </>
  );
}
```

The style tags are released automatically when the `StyledAtom` unmounts and no other mounted atom uses the same files.

</details>

<details><summary><b>Dev style reload</b>: <em>replace mounted CSS without remounting previews</em></summary><br />

```tsx
// Any dev server, watcher or bundler integration
styleAtomsStore.replace([
  {
    file: changedFileName,
    css: nextCssText,
  },
]);
```

`changedFileName` and `nextCssText` usually come from a dev server, bundler plugin, file watcher or custom preview infrastructure.

Only the provided CSS atoms are replaced. Mounted React previews stay in place, and unrelated style entries are left untouched.

If CSS text is not available, ask the configured loader to fetch fresh CSS instead:

```tsx
// Reload selected mounted atoms through the configured loader.
styleAtomsStore.reload(["main", "card"]);

// Reload every currently mounted atom.
styleAtomsStore.reload();
```

</details>

<h2></h2>

### License

- [MIT](./LICENSE)
