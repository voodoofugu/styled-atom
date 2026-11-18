import { act, cleanup, render } from "@testing-library/react";
import { StrictMode, type ReactNode } from "react";
import { hydrateRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/styles", async () => {
  const actual = await vi.importActual<typeof import("../src/styles")>(
    "../src/styles",
  );
  return {
    ...actual,
    compileStyleAtomStyles: vi.fn(actual.compileStyleAtomStyles),
    createStyleAtomSignature: vi.fn(actual.createStyleAtomSignature),
  };
});

import { createStyleCollector } from "../src";
import { resetStyleRegistryForTests } from "../src/registry";
import {
  createStyledAtomStore,
  StyleCollectorProvider,
  type StyledAtomStyles,
} from "../src/react";
import {
  compileStyleAtomStyles,
  createStyleAtomSignature,
} from "../src/styles";

const compiler = vi.mocked(compileStyleAtomStyles);
const signer = vi.mocked(createStyleAtomSignature);

const serverRender = ({
  namespace,
  style,
  placement = "head",
  children = <article>card</article>,
}: {
  namespace: string;
  style: StyledAtomStyles;
  placement?: "head" | "inline";
  children?: ReactNode;
}) => {
  const collector = createStyleCollector();
  const store = createStyledAtomStore({ namespace });
  const content = (
    <store.StyledAtom
      inlinePlacement={placement === "inline"}
      name="card"
      style={style}
    >
      {children}
    </store.StyledAtom>
  );
  const html = renderToString(
    <StyleCollectorProvider collector={collector}>
      {content}
    </StyleCollectorProvider>,
  );
  return { html, styleTags: collector.getStyleTags() };
};

const hydrationContainer = (html: string, styleTags: string) => {
  document.head.innerHTML = styleTags;
  const container = document.createElement("div");
  container.innerHTML = html;
  document.body.append(container);
  return container;
};

const unmount = async (root?: Root) => {
  if (!root) return;
  await act(async () => root.unmount());
};

afterEach(() => {
  cleanup();
  resetStyleRegistryForTests();
  document.head.replaceChildren();
  document.body.replaceChildren();
  compiler.mockClear();
  signer.mockClear();
});

