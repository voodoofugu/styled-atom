import React from "react";

import Prism from "prismjs";
import "prismjs/components/prism-bash";
import "prismjs/components/prism-jsx";
import "prismjs/components/prism-tsx";
import "prismjs/components/prism-typescript";

import type { MorphScrollHandle } from "morphing-scroll";

import logo from "../../src/assets/styled-atom-logo.png";
import {
  createStyledAtomStore,
  StyledAtom,
  type StylePlacement,
  type StyledAtomStyles,
} from "styled-atom/react";
import readme, { type ReadmeSection } from "virtual:styled-atom-readme";

import ChromeScroll from "./ChromeScroll";

type Theme = "system" | "light" | "dark";

let nextLoadFails = false;

const lifecycle = createStyledAtomStore<"remote-card">({
  namespace: "docs-lifecycle",
  loader: async () => {
    await new Promise((resolve) => setTimeout(resolve, 650));
    if (nextLoadFails) throw new Error("The preview server is offline");
    return ".lifecycle-card{border-color:var(--accent);background:var(--accent-soft)}";
  },
});

const ownership = createStyledAtomStore<"shared-card">({
  namespace: "docs-ownership",
  initialStyles: {
    "shared-card":
      ".ownership-card{border-color:var(--accent);background:color-mix(in srgb,var(--accent) 8%,var(--card))}",
  },
});

function useRoute() {
  const [route, setRoute] = React.useState(() => window.location.hash || "#/");
  React.useEffect(() => {
    const update = () => setRoute(window.location.hash || "#/");
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);
  return route;
}

function useTheme() {
  const [theme, setTheme] = React.useState<Theme>(() => {
    const stored = localStorage.getItem("styled-atom-theme");
    return stored === "light" || stored === "dark" ? stored : "system";
  });
  React.useEffect(() => {
    if (theme === "system") delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = theme;
    localStorage.setItem("styled-atom-theme", theme);
  }, [theme]);
  return [theme, setTheme] as const;
}

function ThemeControl({
  theme,
  setTheme,
}: {
  theme: Theme;
  setTheme: (value: Theme) => void;
}) {
  return (
    <div aria-label="Color theme" className="theme-control">
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

function Body({ html }: { html: string }) {
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (ref.current) Prism.highlightAllUnder(ref.current);
  }, [html]);
  return (
    <div
      className="doc-body"
      dangerouslySetInnerHTML={{ __html: html }}
      ref={ref}
    />
  );
}

function CompilerLab() {
  const [accent, setAccent] = React.useState("#007f9e");
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
        "@media (width < 40rem)": { minHeight: 160, padding: 17 },
      }) satisfies StyledAtomStyles,
    [accent, radius],
  );

  return (
    <section aria-label="Inline compiler playground" className="live-example">
      <div className="example-heading">
        <b>Live compiler</b>
        <span>The documentation uses the current source build.</span>
      </div>
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
              onChange={(event) => setRadius(Number(event.target.value))
              }
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
        </div>

        <StyledAtom
          name="compiler-lab-card"
          placement={placement}
          scope
          style={styles}
        >
          {({ status }) => (
            <>
              <span className="lab-kicker">
                {status} · {placement}
              </span>
              <h3 className="lab-title">One focused CSS atom</h3>
              <p>Declarations, selectors and at-rules compile into real CSS.</p>
            </>
          )}
        </StyledAtom>
      </div>
    </section>
  );
}

function Status({ value }: { value: string }) {
  return <span className={`status status-${value}`}>{value}</span>;
}

function LifecycleLab() {
  const reload = (fail: boolean) => {
    nextLoadFails = fail;
    lifecycle.reload("remote-card");
  };

  return (
    <section aria-label="Lifecycle playground" className="live-example">
      <div className="example-heading">
        <b>Live lifecycle</b>
        <span>Trigger a load or a retryable failure.</span>
      </div>
      <div className="demo-actions">
        <button onClick={() => reload(false)} type="button">load</button>
        <button onClick={() => reload(true)} type="button">fail next</button>
      </div>
      <lifecycle.StyledAtom
        errorFallback={({ errors, retry, status }) => (
          <article className="lifecycle-card">
            <Status value={status} />
            <strong>{String((errors[0].error as Error).message)}</strong>
            <button
              onClick={() => {
                nextLoadFails = false;
                retry();
              }}
              type="button"
            >
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
            <span>The same state is visible to CSS and JavaScript.</span>
          </article>
        )}
      </lifecycle.StyledAtom>
    </section>
  );
}

