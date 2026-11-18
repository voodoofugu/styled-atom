import { StrictMode } from "react";
import { createPortal } from "react-dom";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createStyledAtomStore,
  StyledAtom,
  type StyledAtomStyles,
} from "../src/react";

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

afterEach(() => {
  cleanup();
  document.head.replaceChildren();
  document.body.replaceChildren();
});

describe("StyledAtom", () => {
  it("compiles inline styles into head and releases them on unmount", () => {
    const styles = {
      color: "red",
      ".title": { fontWeight: 700 },
    } satisfies StyledAtomStyles;
    const view = render(
      <StyledAtom name="card" style={styles}>
        <article className="card">Card</article>
      </StyledAtom>,
    );

    expect(screen.getByText("Card")).toBeTruthy();
    expect(document.head.textContent).toContain(".card");
    expect(document.head.textContent).toContain("font-weight: 700");
    view.unmount();
    expect(document.head.querySelector("style")).toBeNull();
  });

  it("scopes styles through a semantic wrapper and exposes status", () => {
    const { container } = render(
      <StyledAtom
        name="card"
        scope={{
          element: "section",
          className: "preview",
          "data-surface": "docs",
          "aria-label": "preview",
        }}
        style={{ color: "red" }}
      >
        content
      </StyledAtom>,
    );
    const wrapper = container.querySelector("section");

    expect(wrapper?.className).toBe("preview");
    expect(wrapper?.getAttribute("data-surface")).toBe("docs");
    expect(wrapper?.getAttribute("sa-status")).toBe("ready");
    expect(wrapper?.getAttribute("aria-label")).toBe("preview");
    expect(document.head.textContent).toContain(".preview");
  });

  it("reports an initially ready atom after mount", async () => {
    const onReady = vi.fn();
    const onStatusChange = vi.fn();
    render(
      <StyledAtom
        name="ready-card"
        onReady={onReady}
        onStatusChange={onStatusChange}
        style={{ color: "red" }}
      >
        ready
      </StyledAtom>,
    );

    await waitFor(() => expect(onReady).toHaveBeenCalledOnce());
    expect(onStatusChange).toHaveBeenCalledOnce();
    expect(onReady.mock.calls[0][0].status).toBe("ready");
  });

  it("renders inline style tags inside the wrapper", () => {
    const { container } = render(
      <StyledAtom
        inlinePlacement
        name="inline-card"
        scope
        style={{ color: "red" }}
      >
        <span>inline</span>
      </StyledAtom>,
    );
    const wrapper = container.querySelector(".inline-card");

    expect(wrapper?.firstElementChild?.tagName).toBe("STYLE");
    expect(wrapper?.querySelector("style")?.textContent).toContain("color: red");
    expect(document.head.querySelector("style")).toBeNull();
  });

  it("follows a React portal when placement is inline", () => {
    const portalRoot = document.createElement("div");
    document.body.append(portalRoot);
    const styles = { color: "red" } satisfies StyledAtomStyles;

    render(
      createPortal(
        <StyledAtom inlinePlacement name="portal-card" style={styles}>
          <span>portal</span>
        </StyledAtom>,
        portalRoot,
      ),
    );

    expect(portalRoot.querySelector("style")?.textContent).toContain("color: red");
    expect(document.head.querySelector("style")).toBeNull();
  });

  it("renders numeric and empty-string children", () => {
    const first = render(
      <StyledAtom name="zero" style={{ opacity: 1 }}>
        {0}
      </StyledAtom>,
    );
    expect(first.container.textContent).toBe("0");
    first.unmount();

    const second = render(
      <StyledAtom name="empty" style={{ opacity: 1 }}>
        {""}
      </StyledAtom>,
    );
    expect(second.container.textContent).toBe("");
  });

  it("updates inline CSS owned by one atom", () => {
    const { rerender } = render(
      <StyledAtom name="card" style={{ color: "red" }}>
        card
      </StyledAtom>,
    );
    rerender(
      <StyledAtom name="card" style={{ color: "blue" }}>
        card
      </StyledAtom>,
    );

    expect(document.head.textContent).toContain("color: blue");
    expect(document.head.textContent).not.toContain("color: red");
  });

  it("recompiles a mutated cached style object with a development warning", () => {
    const styles: StyledAtomStyles = { color: "red" };
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const view = render(
      <StyledAtom name="mutable-card" style={styles}>
        card
      </StyledAtom>,
    );

    styles.color = "blue";
    view.rerender(
      <StyledAtom name="mutable-card" style={styles}>
        card
      </StyledAtom>,
    );

    expect(document.head.textContent).toContain("color: blue");
    expect(document.head.textContent).not.toContain("color: red");
    expect(warning).toHaveBeenCalledWith(
      expect.stringContaining("was mutated after compilation"),
    );
  });

  it("does not leak styles under StrictMode", () => {
    const view = render(
      <StrictMode>
        <StyledAtom name="strict" style={{ color: "red" }}>
          strict
        </StyledAtom>
      </StrictMode>,
    );
    expect(document.head.querySelectorAll("style")).toHaveLength(1);
    view.unmount();
    expect(document.head.querySelectorAll("style")).toHaveLength(0);
  });
});

