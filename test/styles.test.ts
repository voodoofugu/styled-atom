import { describe, expect, it } from "vitest";

import { compileStyleAtomStyles } from "../src/styles";

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
});
