import { afterEach, describe, expect, it, vi } from "vitest";

import { createStyleCollector, createStyleRuntime } from "../src";

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
};

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

afterEach(() => {
  document.head.replaceChildren();
  document.body.replaceChildren();
});

describe("StyleRuntime", () => {
  it("shares one head style until the last atom is disposed", () => {
    const runtime = createStyleRuntime({
      namespace: "shared",
      initialStyles: { card: ".card{color:red}" },
    });
    const first = runtime.registerAtom({ files: "card" });
    const second = runtime.registerAtom({ files: "card" });

    expect(first.getSnapshot().status).toBe("ready");
    expect(document.head.querySelectorAll("style")).toHaveLength(1);
    first.dispose();
    expect(document.head.querySelectorAll("style")).toHaveLength(1);
    second.dispose();
    expect(document.head.querySelectorAll("style")).toHaveLength(0);
  });

  it("keeps configured cascade order independent of mount order", () => {
    const runtime = createStyleRuntime({
      namespace: "order",
      initialStyles: {
        reset: "*{box-sizing:border-box}",
        theme: ":root{color:red}",
      },
      order: ["reset", "theme"],
    });
    const theme = runtime.registerAtom({ files: "theme" });
    const reset = runtime.registerAtom({ files: "reset" });
    const keys = Array.from(document.head.querySelectorAll("style")).map((node) =>
      node.getAttribute("data-styled-atom-key"),
    );

    expect(keys).toEqual(["file:reset:0", "file:theme:1"]);
    theme.dispose();
    reset.dispose();
  });

  it("loads asynchronously and exposes loading then ready", async () => {
    const css = deferred<string>();
    const runtime = createStyleRuntime(() => css.promise);
    const atom = runtime.registerAtom({ files: "card" });

    expect(atom.getSnapshot().status).toBe("loading");
    css.resolve(".card{color:green}");
    await flush();
    expect(atom.getSnapshot().status).toBe("ready");
    expect(document.head.textContent).toContain("color:green");
  });

  it("ignores a stale load after reload", async () => {
    const loads = [deferred<string>(), deferred<string>()];
    const loader = vi
      .fn()
      .mockImplementationOnce(() => loads[0].promise)
      .mockImplementationOnce(() => loads[1].promise);
    const runtime = createStyleRuntime(loader);
    const atom = runtime.registerAtom({ files: "card" });
    atom.reload();

    loads[1].resolve(".card{color:blue}");
    await flush();
    loads[0].resolve(".card{color:red}");
    await flush();

    expect(document.head.textContent).toContain("color:blue");
    expect(document.head.textContent).not.toContain("color:red");
  });

  it("reports failures and retries them", async () => {
    const loader = vi
      .fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(".card{color:green}");
    const onError = vi.fn();
    const runtime = createStyleRuntime({ loader, onError });
    const atom = runtime.registerAtom({ files: "card" });
    await flush();

    expect(atom.getSnapshot().status).toBe("failed");
    expect(atom.getSnapshot().errors[0]).toMatchObject({
      code: "load",
      source: "card",
    });
    expect(onError).toHaveBeenCalledOnce();

    atom.retry();
    await flush();
    expect(atom.getSnapshot().status).toBe("ready");
    expect(document.head.textContent).toContain("color:green");
  });

  it("retries failed entries after configuring a loader", async () => {
    const runtime = createStyleRuntime();
    const atom = runtime.registerAtom({ files: "card" });
    expect(atom.getSnapshot().status).toBe("failed");

    runtime.configure(() => ".card{color:green}");
    await flush();

    expect(atom.getSnapshot().status).toBe("ready");
    expect(document.head.textContent).toContain("color:green");
  });

  it("replaces mounted file CSS without calling the loader", () => {
    const loader = vi.fn(() => ".card{color:red}");
    const runtime = createStyleRuntime({
      loader,
      initialStyles: { card: ".card{color:red}" },
    });
    const atom = runtime.registerAtom({ files: "card" });
    atom.replace([{ file: "card", css: ".card{color:purple}" }]);

    expect(loader).not.toHaveBeenCalled();
    expect(document.head.textContent).toContain("color:purple");
  });

  it("mounts into a ShadowRoot and applies a nonce", () => {
    const host = document.createElement("section");
    document.body.append(host);
    const shadow = host.attachShadow({ mode: "open" });
    const runtime = createStyleRuntime({
      target: shadow,
      nonce: "request-nonce",
      initialStyles: { card: ".card{color:red}" },
    });
    runtime.registerAtom({ files: "card" });
    const style = shadow.querySelector("style");

    expect(style?.nonce).toBe("request-nonce");
    expect(document.head.querySelector("style")).toBeNull();
  });

  it("mounts into another document for iframe-like surfaces", () => {
    const frameDocument = document.implementation.createHTMLDocument("preview");
    const runtime = createStyleRuntime({
      target: frameDocument,
      initialStyles: { card: ".card{color:red}" },
    });
    runtime.registerAtom({ files: "card" });

    expect(frameDocument.head.querySelector("style")?.textContent).toContain(
      "color:red",
    );
    expect(document.head.querySelector("style")).toBeNull();
  });

  it("fails an unavailable explicit target instead of leaking into the main head", () => {
    let target: Document | null = null;
    const runtime = createStyleRuntime({
      target: () => target,
      initialStyles: { card: ".card{color:red}" },
    });
    const atom = runtime.registerAtom({ files: "card" });

    expect(atom.getSnapshot().status).toBe("failed");
    expect(atom.getSnapshot().errors[0].code).toBe("target");
    expect(document.head.querySelector("style")).toBeNull();

    target = document.implementation.createHTMLDocument("preview");
    atom.retry();

    expect(atom.getSnapshot().status).toBe("ready");
    expect(target.head.textContent).toContain("color:red");
    expect(document.head.querySelector("style")).toBeNull();
  });

  it("moves mounted styles when the runtime target is reconfigured", () => {
    const preview = document.implementation.createHTMLDocument("preview");
    const runtime = createStyleRuntime({
      initialStyles: { card: ".card{color:red}" },
    });
    runtime.registerAtom({ files: "card" });
    expect(document.head.querySelector("style")).not.toBeNull();

    runtime.configure({ target: preview });

    expect(document.head.querySelector("style")).toBeNull();
    expect(preview.head.textContent).toContain("color:red");
  });

  it("returns inline CSS without writing to head", () => {
    const runtime = createStyleRuntime({
      initialStyles: { card: ".card{color:red}" },
    });
    const atom = runtime.registerAtom({ files: "card", placement: "inline" });

    expect(atom.getSnapshot().styles[0].css).toContain("color:red");
    expect(document.head.querySelector("style")).toBeNull();
  });

  it("fails conflicting inline names and recovers after retry", () => {
    const runtime = createStyleRuntime();
    const first = runtime.registerAtom({
      inlineStyle: { name: "card", css: ".card{color:red}" },
    });
    const second = runtime.registerAtom({
      inlineStyle: { name: "card", css: ".card{color:blue}" },
    });

    expect(second.getSnapshot().status).toBe("failed");
    expect(second.getSnapshot().errors[0].code).toBe("conflict");
    first.dispose();
    second.retry();
    expect(second.getSnapshot().status).toBe("ready");
    expect(document.head.textContent).toContain("color:blue");
  });

  it("updates CSS when the only inline owner changes", () => {
    const runtime = createStyleRuntime();
    const atom = runtime.registerAtom({
      inlineStyle: { name: "card", css: ".card{color:red}" },
    });
    atom.update({
      inlineStyle: { name: "card", css: ".card{color:blue}" },
    });

    expect(atom.getSnapshot().status).toBe("ready");
    expect(document.head.textContent).toContain("color:blue");
    expect(document.head.textContent).not.toContain("color:red");
  });

  it("adopts a server-rendered style instead of duplicating it", () => {
    document.head.innerHTML =
      '<style data-styled-atom-namespace="app" data-styled-atom-key="file:card:10000" data-styled-atom-precedence="10000">.card{color:red}</style>';
    const runtime = createStyleRuntime({
      namespace: "app",
      initialStyles: { card: ".card{color:red}" },
    });
    runtime.registerAtom({ files: "card" });

    expect(document.head.querySelectorAll("style")).toHaveLength(1);
  });
});

describe("style collector", () => {
  it("sorts, deduplicates and escapes collected styles", () => {
    const collector = createStyleCollector();
    collector.collect({
      key: "inline:card:2",
      kind: "inline",
      name: "card",
      namespace: "app",
      css: ".card{content:\"</style>\"}",
      precedence: 2,
      nonce: "a&b",
    });
    collector.collect({
      key: "file:reset:0",
      kind: "file",
      name: "reset",
      namespace: "app",
      css: "*{box-sizing:border-box}",
      precedence: 0,
    });

    const tags = collector.getStyleTags();
    expect(tags.indexOf("file:reset:0")).toBeLessThan(
      tags.indexOf("inline:card:2"),
    );
    expect(tags).toContain('nonce="a&amp;b"');
    expect(tags).not.toContain('content:"</style>"');
  });
});
