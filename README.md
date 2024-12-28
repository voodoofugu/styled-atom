<div align="center" style="height: 180px;">
  <img src="https://drive.google.com/uc?export=view&id=1cTHl-bW9TSG_J1FF5D2c6qZAMtDJ8ZgF" alt="logo" width="180"/>
</div>
<h1 align="center">styled-atom</h1>

## Table of contents

- [About](#About)
- [Installation](#Installation)
- [StyleCore](#StyleCore)
- [StyledAtom](#StyledAtom)
- [More](#More)
- [API](#API)

## About

`styled-atom` is a CSS in JS React library designed for managing styles dynamically in your projects.
It allows you to load styles asynchronously, and track their state.

## Installation

Install the library using the following command:

```bash
npm install styled-atom
```

## StyleCore

`StyleCore` is the foundation of the `styled-atom` library. It initializes the system and ensures styles are properly loaded. Place this component at the root of your application.

### Props:

- **`path` (required):** A function that dynamically imports CSS files. It should return a `Promise` that resolves to the desired CSS file.
- **`watch` (optional):** If `true`, monitors the style states via `sessionStorage`.

### Example:

```typescript
import React from "react";
import { StyleCore } from "styled-atom";

const App = () => (
  <>
    <StyleCore
      watch
      path={(name: string) => import(`../src/style/css/${name}.css`)}
    />
    <YourComponent />
  </>
);
```

## StyledAtom

`StyledAtom` is used to apply styles dynamically. It can wrap your components and render them only when all the specified styles are loaded.

### Props:

- **`fileNames` (required):** An array of CSS file names to load dynamically.
- **`fallback` (optional):** A React element to render while styles are loading.
- **`onLoad` (optional):** A callback triggered when styles are loaded. Receives a boolean indicating the success of the operation.

### Example:

```typescript
import React from "react";
import { StyledAtom } from "styled-atom";

const YourComponent = () => (
  <>
    <StyledAtom
      fileNames={["your-style1", "your-style2"]}
      fallback={<div>Loading...</div>}
      onLoad={(loaded: boolean) => console.log(`Styles loaded: ${loaded}`)}
    >
      <SomeComponent />
    </StyledAtom>
  </>
);
```

## More

After the styles are loaded, you will see:

### In the Browser:

```html
<style atom="✦0" name="yourStyle1">
  /* CSS content */
</style>
<style atom="✦1" name="yourStyle2">
  /* CSS content */
</style>
```

### In sessionStorage under ✦styledAtom✦:

```
{
  "✦0": {
    "fileNames": ["your-style1"],
    "loaded": true
  },
  "✦0": {
    "fileNames": ["your-style2"],
    "loaded": true
  }
}
```

## API

- `StyleCore`: The component for initializing the library.
- `StyledAtom`: A component for creating style tags.