function OwnershipLab() {
  const [first, setFirst] = React.useState(true);
  const [second, setSecond] = React.useState(true);
  const [report, setReport] = React.useState(() => ownership.inspect());

  React.useEffect(() => {
    const timer = window.setTimeout(() => setReport(ownership.inspect()), 0);
    return () => window.clearTimeout(timer);
  }, [first, second]);

  const owners = report.entries[0]?.localOwners ?? 0;
  return (
    <section aria-label="Shared ownership playground" className="live-example">
      <div className="example-heading">
        <b>Shared ownership</b>
        <span>
          {owners} active owner{owners === 1 ? "" : "s"} · {owners > 0 ? "one style element" : "style released"}
        </span>
      </div>
      <div className="demo-actions">
        <button aria-pressed={first} onClick={() => setFirst((value) => !value)} type="button">
          owner A
        </button>
        <button aria-pressed={second} onClick={() => setSecond((value) => !value)} type="button">
          owner B
        </button>
      </div>
      <div className="ownership-grid">
        {first && (
          <ownership.StyledAtom files="shared-card" scope="ownership-card">
            <strong>Owner A</strong><span>uses shared-card.css</span>
          </ownership.StyledAtom>
        )}
        {second && (
          <ownership.StyledAtom files="shared-card" scope="ownership-card">
            <strong>Owner B</strong><span>uses the same CSS identity</span>
          </ownership.StyledAtom>
        )}
        {!first && !second && <p className="empty-demo">No owners. The style element was released.</p>}
      </div>
    </section>
  );
}

const demoFor = (id: string) => {
  if (id === "inline-styles") return <CompilerLab />;
  if (id === "lifecycle") return <LifecycleLab />;
  if (id === "css-files" || id === "placement-and-targets") return <OwnershipLab />;
  return null;
};

function Overview() {
  return (
    <article className="doc-page">
      <h1 className="doc-title">styled-atom</h1>
      <p className="doc-lead">CSS that appears and disappears with your UI.</p>
      <Body html={readme.intro} />
      <div className="doc-cards">
        {readme.sections
          .filter((section) => section.id !== "license")
          .map((section) => (
            <a className="doc-card" href={`#/${section.id}`} key={section.id}>
              <span className="doc-card-name">{section.title}</span>
              <span className="doc-card-lead">
                {section.text.slice(0, 125)}{section.text.length > 125 ? "…" : ""}
              </span>
            </a>
          ))}
      </div>
    </article>
  );
}

function DocumentationPage({ section }: { section: ReadmeSection }) {
  return (
    <article className="doc-page">
      <nav aria-label="Breadcrumbs" className="doc-crumbs">
        <a href="#/">docs</a><span aria-hidden="true">›</span><span>{section.title}</span>
      </nav>
      <h1 className="doc-title">{section.title}</h1>
      <Body html={section.html} />
      {demoFor(section.id)}
    </article>
  );
}

function App() {
  const route = useRoute();
  const [theme, setTheme] = useTheme();
  const [query, setQuery] = React.useState("");
  const page = React.useRef<MorphScrollHandle>(null);
  const id = route.startsWith("#/") ? route.slice(2) : "";
  const current = readme.sections.find((section) => section.id === id);
  const normalizedQuery = query.trim().toLowerCase();
  const visibleSections = normalizedQuery
    ? readme.sections.filter((section) =>
        `${section.title} ${section.text}`.toLowerCase().includes(normalizedQuery),
      )
    : readme.sections;

  React.useEffect(() => {
    page.current?.scrollTo(0, { duration: 0 });
  }, [route]);

  const navigationLink = (section: ReadmeSection) => {
    const currentSection = section.id === id;
    return (
      <span
        className={`docs-tree-link${currentSection ? " is-current" : ""}`}
        key={section.id}
      >
        <a
          aria-current={currentSection ? "page" : undefined}
          href={`#/${section.id}`}
        >
          {section.title}
        </a>
      </span>
    );
  };

  return (
    <div className="app-shell">
      <header className="top-bar">
        <a className="brand" href="#/">
          <img alt="styled-atom" src={logo} /><small>v4</small>
        </a>
        <nav aria-label="Primary">
          <a aria-current={!id ? "page" : undefined} href="#/">docs</a>
          <a href="https://www.npmjs.com/package/styled-atom">npm</a>
          <a href="https://github.com/voodoofugu/styled-atom">github</a>
          <a href="https://github.com/voodoofugu/styled-atom/blob/main/CHANGELOG.md">changelog</a>
        </nav>
        <ThemeControl setTheme={setTheme} theme={theme} />
      </header>

      <div className="docs-shell">
        <aside className="docs-nav">
          <input
            aria-label="Search documentation"
            className="docs-search"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="search documentation"
            type="search"
            value={query}
          />
          <div className="docs-nav-scroll">
            <ChromeScroll
              controls={{ keys: true, bar: { trackGap: -4 } }}
              wrapper={{ margin: [1, 14, 0, 1] }}
            >
              <nav aria-label="Documentation" className="docs-tree">
                <span className={`docs-tree-link${!id ? " is-current" : ""}`}>
                  <a aria-current={!id ? "page" : undefined} href="#/">Overview</a>
                </span>
                {visibleSections.map(navigationLink)}
                {visibleSections.length === 0 && <span className="docs-none">No matches</span>}
              </nav>
            </ChromeScroll>
          </div>
        </aside>

        <main className="docs-main">
          <ChromeScroll
            controls={{ keys: true }}
            ref={page}
            wrapper={{ margin: [24, 18, 96, 0] }}
          >
            {!id ? <Overview /> : current ? <DocumentationPage section={current} /> : (
              <article className="doc-page"><h1>Not found</h1><p>This documentation section does not exist.</p></article>
            )}
          </ChromeScroll>
        </main>
      </div>
    </div>
  );
}

export default App;
