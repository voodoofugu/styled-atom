import { describe, expect, it } from "vitest";

import {
  compileStyleAtomStyles,
  createStyleAtomSignature,
} from "../src/styles";
import type { StyledAtomStyles } from "../src/types";

describe("compileStyleAtomStyles", () => {
  it("scopes every selector in nested selector lists", () => {
    const css = compileStyleAtomStyles("demo-workbench", {
      '.demo-workbench-shell[data-demo-workbench-theme="dark"]': {
        ".card, .progress, .not-found": { color: "#fff" },
      },
    });

    expect(css).toBe(
      `.demo-workbench .demo-workbench-shell[data-demo-workbench-theme="dark"] .card, .demo-workbench .demo-workbench-shell[data-demo-workbench-theme="dark"] .progress, .demo-workbench .demo-workbench-shell[data-demo-workbench-theme="dark"] .not-found {\n  color: #fff;\n}`,
    );
  });

  it("crosses parent and child selector lists", () => {
    expect(
      compileStyleAtomStyles("demo", {
        ".button, .link": {
          "&:hover, &.active": { color: "blue" },
        },
      }),
    ).toBe(
      `.demo .button:hover, .demo .button.active, .demo .link:hover, .demo .link.active {\n  color: blue;\n}`,
    );
  });

  it("keeps commas inside selector functions and attributes", () => {
    expect(
      compileStyleAtomStyles("demo", {
        '.item:is(.primary, .active), [data-label=","]': { content: "" },
      }),
    ).toBe(
      `.demo .item:is(.primary, .active), .demo[data-label=","] {\n  content: "";\n}`,
    );
  });

  it("compiles media queries, keyframes and descriptor rules", () => {
    const css = compileStyleAtomStyles("card", {
      display: "grid",
      "@media (width < 40rem)": { gridTemplateColumns: "1fr" },
      "@keyframes enter": {
        from: { opacity: 0 },
        to: { opacity: 1 },
      },
      "@font-face": {
        fontFamily: "Demo",
        src: "url(demo.woff2)",
      },
    });

    expect(css).toContain(".card {\n  display: grid;\n}");
    expect(css).toContain("@media (width < 40rem)");
    expect(css).toContain("@keyframes enter");
    expect(css).toContain("opacity: 0;");
    expect(css).toContain("@font-face");
  });

  it("wraps supports, container and layer rules and compiles page descriptors", () => {
    const css = compileStyleAtomStyles("card", {
      "@supports (display: grid)": {
        "@container card (width > 30rem)": {
          "@layer components": { display: "grid" },
        },
      },
      "@page :first": { margin: 12 },
    });

    expect(css).toContain("@supports (display: grid)");
    expect(css).toContain("@container card (width > 30rem)");
    expect(css).toContain("@layer components");
    expect(css).toContain(".card {\n        display: grid;");
    expect(css).toContain("@page :first {\n  margin: 12px;");
  });

  it("formats numbers, custom properties, content and vendor prefixes", () => {
    const css = compileStyleAtomStyles("demo", {
      width: 12,
      lineHeight: 1.4,
      strokeWidth: 2,
      "--offset": 3,
      msTransition: "opacity 100ms",
      "::before": { content: "×" },
    });

    expect(css).toContain("width: 12px;");
    expect(css).toContain("line-height: 1.4;");
    expect(css).toContain("stroke-width: 2;");
    expect(css).toContain("--offset: 3;");
    expect(css).toContain("-ms-transition: opacity 100ms;");
    expect(css).toContain('content: "×";');
  });

  it("emits fallback values as repeated declarations", () => {
    const css = compileStyleAtomStyles("demo", {
      display: ["-webkit-box", "flex"],
      color: ["#0969da", "oklch(55% 0.2 250)"],
      "--surface": ["#fff", "color(display-p3 1 1 1)"],
    });

    expect(css).toContain(
      "display: -webkit-box;\n  display: flex;",
    );
    expect(css).toContain(
      "color: #0969da;\n  color: oklch(55% 0.2 250);",
    );
    expect(css).toContain(
      "--surface: #fff;\n  --surface: color(display-p3 1 1 1);",
    );
  });

  it("handles modern selectors without splitting functional commas", () => {
    const css = compileStyleAtomStyles("demo", {
      "&:has(> .item:is(.active, .selected))": { color: "green" },
      "&:where([data-state='open'], [aria-expanded='true'])": {
        opacity: 1,
      },
    });

    expect(css).toContain(
      ".demo:has(> .item:is(.active, .selected))",
    );
    expect(css).toContain(
      ".demo:where([data-state='open'], [aria-expanded='true'])",
    );
  });

  it("uses an explicit scope selector", () => {
    expect(
      compileStyleAtomStyles(
        "ignored",
        { color: "red", "&[data-active]": { color: "blue" } },
        "#preview.scope",
      ),
    ).toBe(
      `#preview.scope {\n  color: red;\n}\n\n#preview.scope[data-active] {\n  color: blue;\n}`,
    );
  });

  it("rejects circular style objects with a useful error", () => {
    const styles: Record<string, unknown> = { color: "red" };
    styles[".child"] = styles;

    expect(() =>
      compileStyleAtomStyles("demo", styles as StyledAtomStyles),
    ).toThrow("A circular reference was found in a style object");
  });
});

describe("createStyleAtomSignature", () => {
  it("is stable for equivalent hydration input", () => {
    expect(
      createStyleAtomSignature("card", { color: "red" }, ".surface"),
    ).toBe(
      createStyleAtomSignature("card", { color: "red" }, ".surface"),
    );
  });

  it("changes with styles, selectors and declaration order", () => {
    const base = createStyleAtomSignature("card", {
      color: "red",
      backgroundColor: "white",
    });

    expect(createStyleAtomSignature("card", { color: "blue" })).not.toBe(base);
    expect(
      createStyleAtomSignature("card", {
        backgroundColor: "white",
        color: "red",
      }),
    ).not.toBe(base);
    expect(
      createStyleAtomSignature("card", {
        color: "red",
        backgroundColor: "white",
      }, ".surface"),
    ).not.toBe(base);
  });

  it("disables reuse for unserializable input", () => {
    const styles: Record<string, unknown> = { color: "red" };
    styles.child = styles;

    expect(
      createStyleAtomSignature("card", styles as StyledAtomStyles),
    ).toBeUndefined();
  });
});
