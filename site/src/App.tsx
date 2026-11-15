import React from "react";

import logo from "../../src/assets/styled-atom-logo.png";
import {
  createStyledAtomStore,
  StyledAtom,
  type StylePlacement,
  type StyledAtomStyles,
} from "styled-atom/react";

type Theme = "system" | "light" | "dark";

const sections = [
  ["idea", "The idea"],
  ["compiler", "Inline compiler"],
  ["lifecycle", "Lifecycle"],
  ["targets", "Placement & targets"],
  ["files", "CSS files"],
  ["ssr", "SSR"],
  ["core", "Core API"],
  ["migration", "Migration"],
] as const;

const lifecycle = createStyledAtomStore<"remote-card">({
  namespace: "docs-lifecycle",
  loader: async () => {
    await new Promise((resolve) => setTimeout(resolve, 650));
    if (nextLoadFails) throw new Error("The preview server is offline");
    return ".lifecycle-card{border-color:#0f7bff;background:#eaf3ff}";
  },
});

let nextLoadFails = false;

function Code({ children }: { children: string }) {
  return (
    <pre className="code-block">
      <code>{children.trim()}</code>
    </pre>
  );
}

function ThemeControl({ theme, setTheme }: { theme: Theme; setTheme: (value: Theme) => void }) {
  return (
    <div className="theme-control" aria-label="Color theme">
      {(["system", "light", "dark"] as const).map((value) => (
        <button
          aria-pressed={theme === value}
          key={value}
          onClick={() => setTheme(value)}
          type="button"
        >
          {value}
        </button>
      ))}
    </div>
  );
}

function CompilerLab() {
  const [accent, setAccent] = React.useState("#0f7bff");
  const [radius, setRadius] = React.useState(18);
  const [placement, setPlacement] = React.useState<StylePlacement>("head");
  const styles = React.useMemo(
    () =>
      ({
        display: "grid",
        gap: 12,
        minHeight: 190,
        padding: 22,
        border: `1px solid color-mix(in srgb, ${accent} 46%, transparent)`,
        borderRadius: radius,
        background: `color-mix(in srgb, ${accent} 9%, var(--card))`,
        boxShadow: `0 24px 70px color-mix(in srgb, ${accent} 18%, transparent)`,
        transition: "border-radius 180ms ease, background 180ms ease",

        ".lab-kicker": {
          color: accent,
          fontFamily: "var(--mono)",
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
        },

        ".lab-title": {
          margin: 0,
          fontSize: 25,
          letterSpacing: "-0.03em",
        },

        "&:hover": {
          background: `color-mix(in srgb, ${accent} 14%, var(--card))`,
        },

        "@media (width < 40rem)": {
          minHeight: 160,
          padding: 17,
        },
      }) satisfies StyledAtomStyles,
    [accent, radius],
  );

  return (
    <div className="lab-grid">
      <div className="lab-controls">
        <label>
          <span>accent</span>
          <input
            onChange={(event) => setAccent(event.target.value)}
            type="color"
            value={accent}
          />
        </label>
        <label>
          <span>radius · {radius}px</span>
          <input
            max="32"
            min="0"
            onChange={(event) => setRadius(Number(event.target.value))}
            type="range"
            value={radius}
          />
        </label>
        <fieldset>
          <legend>placement</legend>
          {(["head", "inline"] as const).map((value) => (
            <button
              aria-pressed={placement === value}
              key={value}
              onClick={() => setPlacement(value)}
              type="button"
            >
              {value}
            </button>
          ))}
        </fieldset>
        <p>
          Inspect the document: the same atom moves between <code>head</code> and
          this wrapper without changing the component.
        </p>
      </div>

      <StyledAtom
        name="compiler-lab-card"
        placement={placement}
        scope
        styles={styles}
      >
        {({ status }) => (
          <>
            <span className="lab-kicker">{status} · {placement}</span>
            <h3 className="lab-title">One focused atom</h3>
            <p>
              Declarations, nested selectors and media queries compile into real CSS.
            </p>
          </>
        )}
      </StyledAtom>
    </div>
  );
}

