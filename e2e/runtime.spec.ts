import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/e2e/");
});

test("applies deterministic cascade order in a real browser", async ({ page }) => {
  const result = await page.evaluate(async () => {
    const { createStyleRuntime } = await import("/dist/esm/index.js?cascade");
    const node = document.createElement("div");
    node.className = "probe";
    document.body.append(node);
    const runtime = createStyleRuntime({
      namespace: "cascade-browser",
      order: ["base", "override"],
      initialStyles: {
        base: ".probe{color:rgb(255, 0, 0)}",
        override: ".probe{color:rgb(0, 0, 255)}",
      },
    });
    const override = runtime.registerAtom({ files: "override" });
    const base = runtime.registerAtom({ files: "base" });
    const keys = Array.from(document.head.querySelectorAll("style")).map((style) =>
      style.getAttribute("data-styled-atom-key"),
    );
    const color = getComputedStyle(node).color;
    base.dispose();
    override.dispose();
    return { color, keys };
  });

  expect(result.keys).toEqual(["file:base:0", "file:override:1"]);
  expect(result.color).toBe("rgb(0, 0, 255)");
});

test("styles ShadowRoot and iframe documents without leaking to the host", async ({ page }) => {
  const result = await page.evaluate(async () => {
    const { createStyleRuntime } = await import("/dist/esm/index.js?targets");

    const host = document.createElement("div");
    document.body.append(host);
    const shadow = host.attachShadow({ mode: "open" });
    const shadowProbe = document.createElement("span");
    shadowProbe.className = "probe";
    shadow.append(shadowProbe);
    const shadowRuntime = createStyleRuntime({
      namespace: "shadow-browser",
      target: shadow,
      initialStyles: { card: ".probe{color:rgb(10, 20, 30)}" },
    });
    const shadowAtom = shadowRuntime.registerAtom({ files: "card" });

    const frame = document.createElement("iframe");
    const frameLoaded = new Promise<void>((resolve) => {
      frame.addEventListener("load", () => resolve(), { once: true });
    });
    frame.srcdoc = '<span class="probe">frame</span>';
    document.body.append(frame);
    await frameLoaded;
    const frameDocument = frame.contentDocument!;
    const frameRuntime = createStyleRuntime({
      namespace: "frame-browser",
      target: frameDocument,
      nonce: "browser-nonce",
      initialStyles: { card: ".probe{color:rgb(40, 50, 60)}" },
    });
    const frameAtom = frameRuntime.registerAtom({ files: "card" });

    const value = {
      shadowColor: getComputedStyle(shadowProbe).color,
      frameColor: frame.contentWindow!.getComputedStyle(
        frameDocument.querySelector(".probe")!,
      ).color,
      frameNonce: frameDocument.head.querySelector("style")?.nonce,
      hostStyles: document.head.querySelectorAll("style").length,
    };
    shadowAtom.dispose();
    frameAtom.dispose();
    return value;
  });

  expect(result).toEqual({
    shadowColor: "rgb(10, 20, 30)",
    frameColor: "rgb(40, 50, 60)",
    frameNonce: "browser-nonce",
    hostStyles: 0,
  });
});

test("shares ownership between two physical ESM bundle instances", async ({ page }) => {
  const result = await page.evaluate(async () => {
    const firstPackage = await import("/dist/esm/index.js?physical-copy=one");
    const secondPackage = await import("/dist/esm/index.js?physical-copy=two");
    const options = {
      namespace: "physical-copies",
      initialStyles: { card: ".physical{color:rgb(1, 2, 3)}" },
    };
    const first = firstPackage.createStyleRuntime(options).registerAtom({ files: "card" });
    const second = secondPackage.createStyleRuntime(options).registerAtom({ files: "card" });
    const mounted = document.head.querySelectorAll("style").length;
    first.dispose();
    const afterFirstDispose = document.head.querySelectorAll("style").length;
    second.dispose();
    const afterSecondDispose = document.head.querySelectorAll("style").length;
    return { mounted, afterFirstDispose, afterSecondDispose };
  });

  expect(result).toEqual({
    mounted: 1,
    afterFirstDispose: 1,
    afterSecondDispose: 0,
  });
});

test("gives physical package copies distinct default namespaces", async ({ page }) => {
  const result = await page.evaluate(async () => {
    const firstPackage = await import("/dist/esm/index.js?default-copy=one");
    const secondPackage = await import("/dist/esm/index.js?default-copy=two");
    const firstRuntime = firstPackage.createStyleRuntime({
      initialStyles: { card: ".card{color:red}" },
    });
    const secondRuntime = secondPackage.createStyleRuntime({
      initialStyles: { card: ".card{color:blue}" },
    });
    const first = firstRuntime.registerAtom({ files: "card" });
    const second = secondRuntime.registerAtom({ files: "card" });
    const value = {
      namespaces: [firstRuntime.namespace, secondRuntime.namespace],
      statuses: [first.getSnapshot().status, second.getSnapshot().status],
      styles: document.head.querySelectorAll("style").length,
    };
    first.dispose();
    second.dispose();
    return value;
  });

  expect(result.namespaces[0]).not.toBe(result.namespaces[1]);
  expect(result.statuses).toEqual(["ready", "ready"]);
  expect(result.styles).toBe(2);
});

