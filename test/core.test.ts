import { afterEach, describe, expect, it, vi } from "vitest";

import { createStyleCollector, createStyleRuntime } from "../src";
import { resetStyleRegistryForTests } from "../src/registry";

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
  vi.unstubAllEnvs();
  document.head.replaceChildren();
  document.body.replaceChildren();
  resetStyleRegistryForTests();
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

  it("preserves loader source maps and adds a stable development source URL", () => {
    const sourceMap =
      "data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImNhcmQuc2NzcyJdLCJtYXBwaW5ncyI6IkFBQUEifQ==";
    const atom = createStyleRuntime({
      namespace: "mapped",
      initialStyles: {
        card: `.card{color:red}\n/*# sourceMappingURL=${sourceMap} */`,
      },
    }).registerAtom({ files: "card" });
    const css = document.head.querySelector("style")?.textContent ?? "";

    expect(atom.getSnapshot().status).toBe("ready");
    expect(css).toContain(`/*# sourceMappingURL=${sourceMap} */`);
    expect(css).toContain("/*# sourceURL=styled-atom/file/card.css */");
  });

  it("keeps an explicit source URL instead of appending another one", () => {
    createStyleRuntime({
      namespace: "explicit-source",
      sourceURL: false,
      initialStyles: {
        card: ".card{color:red}\n/*# sourceURL=app/styles/card.css */",
      },
    }).registerAtom({ files: "card" });
    const css = document.head.querySelector("style")?.textContent ?? "";

    expect(css.match(/sourceURL=/g)).toHaveLength(1);
    expect(css).toContain("sourceURL=app/styles/card.css");
  });

  it("omits generated source URLs in production unless explicitly enabled", () => {
    vi.stubEnv("NODE_ENV", "production");
    createStyleRuntime({
      namespace: "production-source",
      initialStyles: { card: ".card{color:red}" },
    }).registerAtom({ files: "card" });
    createStyleRuntime({
      namespace: "forced-source",
      sourceURL: true,
      initialStyles: { button: ".button{color:blue}" },
    }).registerAtom({ files: "button" });

    const productionCss = document.head.querySelector(
      'style[data-styled-atom-namespace="production-source"]',
    )?.textContent;
    const forcedCss = document.head.querySelector(
      'style[data-styled-atom-namespace="forced-source"]',
    )?.textContent;

    expect(productionCss).not.toContain("sourceURL=");
    expect(forcedCss).toContain("sourceURL=styled-atom/file/button.css");
  });

  it("reconfigures generated source URLs without reloading CSS", async () => {
    const loader = vi.fn(() => ".card{color:red}");
    const runtime = createStyleRuntime({
      loader,
      namespace: "source-toggle",
      sourceURL: false,
    });
    runtime.registerAtom({ files: "card" });
    await flush();
    expect(document.head.textContent).not.toContain("sourceURL=");

    runtime.configure({ sourceURL: true });

    expect(document.head.textContent).toContain(
      "sourceURL=styled-atom/file/card.css",
    );
    expect(loader).toHaveBeenCalledOnce();
  });

  it("shares ownership across runtimes with the same namespace", () => {
    const firstRuntime = createStyleRuntime({
      namespace: "workspace",
      initialStyles: { card: ".card{color:red}" },
    });
    const secondRuntime = createStyleRuntime({
      namespace: "workspace",
      initialStyles: { card: ".card{color:red}" },
    });
    const first = firstRuntime.registerAtom({ files: "card" });
    const second = secondRuntime.registerAtom({ files: "card" });

    expect(document.head.querySelectorAll("style")).toHaveLength(1);
    first.dispose();
    expect(document.head.querySelectorAll("style")).toHaveLength(1);
    second.dispose();
    expect(document.head.querySelectorAll("style")).toHaveLength(0);
  });

  it("reports cross-runtime CSS conflicts without overwriting the first owner", () => {
    const firstRuntime = createStyleRuntime({
      namespace: "workspace",
      initialStyles: { card: ".card{color:red}" },
    });
    const secondRuntime = createStyleRuntime({
      namespace: "workspace",
      initialStyles: { card: ".card{color:blue}" },
    });
    const first = firstRuntime.registerAtom({ files: "card" });
    const second = secondRuntime.registerAtom({ files: "card" });

    expect(second.getSnapshot().status).toBe("failed");
    expect(second.getSnapshot().errors[0].code).toBe("conflict");
    expect(document.head.textContent).toContain("color:red");
    expect(document.head.textContent).not.toContain("color:blue");

    first.dispose();
    second.retry();
    expect(second.getSnapshot().status).toBe("ready");
    expect(document.head.textContent).toContain("color:blue");
  });

  it("keeps equal style names isolated by namespace", () => {
    const first = createStyleRuntime({
      namespace: "host",
      initialStyles: { card: ".card{color:red}" },
    }).registerAtom({ files: "card" });
    const second = createStyleRuntime({
      namespace: "plugin",
      initialStyles: { card: ".card{color:blue}" },
    }).registerAtom({ files: "card" });

    expect(first.getSnapshot().status).toBe("ready");
    expect(second.getSnapshot().status).toBe("ready");
    expect(document.head.querySelectorAll("style")).toHaveLength(2);
  });

  it("reports incompatible CSP nonces across runtime owners", () => {
    const first = createStyleRuntime({
      namespace: "workspace",
      nonce: "request-a",
      initialStyles: { card: ".card{color:red}" },
    }).registerAtom({ files: "card" });
    const second = createStyleRuntime({
      namespace: "workspace",
      nonce: "request-b",
      initialStyles: { card: ".card{color:red}" },
    }).registerAtom({ files: "card" });

    expect(first.getSnapshot().status).toBe("ready");
    expect(second.getSnapshot().status).toBe("failed");
    expect(document.head.querySelector("style")?.nonce).toBe("request-a");
  });

  it("reports incompatible precedence for one cross-runtime identity", () => {
    const first = createStyleRuntime({
      namespace: "workspace",
      order: ["card"],
      initialStyles: { card: ".card{color:red}" },
    }).registerAtom({ files: "card" });
    const second = createStyleRuntime({
      namespace: "workspace",
      initialStyles: { card: ".card{color:red}" },
    }).registerAtom({ files: "card" });

    expect(first.getSnapshot().status).toBe("ready");
    expect(second.getSnapshot().status).toBe("failed");
    expect(String(second.getSnapshot().errors[0].error)).toContain(
      "different cascade precedence",
    );
    expect(document.head.querySelectorAll("style")).toHaveLength(1);
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

  it("uses public identity as the deterministic fallback for equal precedence", () => {
    const runtime = createStyleRuntime({
      namespace: "fallback-order",
      initialStyles: {
        zebra: ".zebra{color:black}",
        alpha: ".alpha{color:white}",
      },
    });
    const zebra = runtime.registerAtom({ files: "zebra" });
    const alpha = runtime.registerAtom({ files: "alpha" });
    const keys = Array.from(document.head.querySelectorAll("style")).map((node) =>
      node.getAttribute("data-styled-atom-key"),
    );

    expect(keys).toEqual(["file:alpha:10000", "file:zebra:10000"]);
    zebra.dispose();
    alpha.dispose();
  });

  it("inspects active atoms in deterministic cascade order", () => {
    const runtime = createStyleRuntime({
      namespace: "inspectable",
      order: ["base", "card"],
      initialStyles: {
        base: "*{box-sizing:border-box}",
        card: ".card{color:red}",
      },
    });
    runtime.registerAtom({ files: ["card", "base"] });

    expect(runtime.inspect()).toEqual({
      namespace: "inspectable",
      atoms: 1,
      entries: [
        expect.objectContaining({
          name: "base",
          localOwners: 1,
          precedence: 0,
          status: "ready",
          target: "document",
        }),
        expect.objectContaining({
          name: "card",
          localOwners: 1,
          precedence: 1,
          status: "ready",
          target: "document",
        }),
      ],
    });
  });

  it("loads asynchronously and exposes loading then ready", async () => {
    const css = deferred<string>();
    const runtime = createStyleRuntime({ loader: () => css.promise });
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
    const runtime = createStyleRuntime({ loader });
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

    runtime.configure({ loader: () => ".card{color:green}" });
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

  it("shares ownership across runtimes inside one ShadowRoot", () => {
    const host = document.createElement("section");
    document.body.append(host);
    const shadow = host.attachShadow({ mode: "open" });
    const options = {
      namespace: "shared-shadow",
      target: shadow,
      initialStyles: { card: ".card{color:red}" },
    };
    const first = createStyleRuntime(options).registerAtom({ files: "card" });
    const second = createStyleRuntime(options).registerAtom({ files: "card" });

    expect(shadow.querySelectorAll("style")).toHaveLength(1);
    first.dispose();
    expect(shadow.querySelectorAll("style")).toHaveLength(1);
    second.dispose();
    expect(shadow.querySelectorAll("style")).toHaveLength(0);
  });

  it("isolates equal identities mounted into different targets", () => {
    const preview = document.implementation.createHTMLDocument("preview");
    const host = createStyleRuntime({
      namespace: "surfaces",
      initialStyles: { card: ".card{color:red}" },
    }).registerAtom({ files: "card" });
    const frame = createStyleRuntime({
      namespace: "surfaces",
      target: preview,
      initialStyles: { card: ".card{color:blue}" },
    }).registerAtom({ files: "card" });

    expect(host.getSnapshot().status).toBe("ready");
    expect(frame.getSnapshot().status).toBe("ready");
    expect(document.head.textContent).toContain("color:red");
    expect(preview.head.textContent).toContain("color:blue");
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

  it("reports an SSR adoption mismatch without overwriting server CSS", () => {
    document.head.innerHTML =
      '<style data-styled-atom-namespace="app" data-styled-atom-key="file:card:10000" data-styled-atom-precedence="10000">.card{color:red}</style>';
    const atom = createStyleRuntime({
      namespace: "app",
      initialStyles: { card: ".card{color:blue}" },
    }).registerAtom({ files: "card" });

    expect(atom.getSnapshot().status).toBe("failed");
    expect(String(atom.getSnapshot().errors[0].error)).toContain(
      "does not match the client CSS",
    );
    expect(document.head.textContent).toContain("color:red");
    expect(document.head.textContent).not.toContain("color:blue");
  });

  it("preserves and validates a server-rendered CSP nonce", () => {
    document.head.innerHTML =
      '<style nonce="server-nonce" data-styled-atom-namespace="app" data-styled-atom-key="file:card:10000" data-styled-atom-precedence="10000">.card{color:red}</style>';
    const matching = createStyleRuntime({
      namespace: "app",
      nonce: "server-nonce",
      initialStyles: { card: ".card{color:red}" },
    }).registerAtom({ files: "card" });
    const conflicting = createStyleRuntime({
      namespace: "app",
      nonce: "client-nonce",
      initialStyles: { card: ".card{color:red}" },
    }).registerAtom({ files: "card" });

    expect(matching.getSnapshot().status).toBe("ready");
    expect(conflicting.getSnapshot().status).toBe("failed");
    expect(document.head.querySelector("style")?.nonce).toBe("server-nonce");
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