function LifecycleLab() {
  const reload = (fail: boolean) => {
    nextLoadFails = fail;
    lifecycle.reload("remote-card");
  };

  return (
    <div className="lifecycle-demo">
      <div className="demo-actions">
        <button onClick={() => reload(false)} type="button">load</button>
        <button onClick={() => reload(true)} type="button">fail next</button>
      </div>
      <lifecycle.StyledAtom
        errorFallback={({ errors, retry, status }) => (
          <article className="lifecycle-card">
            <Status value={status} />
            <strong>{String((errors[0].error as Error).message)}</strong>
            <button onClick={() => { nextLoadFails = false; retry(); }} type="button">
              retry
            </button>
          </article>
        )}
        fallback={
          <article className="lifecycle-card is-loading">
            <Status value="loading" />
            <strong>Loading an owned CSS file…</strong>
          </article>
        }
        files="remote-card"
        scope="lifecycle-surface"
      >
        {({ status }) => (
          <article className="lifecycle-card">
            <Status value={status} />
            <strong>CSS is ready and shared</strong>
            <span>The wrapper exposes the same status to CSS and JavaScript.</span>
          </article>
        )}
      </lifecycle.StyledAtom>
    </div>
  );
}

function Status({ value }: { value: string }) {
  return <span className={`status status-${value}`}>{value}</span>;
}

