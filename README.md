![logo](https://raw.githubusercontent.com/voodoofugu/styled-atom/refs/heads/main/src/assets/banner-logo.png)

### About

`styled-atom` is a tiny React runtime for loading CSS files only when a preview, component or workbench cell needs them.

It does not generate CSS, scope selectors, create cascade layers or replace your bundler. Your project keeps CSS in CSS files. `styled-atom` only handles the runtime part: load CSS by name, inject stable `<style>` tags, share them between mounted React atoms and remove them when nobody uses them anymore.

### Installation

```bash
npm install styled-atom
```

### API

#### `createStyledAtomStore(path?)`

Creates one style runtime and a React component bound to it.

```tsx
import { createStyledAtomStore } from "styled-atom";

export const styleAtoms = createStyledAtomStore((name) =>
  import(`./styles/${name}.css`),
);

export const StyledAtom = styleAtoms.StyledAtom;
```

The loader receives a CSS atom name and should return CSS text, a CSS module result with `default`, or a promise for either value.

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

Returned runtime:

```ts
const { StyledAtom, configure, reload, replace, dispose } =
  createStyledAtomStore();
```

- `StyledAtom` - React component that loads requested CSS before rendering children.
- `configure(path)` - sets or replaces the CSS loader.
- `reload(fileNames?)` - reloads mounted CSS atoms through the loader.
- `replace(styles)` - replaces mounted CSS text directly, useful for dev style reload.
- `dispose()` - removes all style tags owned by this runtime.

#### `StyledAtom`

```tsx
<StyledAtom
  fileNames={["card", "theme"]}
  fallback={<span>Loading...</span>}
  onLoad={() => console.log("styles loaded")}
>
  <Card />
</StyledAtom>
```

Props:

- `fileNames?: readonly string[]` - CSS atom names passed to the configured loader.
- `encap?: boolean | string | StyleEncapT` - optional wrapper for body-like preview scopes.
- `fallback?: React.ReactNode` - content rendered while CSS is loading.
- `onLoad?: () => void` - called once when this atom changes from loading to loaded.
- `children?: React.ReactNode` - content shown after the atom is loaded.

When `fileNames` is empty, `StyledAtom` simply renders `children` or `fallback`.

#### `encap`

`encap` only controls the rendered wrapper. Loaded CSS is inserted as raw CSS.

```tsx
<StyledAtom fileNames={["screen-main"]} encap>
  <Screen />
</StyledAtom>

<StyledAtom fileNames={["screen-main"]} encap="customClass">
  <Screen />
</StyledAtom>

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

For body-like previews, rewrite `body`, `html` and `:root` selectors during your CSS build step and add the same class, id or attribute through `encap`.

### Patterns

#### Late Loader Configuration

Useful when the runtime is created outside React, but the host app provides the loader later.

```tsx
// styles.ts
import { createStyledAtomStore } from "styled-atom";

export const styleAtoms = createStyledAtomStore();
export const StyledAtom = styleAtoms.StyledAtom;
```

```tsx
// Shell.tsx
import { useEffect } from "react";
import { styleAtoms, StyledAtom } from "./styles";

export function Shell({ styleLoader }) {
  useEffect(() => {
    styleAtoms.configure(styleLoader);
  }, [styleLoader]);

  return (
    <StyledAtom fileNames={["shell"]}>
      <main />
    </StyledAtom>
  );
}
```

#### Dev Style Reload

```ts
styleAtoms.replace([
  {
    fileName: "screen-main",
    css: nextCssText,
  },
]);
```

This updates already mounted CSS atoms without remounting React content. If replacement text is not available, call `styleAtoms.reload(["screen-main"])` to ask the configured loader for fresh CSS.

#### Cascade Layers

Keep cascade layers in CSS files:

```css
@layer reset, workbench, host, demo;

@layer demo {
  .preview-card {
    color: CanvasText;
  }
}
```

`styled-atom` does not declare or wrap layers at runtime.

### License

[MIT](./LICENSE)
