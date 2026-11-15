import {
  compileStyles,
  createStyleCollector,
  createStyleRuntime,
  type StyledAtomStyles,
} from "../src";
import {
  createStyledAtomStore,
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
});
runtime.preload(["reset", "card"]);
// @ts-expect-error unknown file names are rejected
runtime.preload("missing");

const store = createStyledAtomStore<"reset" | "card">({
  loader: (name) => import(`./${name}.css?inline`),
});

const imported: StyledAtomProps<"reset" | "card"> = {
  files: ["reset", "card"],
  scope: true,
};
void imported;

const combined: StyledAtomProps<"reset" | "card"> = {
  files: "reset",
  name: "card",
  styles,
};
void combined;

// @ts-expect-error inline styles require a name
const missingName: StyledAtomProps = { styles };
void missingName;

// @ts-expect-error a name requires styles
const missingStyles: StyledAtomProps = { name: "card" };
void missingStyles;

// @ts-expect-error store file names remain typed
const unknownFile: Parameters<typeof store.StyledAtom>[0] = { files: "other" };
void unknownFile;

// @ts-expect-error standalone StyledAtom does not accept files
const standaloneFiles: Parameters<typeof StyledAtom>[0] = { files: "card" };
void standaloneFiles;

export { runtime, store };