function App() {
  const [theme, setTheme] = React.useState<Theme>(() => {
    const stored = localStorage.getItem("styled-atom-theme");
    return stored === "light" || stored === "dark" ? stored : "system";
  });

  React.useEffect(() => {
    if (theme === "system") delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = theme;
    localStorage.setItem("styled-atom-theme", theme);
  }, [theme]);

  return (
    <div className="app-shell">
      <header className="top-bar">
        <a className="brand" href="#top">
          <img alt="" src={logo} />
          <span>styled-atom</span>
          <small>v4</small>
        </a>
        <nav aria-label="External links">
          <a href="https://www.npmjs.com/package/styled-atom">npm</a>
          <a href="https://github.com/voodoofugu/styled-atom">github</a>
          <a href="https://github.com/voodoofugu/styled-atom/blob/main/CHANGELOG.md">
            changelog
          </a>
        </nav>
        <ThemeControl setTheme={setTheme} theme={theme} />
      </header>

      <div className="docs-shell" id="top">
        <aside className="side-nav">
          <span className="side-label">documentation</span>
          {sections.map(([id, label]) => (
            <a href={`#${id}`} key={id}>{label}</a>
          ))}
        </aside>

        <main>
          <section className="hero" id="idea">
            <span className="eyebrow">atomic style ownership</span>
            <h1>One component.<br />One focused CSS atom.<br />One lifecycle.</h1>
            <p className="hero-lead">
              Write typed CSS next to the UI that owns it. styled-atom compiles,
              mounts, shares, reloads and releases that CSS with the surface.
            </p>
            <div className="hero-actions">
              <a className="primary" href="#compiler">Try the compiler</a>
              <code>npm install styled-atom</code>
            </div>
            <div className="positioning-grid">
              <article>
                <span>01</span>
                <strong>Focused atoms</strong>
                <p>A small unit of style ownership, not utility-class Atomic CSS.</p>
              </article>
              <article>
                <span>02</span>
                <strong>Real CSS</strong>
                <p>Nested selectors, at-rules, keyframes, cascade and DevTools.</p>
              </article>
              <article>
                <span>03</span>
                <strong>Owned lifecycle</strong>
                <p>Reference counting, status, retry, targets and deterministic order.</p>
              </article>
            </div>
          </section>

          <DocSection
            id="compiler"
            kicker="first-class feature"
            title="Inline compiler"
            lead="A style object can stay beside a focused component without collapsing CSS into a limited inline-style API."
          >
            <CompilerLab />
            <Code>{`
const cardStyles = {
  display: "grid",
  gap: 12,
  borderRadius: 18,

  ".title": { fontWeight: 760 },
  "&:hover": { background: "#eaf3ff" },
  "@media (width < 40rem)": { gap: 8 },
} satisfies StyledAtomStyles;

<StyledAtom name="card" scope styles={cardStyles}>
  <Card />
</StyledAtom>`}</Code>
          </DocSection>

          <DocSection
            id="lifecycle"
            kicker="explicit behavior"
            title="Loading, ready, failed"
            lead="A failed stylesheet is not a successful load. Every atom has one visible state and a retry path."
          >
            <LifecycleLab />
            <div className="note-grid">
              <Note title="Eager by default">Content stays in SSR HTML and remains visible while CSS loads.</Note>
              <Note title="Blocking when needed">Pass a fallback or render="ready" for style-critical surfaces.</Note>
              <Note title="Visible to CSS">Scoped wrappers expose data-styled-atom-status.</Note>
            </div>
          </DocSection>

          <DocSection
            id="targets"
            kicker="DOM ownership"
            title="Placement and targets"
            lead="Head placement is shared and efficient. Inline placement follows portal content. Explicit targets cover isolated documents and roots."
          >
            <div className="api-cards">
              <ApiCard code={'placement="head"'} title="Document head">Reference-counted and deduplicated. The default.</ApiCard>
              <ApiCard code={'placement="inline"'} title="Portal-local">Rendered beside content or inside its scope wrapper.</ApiCard>
              <ApiCard code="target={shadowRoot}" title="Isolated root">Document, ShadowRoot, iframe document or element container.</ApiCard>
              <ApiCard code="order={[...]}" title="Stable cascade">Order no longer depends on which component mounted first.</ApiCard>
            </div>
            <Code>{`
const styles = createStyledAtomStore({
  target: iframeDocument,
  nonce: requestNonce,
  order: ["reset", "tokens", "components"],
  loader,
});`}</Code>
          </DocSection>

          <DocSection
            id="files"
            kicker="shared resources"
            title="CSS files"
            lead="Use one typed runtime for a shell. Files load once per destination and stay mounted while at least one atom owns them."
          >
            <Code>{`
const modules = import.meta.glob("./styles/*.css", {
  query: "?inline",
  import: "default",
});

const styles = createStyledAtomStore<"tokens" | "card">({
  order: ["tokens", "card"],
  loader: (name) => modules[\`./styles/\${name}.css\`](),
});

<styles.StyledAtom files={["tokens", "card"]} scope>
  <Card />
</styles.StyledAtom>`}</Code>
            <p className="callout">
              Vite owns ordinary CSS imports. Use <code>?inline</code> when the
              runtime should receive and own the CSS text.
            </p>
          </DocSection>

          <DocSection
            id="ssr"
            kicker="per-request collection"
            title="SSR without empty content"
            lead="Inline atoms keep their children in server HTML. A collector moves head styles into the document and the client adopts them during hydration."
          >
            <Code>{`
const collector = createStyleCollector();

const html = renderToString(
  <StyleCollectorProvider collector={collector}>
    <App />
  </StyleCollectorProvider>,
);

const styleTags = collector.getStyleTags();`}</Code>
            <p>
              Imported files use an <code>initialStyles</code> manifest on the
              server. Keep the same namespace on server and client.
            </p>
          </DocSection>

          <DocSection
            id="core"
            kicker="zero React imports"
            title="Framework-agnostic core"
            lead="The root entry contains the runtime, compiler and collector. React is an optional integration at styled-atom/react."
          >
            <div className="api-cards">
              <ApiCard code="createStyleRuntime()" title="Runtime">Register, preload, reload, replace and dispose atoms.</ApiCard>
              <ApiCard code="compileStyles()" title="Compiler">Compile one typed style object with an optional scope selector.</ApiCard>
              <ApiCard code="createStyleCollector()" title="SSR collector">Collect, sort and serialize style tags per request.</ApiCard>
            </div>
          </DocSection>

          <DocSection
            id="migration"
            kicker="v3 → v4"
            title="Deliberately breaking"
            lead="v4 separates core from React, makes failures explicit and replaces internal-sounding names with a clearer ownership model."
          >
            <Code>{`
- import StyledAtom, { createStyledAtomStore } from "styled-atom";
+ import { StyledAtom, createStyledAtomStore } from "styled-atom/react";

- <StyledAtom name="card" encap styles={styles}>
+ <StyledAtom name="card" scope styles={styles}>`}</Code>
            <a className="text-link" href="https://github.com/voodoofugu/styled-atom/blob/main/CHANGELOG.md">
              Read the complete changelog →
            </a>
          </DocSection>
        </main>
      </div>
    </div>
  );
}

function DocSection({
  id,
  kicker,
  title,
  lead,
  children,
}: {
  id: string;
  kicker: string;
  title: string;
  lead: string;
  children: React.ReactNode;
}) {
  return (
    <section className="doc-section" id={id}>
      <span className="eyebrow">{kicker}</span>
      <h2>{title}</h2>
      <p className="section-lead">{lead}</p>
      {children}
    </section>
  );
}

function Note({ title, children }: { title: string; children: React.ReactNode }) {
  return <article className="note"><strong>{title}</strong><p>{children}</p></article>;
}

function ApiCard({ code, title, children }: { code: string; title: string; children: React.ReactNode }) {
  return (
    <article className="api-card">
      <code>{code}</code>
      <strong>{title}</strong>
      <p>{children}</p>
    </article>
  );
}

export default App;
