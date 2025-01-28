<div align="center">
  <img src="https://drive.google.com/uc?export=view&id=1zaKS3ZOVpeVEY2xcwZmUhdYuRBGBzZRR" alt="logo"/>
</div>

## ✦ Table of contents

- [About](#-about)
- [Installation](#-installation)
- [StyleCore](#-stylecore)
- [StyledAtom](#-styledatom)
- [More](#-more)
- [API](#-api)

## ✦ About

`styled-atom` is a `CSS in JS` `React` library designed for managing styles dynamically in your projects.
It allows you to load styles asynchronously, and track their state.

## ✦ Installation

Install the library using the following command:

```bash
npm install styled-atom
```

## ✦ StyleCore

`StyleCore` is the foundation of the `styled-atom` library. It initializes the system and ensures styles are properly loaded. Place this component at the root of your application.

### Props:

- **`path` (required):** _The style import function._
  <details>
  <summary><strong>More:</strong></summary>
  <strong>‣ Type:</strong><br />
  (fileName: string) => Promise<{ default: string; }><br />
  <br />
  <strong>‣ Description:</strong> <em><br />
  Provide the correct path to the folder containing your style files. This function should return a promise that resolves to an object containing the default export, which is the path to your style file.</em><br />
  <br />
  <strong>‣ Example:</strong>

  ```typescript
  import React from "react";
  import { StyleCore } from "styled-atom";

  const App = () => {
    <>
      <StyleCore
        path={(name: string) => import(`../src/style/css/${name}.css`)}
      />
      <YourComponent />
    </>;
  };
  ```

  </details>

## ✦ StyledAtom

`StyledAtom` is used to apply styles dynamically. It can wrap your components and render them only when all the specified styles are loaded.

### Props:

- **fileNames (required):** _Array of CSS file names required for the component._
  <details>
  <summary><strong>More:</strong></summary>
  <strong>‣ Type:</strong> string[]<br />
  <br />
  <strong>‣ Description:</strong> <em><br />
  Provide an array of your style file names. These will be used to dynamically load the corresponding CSS files for your component.</em><br />
  <br />
  <strong>‣ Example:</strong>

  ```typescript
  import React from "react";
  import { StyledAtom } from "styled-atom";

  const YourComponent = () => {
    <StyledAtom fileNames={["your-style1", "your-style2"]}>
      <SomeComponent />
    </StyledAtom>;
  };
  ```

  </details>
  <h2>

- **encap (optional):** _Encapsulates styles with CSS file names, supports custom classes._
  <details>
  <summary><strong>More:</strong></summary>
  <strong>‣ Type:</strong> string[]<br />
  <br />
  <strong>‣ Description:</strong> <em><br />
  This property allows you to encapsulate styles by applying CSS file names as class names. It also supports custom class names. When enabled, a wrapper `div` element will be added, with classes corresponding to the style file names, and a custom `atom-shell` attribute, which matches the `atom` attribute in the `style` tag. This feature helps to scope styles to the component, preventing conflicts with global styles.</em><br />
  <br />
  <strong>‣ Example:</strong>

  ```typescript
  import React from "react";
  import { StyledAtom } from "styled-atom";

  const YourComponent = () => {
    <StyledAtom
      encap
      // or encap="custom-class"
      // another props
    >
      <SomeComponent />
    </StyledAtom>;
  };
  ```

  </details>
  <h2>

- **fallback (optional):** _A React element to render while styles are loading._
  <details>
  <summary><strong>More:</strong></summary>
  <strong>‣ Type:</strong> React.ReactNode<br />
  <br />
  <strong>‣ Description:</strong> <em><br />
  This property allows you to specify a React element to be displayed while the styles are being loaded. It provides a way to show a loading indicator or placeholder until the styles are fully applied, improving the user experience during the loading process.</em><br />
  <br />
  <strong>‣ Example:</strong>

  ```typescript
  import React from "react";
  import { StyledAtom } from "styled-atom";

  const YourComponent = () => {
    <StyledAtom
      fallback={<div>Loading...</div>}
      // another props
    >
      <SomeComponent />
    </StyledAtom>;
  };
  ```

  </details>
  <h2>

- **onLoad (optional):** _Callback triggered after styles are loaded successfully._
  <details>
  <summary><strong>More:</strong></summary>
  <strong>‣ Type:</strong> () => void<br />
  <br />
  <strong>‣ Description:</strong> <em><br />
  This callback function is called once the styles have been successfully loaded and applied. It allows you to perform additional actions or trigger side effects after the styles are ready, such as updating the UI or logging a message.</em><br />
  <br />
  <strong>‣ Example:</strong>

  ```typescript
  import React from "react";
  import { StyledAtom } from "styled-atom";

  const YourComponent = () => {
    <StyledAtom
      onLoad={() => console.log("The styles are loaded")}
      // another props
    >
      <SomeComponent />
    </StyledAtom>;
  };
  ```

  </details>

Also, if you just want to load the style that you will need later, you can use StyledAtom not as a wrapper.

```tsx
const YourComponent = () => (
  <>
    <StyledAtom fileNames={["your-style1"]} />
    <SomeComponent />
  </>
);
```

✦ _The library ensures only one style tag is used, even if the same styles appear in multiple components._

## ✦ More

After the styles are loaded, you will see in the browser something like this:

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

## ✦ API

- `StyleCore`: The component for initializing the library.
- `StyledAtom`: A component for creating style tags.
