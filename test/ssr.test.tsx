import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";

import { createStyleCollector } from "../src";
import {
  createStyledAtomStore,
  StyledAtom,
  StyleCollectorProvider,
} from "../src/react";

afterEach(() => {
  document.head.replaceChildren();
  document.body.replaceChildren();
});

describe("server rendering", () => {
  it("keeps inline atom content in server HTML", () => {
    const html = renderToString(
      <StyledAtom name="card" styles={{ color: "red" }}>
        <article>server content</article>
      </StyledAtom>,
    );

    expect(html).toContain("server content");
  });

  it("collects head styles with a stable namespace", () => {
    const collector = createStyleCollector();
    const store = createStyledAtomStore({ namespace: "ssr-app" });
    const html = renderToString(
      <StyleCollectorProvider collector={collector}>
        <store.StyledAtom name="card" styles={{ color: "red" }} scope>
          <article>card</article>
        </store.StyledAtom>
      </StyleCollectorProvider>,
    );
    const tags = collector.getStyleTags();

    expect(html).toContain("card");
    expect(html).not.toContain("<style");
    expect(tags).toContain('data-styled-atom-namespace="ssr-app"');
    expect(tags).toContain(".card");
    expect(tags).toContain("color: red");
  });

  it("renders inline placement beside content without a collector", () => {
    const html = renderToString(
      <StyledAtom
        name="inline-card"
        placement="inline"
        styles={{ color: "red" }}
      >
        <article>card</article>
      </StyledAtom>,
    );

    expect(html).toContain("<style");
    expect(html).toContain("color: red");
    expect(html).toContain("<article>card</article>");
  });

  it("collects imported CSS from an initial style manifest", () => {
    const collector = createStyleCollector();
    const store = createStyledAtomStore({
      namespace: "manifest",
      initialStyles: { card: ".card{color:green}" },
    });
    const html = renderToString(
      <StyleCollectorProvider collector={collector}>
        <store.StyledAtom files="card" scope>
          <article>manifest content</article>
        </store.StyledAtom>
      </StyleCollectorProvider>,
    );

    expect(html).toContain('data-styled-atom-status="ready"');
    expect(html).toContain("manifest content");
    expect(collector.getStyleTags()).toContain("color:green");
  });

  it("renders eager content with loading status when server CSS is unavailable", () => {
    const store = createStyledAtomStore({
      namespace: "missing",
      loader: async () => ".card{color:red}",
    });
    const html = renderToString(
      <store.StyledAtom files="card" scope="surface">
        <article>eager content</article>
      </store.StyledAtom>,
    );

    expect(html).toContain('data-styled-atom-status="loading"');
    expect(html).toContain("eager content");
  });
});
