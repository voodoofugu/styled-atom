# styled-atom

`styled-atom` is a tiny runtime style store for React development tools,
component workbenches and demo managers. It loads CSS atoms on demand, injects
stable style tags into the DOM, and lets each preview wait for the styles it
actually uses.

Version `3` is built around a store factory. There is no global `StyleCore`
provider and no package-level `StyledAtom` component. Create a store, export the
bound component, and use that pair inside your app or tool.

## Install

```bash
npm install styled-atom
```

For local development between sibling projects:

```json
{
  "dependencies": {
    "styled-atom": "file:../styled-atom"
  }
}
```

## Quick Start

```tsx
import { createStyledAtomStore } from "styled-atom";

export const styleAtoms = createStyledAtomStore({
  path: (name) => import(`./styles/${name}.css`),
  layers: ["base", "components", "overrides"],
});

export const StyledAtom = styleAtoms.StyledAtom;

export function PreviewCard() {
  return (
    <StyledAtom fileNames={["preview-card"]} fallback={<span>Loading...</span>}>
      <article className="preview-card">
        <h2>Demo preview</h2>
      </article>
    </StyledAtom>
  );
}
```

If the loader is only known later, create the store first and configure it from
your shell component:

```tsx
import { useEffect } from "react";
import { createStyledAtomStore } from "styled-atom";

export const styleAtoms = createStyledAtomStore();
export const StyledAtom = styleAtoms.StyledAtom;

export function DemoShell({ styleLoader }) {
  useEffect(() => {
    styleAtoms.configure({ path: styleLoader });
  }, [styleLoader]);

  return <StyledAtom fileNames={["shell"]} />;
}
```

## React Props

```ts
type StyledAtomProps = {
  fileNames?: readonly string[];
  encap?: boolean | string | StyleEncapConfig;
  layer?: string;
  vars?: Record<string, string | number | boolean | null | undefined>;
  cssVars?: Record<string, string | number | boolean | null | undefined>;
  fallback?: React.ReactNode;
  onLoad?: () => void;
  children?: React.ReactNode;
};
```

### `fileNames`

CSS atom names passed to the configured loader.

```tsx
<StyledAtom fileNames={["card", "theme"]}>
  <Card />
</StyledAtom>
```

### `encap`

Encapsulation can wrap CSS, content, or both.

```tsx
// Wraps loaded CSS as `.card { ... }` and renders a wrapper div.
<StyledAtom fileNames={["card"]} encap>
  <Card />
</StyledAtom>

// Same behavior with extra wrapper classes.
<StyledAtom fileNames={["card"]} encap="is-preview">
  <Card />
</StyledAtom>

// CSS-only wrapper. No extra content div is rendered.
<StyledAtom
  fileNames={["card"]}
  encap={{ selector: ".likeBody", content: false }}
>
  <Card />
</StyledAtom>
```

The css-only form is useful for `demo-workbench` and similar tools where the
preview body already owns the wrapper element.

### `layer`

Wraps generated CSS in a cascade layer.

```tsx
<StyledAtom fileNames={["button"]} layer="components">
  <Button />
</StyledAtom>
```

Generated shape:

```css
@layer base, components, overrides;

@layer components {
  /* loaded CSS */
}
```

Declare layer order once when the store is created:

```ts
const styleAtoms = createStyledAtomStore({
  path: (name) => import(`./styles/${name}.css`),
  layers: ["workbench", "host", "demo"],
});
```

The store writes that order before atom style tags, so async CSS loads do not
accidentally define layer priority by load timing.

### `vars` / `cssVars`

Injects CSS custom properties before the loaded CSS. Keys may be passed with or
without the `--` prefix.

```tsx
<StyledAtom
  fileNames={["theme"]}
  encap
  vars={{
    accent: "#6366f1",
    "--radius": "8px",
  }}
>
  <Demo />
</StyledAtom>
```

With `encap`, variables are scoped to the same selector as the CSS. Without
`encap`, variables are written to `:root`.

## Framework-Agnostic Core

Use `styled-atom/core` when you want the DOM style manager without React.

```ts
import { createStyleStore } from "styled-atom/core";

const store = createStyleStore({
  path: (name) => import(`./styles/${name}.css`),
});

const controller = store.preload(["reset", "theme"], {
  layer: "base",
  vars: { accent: "#0f766e" },
});

controller.subscribe(() => {
  const snapshot = controller.getSnapshot();
  console.log(snapshot.loaded);
});

controller.dispose();
```

## Performance Model

`styled-atom` keeps one store-owned cache of style entries:

- each rendered atom registers its own id;
- style tags are cached by `fileName + encap + layer + vars`;
- each style tag has a reference count;
- equivalent React re-renders do not touch the DOM;
- updating one atom notifies only subscribers for that atom.

This is designed for demo managers where many preview cells mount, unmount and
re-render while sharing the same CSS atoms.

## Demo Workbench Recipe

```ts
// src/styles/styledAtom.ts
import { createStyledAtomStore } from "styled-atom";

export const workbenchStyleAtoms = createStyledAtomStore({
  layers: ["workbench", "host", "demo"],
});
export const StyledAtom = workbenchStyleAtoms.StyledAtom;
```

```tsx
// Shell
useEffect(() => {
  workbenchStyleAtoms.configure({ path: loadStyle });
}, [loadStyle]);
```

```tsx
// Demo cell
<StyledAtom
  fileNames={stableCssFiles}
  fallback={<Loading />}
  layer="demo"
  encap={{ selector: ".likeBody", content: false }}
>
  {body}
</StyledAtom>
```

For host/base styles:

```tsx
<StyledAtom fileNames={["workbench"]} layer="workbench" />
<StyledAtom fileNames={["output"]} layer="host" />
```

## Public Exports

```ts
export {
  createStyledAtomStore,
  createStyledAtomComponent,
  createStyleStore,
  StyledAtomStore,
  getStyleAtomKey,
  getStyledAtomWrapperProps,
  normalizeStyleAtomOptions,
};
```