test("adopts server CSS and rejects a conflicting physical copy", async ({ page }) => {
  const result = await page.evaluate(async () => {
    document.head.insertAdjacentHTML(
      "beforeend",
      '<style data-styled-atom-namespace="hydrated" data-styled-atom-key="file:card:10000" data-styled-atom-precedence="10000">.card{color:red}</style>',
    );
    const firstPackage = await import("/dist/esm/index.js?hydrate-copy=one");
    const secondPackage = await import("/dist/esm/index.js?hydrate-copy=two");
    const first = firstPackage.createStyleRuntime({
      namespace: "hydrated",
      initialStyles: { card: ".card{color:red}" },
    }).registerAtom({ files: "card" });
    const second = secondPackage.createStyleRuntime({
      namespace: "hydrated",
      initialStyles: { card: ".card{color:blue}" },
    }).registerAtom({ files: "card" });
    const value = {
      count: document.head.querySelectorAll("style").length,
      css: document.head.textContent,
      firstStatus: first.getSnapshot().status,
      secondStatus: second.getSnapshot().status,
      errorCode: second.getSnapshot().errors[0]?.code,
    };
    first.dispose();
    second.dispose();
    return value;
  });

  expect(result.count).toBe(1);
  expect(result.css).toContain("color:red");
  expect(result.css).not.toContain("color:blue");
  expect(result.firstStatus).toBe("ready");
  expect(result.secondStatus).toBe("failed");
  expect(result.errorCode).toBe("conflict");
});

test("mounts and releases one thousand atoms without residue", async ({ page }) => {
  const result = await page.evaluate(async () => {
    const { createStyleRuntime } = await import("/dist/esm/index.js?scale");
    const runtime = createStyleRuntime({ namespace: "scale-browser" });
    const started = performance.now();
    const atoms = Array.from({ length: 1_000 }, (_, index) =>
      runtime.registerAtom({
        inlineStyle: {
          name: `atom-${index}`,
          css: `.atom-${index}{--index:${index}}`,
        },
      }),
    );
    const mountDuration = performance.now() - started;
    const mounted = runtime.inspect();
    const releaseStarted = performance.now();
    atoms.forEach((atom) => atom.dispose());
    const releaseDuration = performance.now() - releaseStarted;
    return {
      mountDuration,
      releaseDuration,
      mountedAtoms: mounted.atoms,
      mountedEntries: mounted.entries.length,
      styleElementsAfterRelease: document.head.querySelectorAll("style").length,
      remainingEntries: runtime.inspect().entries.length,
    };
  });

  expect(result.mountedAtoms).toBe(1_000);
  expect(result.mountedEntries).toBe(1_000);
  expect(result.styleElementsAfterRelease).toBe(0);
  expect(result.remainingEntries).toBe(0);
  expect(result.mountDuration).toBeLessThan(10_000);
  expect(result.releaseDuration).toBeLessThan(10_000);
});

test("hydrates collected CSS and follows a portal into an iframe", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  await page.goto("/e2e/react.html");
  await page.waitForFunction(() => window.styledAtomFixtureReady === true);

  const result = await page.evaluate(() => {
    const frame = document.querySelector("iframe")!;
    const frameDocument = frame.contentDocument!;
    const portalProbe = frameDocument.querySelector("[data-portal-probe]")!;
    const hydrationProbe = document.querySelector("[data-hydration-probe]")!;
    return {
      portalColor: frame.contentWindow!.getComputedStyle(portalProbe).color,
      portalStyles: frameDocument.querySelectorAll(
        'style[data-styled-atom-namespace="inline"]',
      ).length,
      hostPortalStyles: document.head.querySelectorAll(
        'style[data-styled-atom-namespace="inline"]',
      ).length,
      hydrationColor: getComputedStyle(hydrationProbe).color,
      hydrationStyles: document.head.querySelectorAll(
        'style[data-styled-atom-namespace="browser-hydration"]',
      ).length,
    };
  });

  expect(result).toEqual({
    portalColor: "rgb(12, 34, 56)",
    portalStyles: 1,
    hostPortalStyles: 0,
    hydrationColor: "rgb(78, 90, 123)",
    hydrationStyles: 1,
  });
  expect(consoleErrors).toEqual([]);
});

test("applies nonce-bearing styles under a real CSP and blocks missing nonces", async ({ page }) => {
  await page.goto("/e2e/csp.html");
  await page.waitForFunction(() => window.styledAtomCspReady === true);

  const result = await page.evaluate(() => ({
    allowedColor: getComputedStyle(
      document.querySelector("[data-csp-allowed]")!,
    ).color,
    blockedColor: getComputedStyle(
      document.querySelector("[data-csp-blocked]")!,
    ).color,
    allowedNonce: document.head.querySelector(
      'style[data-styled-atom-namespace="csp-allowed"]',
    )?.nonce,
    blockedNonce: document.head.querySelector(
      'style[data-styled-atom-namespace="csp-blocked"]',
    )?.nonce,
  }));

  expect(result.allowedColor).toBe("rgb(11, 22, 33)");
  expect(result.blockedColor).not.toBe("rgb(44, 55, 66)");
  expect(result.allowedNonce).toBe("browser-csp");
  expect(result.blockedNonce).toBe("");
});
