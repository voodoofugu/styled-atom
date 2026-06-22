import { createStyledAtomStore } from "styled-atom";

type StyleFile = "attribute-card" | "import-card" | "tokens";

const styleAtomsStore = createStyledAtomStore<StyleFile>(
  (name) => import(`./styles/${name}.css?raw`),
);

const StyledAtomImport = styleAtomsStore.StyledAtom;

export { styleAtomsStore, StyledAtomImport };