describe("SSR hydration", () => {
  it("adopts a collected stylesheet link without duplicating it", async () => {
    const namespace = "hydrate-static";
    const collector = createStyleCollector();
    const serverStore = createStyledAtomStore({
      namespace,
      stylesheets: { card: "/assets/card.a1.css" },
    });
    const content = (
      <serverStore.StaticAtom files="card">
        <article>static card</article>
      </serverStore.StaticAtom>
    );
    const html = renderToString(
      <StyleCollectorProvider collector={collector}>
        {content}
      </StyleCollectorProvider>,
    );
    const container = hydrationContainer(html, collector.getStyleTags());
    const serverLink = document.head.querySelector<HTMLLinkElement>("link");
    const clientStore = createStyledAtomStore({
      namespace,
      stylesheets: { card: "/assets/card.a1.css" },
    });
    let root: Root | undefined;

    await act(async () => {
      root = hydrateRoot(
        container,
        <clientStore.StaticAtom files="card">
          <article>static card</article>
        </clientStore.StaticAtom>,
      );
    });

    expect(document.head.querySelectorAll("link")).toHaveLength(1);
    expect(document.head.querySelector("link")).toBe(serverLink);
    await act(async () => {
      serverLink?.dispatchEvent(new Event("load"));
      await Promise.resolve();
    });
    await unmount(root);
    expect(document.head.querySelector("link")).toBeNull();
  });

  it("does not calculate hydration signatures for client-only mounts", () => {
    const store = createStyledAtomStore({ namespace: "client-only" });

    render(
      <store.StyledAtom name="card" style={{ color: "red" }}>
        card
      </store.StyledAtom>,
    );

    expect(compiler).toHaveBeenCalledOnce();
    expect(signer).not.toHaveBeenCalled();
  });

  it("reuses signed server CSS without compiling it again", async () => {
    const namespace = "hydrate-match";
    const server = serverRender({
      namespace,
      style: { color: "red", "&:hover": { color: "blue" } },
    });
    const container = hydrationContainer(server.html, server.styleTags);
    const serverElement = document.head.querySelector("style");

    expect(serverElement?.getAttribute("sa-signature")).toMatch(/^v1-/);
    expect(compiler).toHaveBeenCalledOnce();
    compiler.mockClear();
    signer.mockClear();

    const store = createStyledAtomStore({ namespace });
    let root: Root | undefined;
    await act(async () => {
      root = hydrateRoot(
        container,
        <store.StyledAtom
          name="card"
          style={{ color: "red", "&:hover": { color: "blue" } }}
        >
          <article>card</article>
        </store.StyledAtom>,
      );
    });
    expect(compiler).not.toHaveBeenCalled();
    expect(signer).toHaveBeenCalledOnce();
    expect(document.head.querySelectorAll("style")).toHaveLength(1);
    expect(document.head.querySelector("style")).toBe(serverElement);
    await unmount(root);
  });

  it("compiles and reports a mismatch when the client input differs", async () => {
    const namespace = "hydrate-mismatch";
    const server = serverRender({ namespace, style: { color: "red" } });
    const container = hydrationContainer(server.html, server.styleTags);
    compiler.mockClear();
    signer.mockClear();
    const onStatusChange = vi.fn();
    const store = createStyledAtomStore({ namespace });
    let root: Root | undefined;

    await act(async () => {
      root = hydrateRoot(
        container,
        <store.StyledAtom
          name="card"
          onStatusChange={onStatusChange}
          style={{ color: "blue" }}
        >
          <article>card</article>
        </store.StyledAtom>,
      );
    });

    expect(compiler).toHaveBeenCalledOnce();
    expect(signer).toHaveBeenCalledOnce();
    const failedState = onStatusChange.mock.calls.find(
      ([state]) => state.status === "failed",
    )?.[0];
    expect(failedState).toBeDefined();
    expect(String(failedState?.errors[0].error)).toContain(
      "does not match the client CSS",
    );
    expect(document.head.textContent).toContain("color: red");
    expect(document.head.textContent).not.toContain("color: blue");
    await unmount(root);
  });

  it("falls back to compilation for unsigned server CSS", async () => {
    const namespace = "hydrate-unsigned";
    const server = serverRender({ namespace, style: { color: "red" } });
    const container = hydrationContainer(server.html, server.styleTags);
    document.head
      .querySelector("style")
      ?.removeAttribute("sa-signature");
    compiler.mockClear();
    signer.mockClear();
    const store = createStyledAtomStore({ namespace });
    let root: Root | undefined;

    await act(async () => {
      root = hydrateRoot(
        container,
        <store.StyledAtom name="card" style={{ color: "red" }}>
          <article>card</article>
        </store.StyledAtom>,
      );
    });

    expect(signer).toHaveBeenCalledOnce();
    expect(compiler).toHaveBeenCalledOnce();
    expect(document.head.querySelectorAll("style")).toHaveLength(1);
    expect(document.head.textContent).toContain("color: red");
    await unmount(root);
  });

  it("compiles the first dynamic change after hydration", async () => {
    const namespace = "hydrate-update";
    const server = serverRender({ namespace, style: { color: "red" } });
    const container = hydrationContainer(server.html, server.styleTags);
    compiler.mockClear();
    signer.mockClear();
    const store = createStyledAtomStore({ namespace });
    let root: Root | undefined;

    await act(async () => {
      root = hydrateRoot(
        container,
        <store.StyledAtom name="card" style={{ color: "red" }}>
          <article>card</article>
        </store.StyledAtom>,
      );
    });
    expect(compiler).not.toHaveBeenCalled();
    expect(signer).toHaveBeenCalledOnce();
    signer.mockClear();

    await act(async () => {
      root?.render(
        <store.StyledAtom name="card" style={{ color: "blue" }}>
          <article>card</article>
        </store.StyledAtom>,
      );
    });

    expect(compiler).toHaveBeenCalledOnce();
    expect(signer).not.toHaveBeenCalled();
    expect(document.head.textContent).toContain("color: blue");
    expect(document.head.textContent).not.toContain("color: red");
    await unmount(root);
  });

  it("keeps one adopted style under StrictMode", async () => {
    const namespace = "hydrate-strict";
    const server = serverRender({ namespace, style: { color: "red" } });
    const container = hydrationContainer(server.html, server.styleTags);
    compiler.mockClear();
    signer.mockClear();
    const store = createStyledAtomStore({ namespace });
    let root: Root | undefined;

    await act(async () => {
      root = hydrateRoot(
        container,
        <StrictMode>
          <store.StyledAtom name="card" style={{ color: "red" }}>
            <article>card</article>
          </store.StyledAtom>
        </StrictMode>,
      );
    });

    expect(compiler).not.toHaveBeenCalled();
    expect(signer).toHaveBeenCalledTimes(2);
    expect(document.head.querySelectorAll("style")).toHaveLength(1);
    await unmount(root);
    expect(document.head.querySelector("style")).toBeNull();
  });

  it("reuses an inline server style during hydration", async () => {
    const namespace = "hydrate-inline";
    const server = serverRender({
      namespace,
      placement: "inline",
      style: { color: "red" },
    });
    const container = hydrationContainer(server.html, server.styleTags);
    compiler.mockClear();
    signer.mockClear();
    const store = createStyledAtomStore({ namespace });
    let root: Root | undefined;

    await act(async () => {
      root = hydrateRoot(
        container,
        <store.StyledAtom
          inlinePlacement
          name="card"
          style={{ color: "red" }}
        >
          <article>card</article>
        </store.StyledAtom>,
      );
    });

    expect(compiler).not.toHaveBeenCalled();
    expect(signer).toHaveBeenCalledOnce();
    expect(container.querySelectorAll("style")).toHaveLength(1);
    expect(document.head.querySelector("style")).toBeNull();
    await unmount(root);
  });
});
