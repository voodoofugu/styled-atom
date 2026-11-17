import { createStyleRuntime } from "../src";

declare global {
  interface Window {
    styledAtomCspReady?: boolean;
  }
}

createStyleRuntime({
  namespace: "csp-allowed",
  nonce: "browser-csp",
  initialStyles: { allowed: ".allowed{color:rgb(11, 22, 33)}" },
}).registerAtom({ files: "allowed" });

createStyleRuntime({
  namespace: "csp-blocked",
  initialStyles: { blocked: ".blocked{color:rgb(44, 55, 66)}" },
}).registerAtom({ files: "blocked" });

window.styledAtomCspReady = true;
