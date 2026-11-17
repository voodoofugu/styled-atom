import React from "react";

import Prism from "prismjs";
import "prismjs/components/prism-bash";
import "prismjs/components/prism-jsx";
import "prismjs/components/prism-tsx";
import "prismjs/components/prism-typescript";

import type { MorphScrollHandle } from "morphing-scroll";

import {
  createStyledAtomStore,
  StyledAtom,
  type StylePlacement,
  type StyledAtomStyles,
} from "styled-atom/react";
import readme, { type ReadmeSection } from "virtual:styled-atom-readme";
import packageInfo from "../../package.json";

import ChromeScroll from "./ChromeScroll";

type Theme = "system" | "light" | "dark";

const themes = ["system", "light", "dark"] as const;

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

const flattenSections = (sections: ReadmeSection[]): ReadmeSection[] =>
  sections.flatMap((section) => [section, ...flattenSections(section.children)]);

const allSections = flattenSections(readme.sections);

const sectionTrail = (
  sections: ReadmeSection[],
  id: string,
  parents: ReadmeSection[] = [],
): ReadmeSection[] => {
  for (const section of sections) {
    const next = [...parents, section];
    if (section.id === id) return next;
    const found = sectionTrail(section.children, id, next);
    if (found.length > 0) return found;
  }
  return [];
};

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
  const control = React.useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = React.useState(false);

  const selectAt = (clientX: number) => {
    const bounds = control.current?.getBoundingClientRect();
    if (!bounds || bounds.width === 0) return;

    const offset = Math.max(
      0,
      Math.min(bounds.width - 1, clientX - bounds.left),
    );
    const index = Math.min(
      themes.length - 1,
      Math.floor(offset / (bounds.width / themes.length)),
    );
    setTheme(themes[index]);
  };

  const stopDragging = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setDragging(false);
  };

  return (
    <div
      aria-label="Color theme"
      className="theme-control"
      data-dragging={dragging || undefined}
      onLostPointerCapture={() => setDragging(false)}
      onPointerCancel={stopDragging}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        setDragging(true);
        selectAt(event.clientX);
      }}
      onPointerMove={(event) => {
        if (dragging) selectAt(event.clientX);
      }}
      onPointerUp={stopDragging}
      ref={control}
    >
      {themes.map((value) => (
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
    const root = ref.current;
    if (!root) return;

    Prism.highlightAllUnder(root);
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
  if (id === "patterns") return <CompilerLab />;
  if (id === "api") {
    return (
      <>
        <LifecycleLab />
        <OwnershipLab />
      </>
    );
  }
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

function SectionCards({ sections }: { sections: ReadmeSection[] }) {
  return (
    <div className="doc-cards">
      {sections.map((section) => {
        const description = section.lead || section.text;
        return (
          <a className="doc-card" href={`#/${section.id}`} key={section.id}>
            <span className="doc-card-name">{section.title}</span>
            {description && (
              <span className="doc-card-lead">
                {description.slice(0, 125)}{description.length > 125 ? "…" : ""}
              </span>
            )}
          </a>
        );
      })}
    </div>
  );
}

function DocumentationPage({ section }: { section: ReadmeSection }) {
  const trail = sectionTrail(readme.sections, section.id);
  return (
    <article className="doc-page">
      <nav aria-label="Breadcrumbs" className="doc-crumbs">
        <a href="#/">docs</a>
        {trail.slice(0, -1).map((parent) => (
          <React.Fragment key={parent.id}>
            <span aria-hidden="true">›</span>
            <a href={`#/${parent.id}`}>{parent.title}</a>
          </React.Fragment>
        ))}
      </nav>
      <h1 className="doc-title">{section.title}</h1>
      {section.lead && <p className="doc-lead">{section.lead}</p>}
      {section.html && <Body html={section.html} />}
      {section.children.length > 0 && <SectionCards sections={section.children} />}
      {demoFor(section.id)}
    </article>
  );
}

function Tree({
  sections,
  current,
  expanded,
  onToggle,
}: {
  sections: ReadmeSection[];
  current: string;
  expanded: ReadonlyMap<string, boolean>;
  onToggle: (id: string, open: boolean) => void;
}) {
  return (
    <ul>
      {sections.map((section) => {
        const isCurrent = section.id === current;
        const inside = current.startsWith(`${section.id}/`);
        const hasChildren = section.children.length > 0;
        const routeOpen = isCurrent || inside;
        const open = hasChildren && (expanded.get(section.id) ?? routeOpen);

        return (
          <li key={section.id}>
            <div className="docs-tree-row">
              <span className={`docs-tree-link${isCurrent ? " is-current" : ""}`}>
                <a
                  aria-current={isCurrent ? "page" : inside || undefined}
                  href={`#/${section.id}`}
                >
                  {section.title}
                </a>
              </span>
              {hasChildren && (
                <button
                  aria-expanded={open}
                  aria-label={`${open ? "Collapse" : "Expand"} ${section.title}`}
                  className="docs-tree-toggle"
                  onClick={() => onToggle(section.id, open)}
                  type="button"
                >
                  <span aria-hidden="true">›</span>
                </button>
              )}
            </div>
            {hasChildren && (
              <div
                aria-hidden={!open}
                className="docs-tree-branch"
                data-open={open || undefined}
                ref={(node) => {
                  if (!node) return
                  if (open) node.removeAttribute('inert')
                  else node.setAttribute('inert', '')
                }}
              >
                <div>
                  <Tree
                    current={current}
                    expanded={expanded}
                    onToggle={onToggle}
                    sections={section.children}
                  />
                </div>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function Footer() {
  return (
    <footer className="site-footer">
      <div>
        <strong>styled-atom</strong>
        <span>v{packageInfo.version}</span>
        <span>© {new Date().getFullYear()} voodoofugu</span>
      </div>
      <nav aria-label="Project links">
        <a href="https://www.npmjs.com/package/styled-atom">npm</a>
        <a href="https://github.com/voodoofugu/styled-atom">github</a>
        <a href="https://github.com/voodoofugu/styled-atom/blob/main/CHANGELOG.md">changelog</a>
        <a href="https://resume.voodoofugu.com/?lang=ru">author</a>
      </nav>
    </footer>
  );
}

function App() {
  const route = useRoute();
  const [theme, setTheme] = useTheme();
  const [query, setQuery] = React.useState("");
  const [expanded, setExpanded] = React.useState<Map<string, boolean>>(
    () => new Map(),
  );
  const page = React.useRef<MorphScrollHandle>(null);
  const id = route.startsWith("#/") ? route.slice(2) : "";
  const current = allSections.find((section) => section.id === id);
  const normalizedQuery = query.trim().toLowerCase();
  const found = normalizedQuery
    ? allSections.filter((section) =>
        `${section.title} ${section.text}`.toLowerCase().includes(normalizedQuery),
      )
    : null;

  React.useEffect(() => {
    page.current?.scrollTo(0, { duration: 0 });
    setExpanded(new Map());
  }, [route]);

  const toggle = (sectionId: string, open: boolean) => {
    setExpanded((currentExpanded) => {
      const next = new Map(currentExpanded);
      next.set(sectionId, !open);
      return next;
    });
  };

  return (
    <div className="app-shell">
      <header className="top-bar">
        <a className="brand" href="#/">
          <span
            aria-hidden="true"
            className="brand-logo"
          />
          <span className="brand-name">styled-atom</span>
          <small>v4</small>
        </a>
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
              {found ? (
                <ul className="docs-found">
                  {found.map((section) => (
                    <li key={section.id}>
                      <a href={`#/${section.id}`} onClick={() => setQuery("")}>
                        {section.title}
                        <small>{section.id.split("/")[0]}</small>
                      </a>
                    </li>
                  ))}
                  {found.length === 0 && <li className="docs-none">No matches</li>}
                </ul>
              ) : (
                <nav aria-label="Documentation" className="docs-tree">
                  <span className={`docs-tree-link${!id ? " is-current" : ""}`}>
                    <a aria-current={!id ? "page" : undefined} href="#/">Overview</a>
                  </span>
                  <Tree
                    current={id}
                    expanded={expanded}
                    onToggle={toggle}
                    sections={readme.sections}
                  />
                </nav>
              )}
            </ChromeScroll>
          </div>
        </aside>

        <main className="docs-main">
          <ChromeScroll
            controls={{ keys: true }}
            ref={page}
            wrapper={{ margin: [24, 18, 24, 0] }}
          >
            <div className="docs-content">
              {!id ? <Overview /> : current ? <DocumentationPage section={current} /> : (
                <article className="doc-page"><h1>Not found</h1><p>This documentation section does not exist.</p></article>
              )}
              <Footer />
            </div>
          </ChromeScroll>
        </main>
      </div>
    </div>
  );
}

export default App;
