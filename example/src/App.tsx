import { useState } from "react";
import {
  StyledAtom,
  createStyledAtomStore,
  type StyledAtomStylesT,
} from "styled-atom";

const styleAtomsStore = createStyledAtomStore(
  (name) => import(`./styles/${name}.css?raw`),
);

const StyledAtomImport = styleAtomsStore.StyledAtom;

const inlineLoaderStyles = {
  display: "grid",
  placeItems: "center",
  minHeight: 180,
  borderRadius: 14,
  backgroundColor: "#101828",
  color: "#f8fafc",
  overflow: "hidden",

  ".loader": {
    position: "relative",
    width: 56,
    height: 56,
    borderRadius: "50%",
    border: "3px solid rgba(255, 255, 255, 0.25)",
    borderTopColor: "#74d4ff",
    animation: "spin 900ms linear infinite",
  },

  ".label": {
    marginTop: 18,
    fontSize: 14,
    fontWeight: 700,
  },

  "@keyframes spin": {
    "100%": {
      transform: "rotate(360deg)",
    },
  },
} satisfies StyledAtomStylesT;

const replacedImportCardCss = `
.import-card {
  border: 1px solid #22c55e;
  background: #ecfdf5;
  color: #064e3b;
  box-shadow: 0 18px 50px rgba(34, 197, 94, 0.24);
}

.import-card .badge {
  background: #bbf7d0;
  color: #065f46;
}

.import-card .title {
  color: #064e3b;
}

.import-card .copy {
  color: #047857;
}
`;

function InlineAtomExample() {
  const [count, setCount] = useState(0);

  return (
    <section className="example-panel">
      <div className="example-copy">
        <p className="eyebrow">Direct StyledAtom</p>
        <h2>Inline object styles</h2>
        <p>
          This card imports <code>StyledAtom</code> directly and passes
          <code> name</code> plus <code>styles</code>. The explicit
          <code> encap</code> prop wraps this card and scopes root declarations.
        </p>

        <button
          type="button"
          onClick={() => {
            setCount((num) => num + 1);
          }}
        >
          {count}
        </button>
      </div>

      <StyledAtom name="inline-loader" encap styles={inlineLoaderStyles}>
        <div>
          <div className="loader" />
          <div className="label">Inline styles are mounted</div>
        </div>
      </StyledAtom>
    </section>
  );
}

function ImportedFilesExample() {
  const [revision, setRevision] = useState(0);

  const replaceImportCard = () => {
    styleAtomsStore.replace([
      {
        file: "import-card",
        css: replacedImportCardCss,
      },
    ]);
    setRevision((value) => value + 1);
  };

  const reloadImportCard = () => {
    styleAtomsStore.reload("import-card");
    setRevision((value) => value + 1);
  };

  return (
    <section className="example-panel">
      <div className="example-copy">
        <p className="eyebrow">Store-bound StyledAtom</p>
        <h2>Imported CSS files</h2>
        <p>
          This card uses <code>createStyledAtomStore</code>, loads raw CSS files
          with Vite and wraps children with <code>encap</code> so the imported
          selectors target this preview.
        </p>
        <div className="button-row">
          <button type="button" onClick={replaceImportCard}>
            Replace CSS
          </button>
          <button type="button" onClick={reloadImportCard}>
            Reload file
          </button>
        </div>
      </div>

      <StyledAtomImport files={["tokens", "import-card"]} encap>
        <article className="import-card">
          <span className="badge">files: tokens + import-card</span>
          <h3 className="title">Shared runtime style cache</h3>
          <p className="copy">
            Open DevTools and inspect style tags. In dev they include readable
            styled-atom sourceURL comments.
          </p>
          <small>revision: {revision}</small>
        </article>
      </StyledAtomImport>
    </section>
  );
}

function EncapExample() {
  return (
    <section className="example-panel">
      <div className="example-copy">
        <p className="eyebrow">Encap</p>
        <h2>Explicit wrapper props</h2>
        <p>
          <code>encap</code> only controls wrapper props. The CSS still remains
          plain CSS and can target classes, ids or attributes you choose.
        </p>
      </div>

      <StyledAtomImport
        files="attribute-card"
        encap={{
          className: "attribute-card",
          attribute: { "data-preview-scope": "attribute-card" },
        }}
      >
        <div className="attribute-card__body">
          <strong>Attribute-scoped surface</strong>
          <span>data-preview-scope="attribute-card"</span>
        </div>
      </StyledAtomImport>
    </section>
  );
}

export default function App() {
  return (
    <main className="page-shell">
      <header className="hero">
        <p className="eyebrow">styled-atom example</p>
        <h1>Inline atoms and imported CSS in one tiny sandbox</h1>
        <p>
          Use this page to test style mounting, file loading, <code>encap</code>
          and dev-time CSS replacement.
        </p>
      </header>

      <div className="example-grid">
        <InlineAtomExample />
        <ImportedFilesExample />
        <EncapExample />
      </div>
    </main>
  );
}
