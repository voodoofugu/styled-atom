<div align="center">
  <img src="https://drive.google.com/uc?export=view&id=1zaKS3ZOVpeVEY2xcwZmUhdYuRBGBzZRR" alt="logo"/>
</div>

## ✦Table of contents

- [About](#about)
- [Installation](#installation)
- [StyleCore](#stylecore)
- [StyledAtom](#styledatom)
- [More](#more)
- [API](#api)

## ✦About

`styled-atom` is a `CSS in JS` `React` library designed for managing styles dynamically in your projects.
It allows you to load styles asynchronously, and track their state.

## ✦Installation

Install the library using the following command:

```bash
npm install styled-atom
```

## ✦StyleCore

`StyleCore` is the foundation of the `styled-atom` library. It initializes the system and ensures styles are properly loaded. Place this component at the root of your application.

### Props:

- **path (required):** A function that dynamically imports CSS files. It should return a `Promise` that resolves to the desired CSS file.

### Example:

```typescript
import React from "react";
import { StyleCore } from "styled-atom";

const App = () => (
  <>
    <StyleCore
      path={(name: string) => import(`../src/style/css/${name}.css`)}
    />
    <YourComponent />
  </>
);
```

## ✦StyledAtom

`StyledAtom` is used to apply styles dynamically. It can wrap your components and render them only when all the specified styles are loaded.

### Props:

- **fileNames (required):** An array of CSS file names to load dynamically.
- **encap (optional):** A boolean or string value for encapsulating styles using CSS file names as classes with support for custom classes. Encap adds a `div` `wrapper with style file name classes` and a custom `atom-shell` attribute, matching the `atom` attribute of the style tag.
- **fallback (optional):** A React element to render while styles are loading.
- **onLoad (optional):** A callback triggered when styles are loaded.

### Example:

```javascript
import React from "react";
import { StyledAtom } from "styled-atom";

const YourComponent = () => (
  <StyledAtom
    fileNames={["your-style1", "your-style2"]}
    onLoad={() => console.log("The styles are loaded")}
    fallback={<div>Loading...</div>}
    encap // or encap="additionalClass"
  >
    <SomeComponent />
  </StyledAtom>
);
```

Also, if you just want to load the style that you will need later, you can use StyledAtom not as a wrapper.

```javascript
const YourComponent = () => (
  <>
    <StyledAtom fileNames={["your-style1"]} />
    <SomeComponent />
  </>
);
```

✦ _The library ensures only one style tag is used, even if the same styles appear in multiple components._

## ✦More

After the styles are loaded, you will see in the browser:

```html
<head>
  <style atom="✦0" name="yourStyle1">
    .yourStyle1 {
      /* encapsulated CSS */
    }
  </style>
  <style atom="✦0" name="yourStyle2">
    .yourStyle2 {
      /* encapsulated CSS */
    }
  </style>
</head>
<body>
  <div atom-shell="✦0" class="yourStyle1 yourStyle2">
    <!-- content -->
  </div>
</body>
```

✦ _Library encapsulation uses style file names to wrap CSS and html content through classes._

## ✦API

- `StyleCore`: The component for initializing the library.
- `StyledAtom`: A component for creating style tags.