describe("store-bound StyledAtom", () => {
  it("moves from loading to ready and keeps one wrapper", async () => {
    let resolve!: (css: string) => void;
    const loader = () =>
      new Promise<string>((done) => {
        resolve = done;
      });
    const store = createStyledAtomStore({ loader, namespace: "async" });
    const onReady = vi.fn();
    const { container } = render(
      <store.StyledAtom
        files="card"
        fallback={<span>loading</span>}
        onReady={onReady}
        scope="surface"
      >
        <span>ready</span>
      </store.StyledAtom>,
    );

    const wrapper = container.querySelector(".surface");
    expect(wrapper?.getAttribute("sa-status")).toBe("loading");
    expect(screen.getByText("loading")).toBeTruthy();

    await act(async () => {
      resolve(".surface{color:green}");
      await flush();
    });
    expect(wrapper?.getAttribute("sa-status")).toBe("ready");
    expect(screen.getByText("ready")).toBeTruthy();
    expect(onReady).toHaveBeenCalledOnce();
  });

  it("renders eager children while a file loads", () => {
    const store = createStyledAtomStore({
      loader: () => new Promise(() => undefined),
    });
    render(
      <store.StyledAtom files="card">
        {({ status }) => <span>{status}:content</span>}
      </store.StyledAtom>,
    );

    expect(screen.getByText("loading:content")).toBeTruthy();
  });

  it("waits for CSS when renderWhenReady is enabled", async () => {
    let resolve!: (css: string) => void;
    const store = createStyledAtomStore({
      loader: () =>
        new Promise<string>((done) => {
          resolve = done;
        }),
    });
    const { container } = render(
      <store.StyledAtom files="card" renderWhenReady>
        ready content
      </store.StyledAtom>,
    );

    expect(container.textContent).toBe("");
    await act(async () => {
      resolve(".card{color:green}");
      await flush();
    });
    expect(container.textContent).toBe("ready content");
  });

  it("shows an error fallback and retries", async () => {
    const loader = vi
      .fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(".card{color:green}");
    const store = createStyledAtomStore({ loader });
    render(
      <store.StyledAtom
        files="card"
        errorFallback={({ retry, errors }) => (
          <button onClick={retry}>retry {errors[0].source}</button>
        )}
      >
        ready
      </store.StyledAtom>,
    );

    await waitFor(() => expect(screen.getByText("retry card")).toBeTruthy());
    fireEvent.click(screen.getByText("retry card"));
    await waitFor(() => expect(screen.getByText("ready")).toBeTruthy());
  });

  it("targets another document head", () => {
    const frameDocument = document.implementation.createHTMLDocument("frame");
    const store = createStyledAtomStore({
      target: frameDocument,
      initialStyles: { card: ".card{color:red}" },
    });
    render(
      <store.StyledAtom files="card">
        frame
      </store.StyledAtom>,
    );

    expect(frameDocument.head.querySelector("style")).toBeTruthy();
    expect(document.head.querySelector("style")).toBeNull();
  });

  it("can override an inline store default back to head placement", () => {
    const store = createStyledAtomStore({ placement: "inline" });
    const { container } = render(
      <store.StyledAtom
        inlinePlacement={false}
        name="head-card"
        style={{ color: "red" }}
      >
        head
      </store.StyledAtom>,
    );

    expect(document.head.querySelector("style")?.textContent).toContain(
      "color: red",
    );
    expect(container.querySelector("style")).toBeNull();
  });
});
