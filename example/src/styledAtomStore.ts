import { createStyledAtomStore } from "styled-atom/react";

type StyleFile = "attribute-card" | "import-card" | "tokens";

const styleAtomsStore = createStyledAtomStore<StyleFile>({
  loader: (name) => import(`./styles/${name}.css?inline`),
});

const StyledAtomImport = styleAtomsStore.StyledAtom;

export { styleAtomsStore, StyledAtomImport };
