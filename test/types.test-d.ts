import {
  compileStyles,
  createStyleCollector,
  createStyleRuntime,
  type StyledAtomStyles,
} from "../src";
import {
  createStyledAtomStore,
  StaticAtom,
  StyledAtom,
  type StyledAtomProps,
} from "../src/react";

const styles = {
  display: "grid",
  color: ["#0969da", "oklch(55% 0.2 250)"],
  gap: 12,
  ".title": { fontWeight: 700 },
  "@media (width < 40rem)": { gap: 8 },
} satisfies StyledAtomStyles;

compileStyles("card", styles);
createStyleCollector();

const runtime = createStyleRuntime<"reset" | "card">({
  loader: (name) => `${name}{display:block}`,
  order: ["reset", "card"],
  sourceURL: false,
});
runtime.preload(["reset", "card"]);
// @ts-expect-error unknown file names are rejected
runtime.preload("missing");

const store = createStyledAtomStore<"reset" | "card">({
  loader: (name) => import(`./${name}.css?inline`),
  stylesheets: { card: "/assets/card.a1.css" },
});

// @ts-expect-error runtime creation uses one object configuration form
createStyleRuntime((name: string) => `${name}{display:block}`);
// @ts-expect-error store creation uses one object configuration form
createStyledAtomStore((name: string) => import(`./${name}.css?inline`));
// @ts-expect-error the lower-level runtime is not exposed by a React store
void store.runtime;

const imported: StyledAtomProps<"reset" | "card"> = {
  files: ["reset", "card"],
  scope: {
    element: "section",
    className: "preview",
    "aria-label": "Preview",
  },
};
void imported;

const legacyWrapper: StyledAtomProps = {
  name: "card",
  style: styles,
  scope: true,
  // @ts-expect-error wrapper configuration belongs inside scope
  as: "section",
};
void legacyWrapper;

const combined: StyledAtomProps<"reset" | "card"> = {
  files: "reset",
  name: "card",
  style: styles,
};
void combined;

const legacyStyleProp: StyledAtomProps = {
  name: "card",
  // @ts-expect-error the inline compiler prop is singular: style
  styles,
};
void legacyStyleProp;

// @ts-expect-error inline style requires a name
const missingName: StyledAtomProps = { style: styles };
void missingName;

// @ts-expect-error a name requires style
const missingStyle: StyledAtomProps = { name: "card" };
void missingStyle;

// @ts-expect-error store file names remain typed
const unknownFile: Parameters<typeof store.StyledAtom>[0] = { files: "other" };
void unknownFile;

// @ts-expect-error standalone StyledAtom does not accept files
const standaloneFiles: Parameters<typeof StyledAtom>[0] = { files: "card" };
void standaloneFiles;

const staticFile: Parameters<typeof store.StaticAtom>[0] = { files: "card" };
void staticFile;

const standaloneStatic: Parameters<typeof StaticAtom>[0] = {
  name: "card",
  href: "/assets/card.a1.css",
};
void standaloneStatic;

// @ts-expect-error standalone StaticAtom requires a stylesheet URL
const staticWithoutHref: Parameters<typeof StaticAtom>[0] = { name: "card" };
void staticWithoutHref;

const staticWithRuntimeStyle: Parameters<typeof StaticAtom>[0] = {
  name: "card",
  href: "/assets/card.a1.css",
  // @ts-expect-error StaticAtom does not accept runtime style objects
  style: styles,
};
void staticWithRuntimeStyle;

const unknownStaticFile: Parameters<typeof store.StaticAtom>[0] = {
  // @ts-expect-error store-bound static file names remain typed
  files: "other",
};
void unknownStaticFile;

export { runtime, store };
