# styled-atom 💫

## Table of contents

- [About](#About)
- [Installation](#Installation)
- [StyleCore](#StyleCore)
- [StyleTag](#StyleTag)
- [Motivation](#Motivation)
- [API](#API)

## About

It is a lightweight library for working with CSS in JS.

## Installation

Install the library using the following command:

```bash
npm install styled-atom
```

## StyleCore

After installing the library, you need to use the Style Core component at the top level of your project by passing the path to the folder with the style files to the path through the call function:

```typescript
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

You can also pass the watch parameter to `StyleCore`, which will allow you to monitor `style-atom` data in the `sessionStorage`:

```typescript
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
