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

test("shares iframe-document ownership across JavaScript realms", async ({ page }) => {
  const result = await page.evaluate(async () => {
    const frame = document.createElement("iframe");
    const loaded = new Promise<void>((resolve) => {
      frame.addEventListener("load", () => resolve(), { once: true });
    });
    frame.srcdoc = '<span class="realm-probe">realm</span>';
    document.body.append(frame);
    await loaded;
    const frameWindow = frame.contentWindow!;
    const frameDocument = frame.contentDocument!;
    const hostPackage = await import("/dist/esm/index.js?host-realm");
    const hostAtom = hostPackage
      .createStyleRuntime({
        namespace: "cross-realm",
        target: frameDocument,
        initialStyles: {
          card: ".realm-probe{color:rgb(61, 71, 81)}",
        },
      })
      .registerAtom({ files: "card" });

    await frameWindow.eval(`(async () => {
      const packageCopy = await import("/dist/esm/index.js?iframe-realm");
      const runtime = packageCopy.createStyleRuntime({
        namespace: "cross-realm",
        target: document,
        initialStyles: { card: ".realm-probe{color:rgb(61, 71, 81)}" },
      });
      window.crossRealmAtom = runtime.registerAtom({ files: "card" });
    })()`);

    const mounted = frameDocument.head.querySelectorAll(
      'style[data-styled-atom-namespace="cross-realm"]',
    ).length;
    hostAtom.dispose();
    const afterHostDispose = frameDocument.head.querySelectorAll(
      'style[data-styled-atom-namespace="cross-realm"]',
    ).length;
    const colorAfterHostDispose = frameWindow.getComputedStyle(
      frameDocument.querySelector(".realm-probe")!,
    ).color;
    (
      frameWindow as typeof frameWindow & {
        crossRealmAtom?: { dispose: () => void };
      }
    ).crossRealmAtom?.dispose();
    const hostDefaultRuntime = hostPackage.createStyleRuntime({
      target: frameDocument,
      initialStyles: { private: ".realm-probe{background:rgb(1, 2, 3)}" },
    });
    const hostDefaultAtom = hostDefaultRuntime.registerAtom({ files: "private" });
    const iframeDefault = (await frameWindow.eval(`(async () => {
      const packageCopy = await import("/dist/esm/index.js?iframe-default-realm");
      const runtime = packageCopy.createStyleRuntime({
        target: document,
        initialStyles: { private: ".realm-probe{background:rgb(4, 5, 6)}" },
      });
      const atom = runtime.registerAtom({ files: "private" });
      window.defaultRealmAtom = atom;
      return { namespace: runtime.namespace, status: atom.getSnapshot().status };
    })()`)) as { namespace: string; status: string };
    const defaultStyles = frameDocument.head.querySelectorAll(
      'style[data-styled-atom-key^="file:private:"]',
    ).length;
    const hostDefaultStatus = hostDefaultAtom.getSnapshot().status;
    hostDefaultAtom.dispose();
    (
      frameWindow as typeof frameWindow & {
        defaultRealmAtom?: { dispose: () => void };
      }
    ).defaultRealmAtom?.dispose();
    return {
      mounted,
      afterHostDispose,
      colorAfterHostDispose,
      afterBothDispose: frameDocument.head.querySelectorAll(
        'style[data-styled-atom-namespace="cross-realm"]',
      ).length,
      defaultNamespacesDiffer:
        hostDefaultRuntime.namespace !== iframeDefault.namespace,
      defaultStatuses: [hostDefaultStatus, iframeDefault.status],
      defaultStyles,
    };
  });

  expect(result).toEqual({
    mounted: 1,
    afterHostDispose: 1,
    colorAfterHostDispose: "rgb(61, 71, 81)",
    afterBothDispose: 0,
    defaultNamespacesDiffer: true,
    defaultStatuses: ["ready", "ready"],
    defaultStyles: 2,
  });
});

test("applies compiled inline CSS as valid browser rules", async ({ page }) => {
  const result = await page.evaluate(async () => {
    const { compileStyleAtomStyles, createStyleRuntime } = await import(
      "/dist/esm/index.js?compiler-contract"
    );
    const parent = document.createElement("article");
    parent.className = "compiler-probe";
    parent.innerHTML = '<span class="child active">compiled</span>';
    document.body.append(parent);
    const css = compileStyleAtomStyles("compiler-probe", {
      display: ["-webkit-box", "grid"],
      gap: 6,
      "&:has(> .child.active)": { color: "rgb(91, 101, 111)" },
      "@supports (display: grid)": {
        ".child:is(.active, .selected)": { fontWeight: 700 },
      },
      "@media (width >= 1px)": { padding: 9 },
      "@keyframes compiler-pulse": {
        from: { opacity: 0 },
        to: { opacity: 1 },
      },
    });
    const atom = createStyleRuntime({ namespace: "compiler-contract" }).registerAtom({
      inlineStyle: { name: "compiler-probe", css },
    });
    const style = document.head.querySelector(
      'style[data-styled-atom-namespace="compiler-contract"]',
    ) as HTMLStyleElement | null;
    const parentStyle = getComputedStyle(parent);
    const childStyle = getComputedStyle(parent.querySelector(".child")!);
    const value = {
      status: atom.getSnapshot().status,
      display: parentStyle.display,
      gap: parentStyle.gap,
      color: parentStyle.color,
      padding: parentStyle.padding,
      fontWeight: childStyle.fontWeight,
      ruleCount: style?.sheet?.cssRules.length ?? 0,
    };
    atom.dispose();
    return value;
  });

  expect(result).toEqual({
    status: "ready",
    display: "grid",
    gap: "6px",
    color: "rgb(91, 101, 111)",
    padding: "9px",
    fontWeight: "700",
    ruleCount: 5,
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

test("shares one style between one thousand owners", async ({ page }) => {
  const result = await page.evaluate(async () => {
    const { createStyleRuntime } = await import("/dist/esm/index.js?shared-scale");
    const runtime = createStyleRuntime({
      namespace: "shared-scale-browser",
      initialStyles: { shared: ".shared{color:rgb(7, 8, 9)}" },
    });
    const atoms = Array.from({ length: 1_000 }, () =>
      runtime.registerAtom({ files: "shared" }),
    );
    const mounted = {
      atoms: runtime.inspect().atoms,
      entries: runtime.inspect().entries.length,
      localOwners: runtime.inspect().entries[0]?.owners,
      elements: document.head.querySelectorAll(
        'style[data-styled-atom-namespace="shared-scale-browser"]',
      ).length,
    };
    atoms.slice(0, -1).forEach((atom) => atom.dispose());
    const beforeLastRelease = document.head.querySelectorAll(
      'style[data-styled-atom-namespace="shared-scale-browser"]',
    ).length;
    atoms.at(-1)?.dispose();
    return {
      mounted,
      beforeLastRelease,
      afterLastRelease: document.head.querySelectorAll(
        'style[data-styled-atom-namespace="shared-scale-browser"]',
      ).length,
      remainingEntries: runtime.inspect().entries.length,
    };
  });

  expect(result).toEqual({
    mounted: {
      atoms: 1_000,
      entries: 1,
      localOwners: 1_000,
      elements: 1,
    },
    beforeLastRelease: 1,
    afterLastRelease: 0,
    remainingEntries: 0,
  });
});

test("survives repeated mount and release cycles without registry residue", async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    const { createStyleRuntime } = await import("/dist/esm/index.js?cycles");
    const runtime = createStyleRuntime({
      namespace: "cycle-browser",
      initialStyles: { card: ".cycle{color:rgb(20, 30, 40)}" },
    });
    let maximumElements = 0;
    for (let cycle = 0; cycle < 250; cycle += 1) {
      const first = runtime.registerAtom({ files: "card" });
      const second = runtime.registerAtom({ files: "card" });
      maximumElements = Math.max(
        maximumElements,
        document.head.querySelectorAll(
          'style[data-styled-atom-namespace="cycle-browser"]',
        ).length,
      );
      first.dispose();
      second.dispose();
    }
    const final = runtime.inspect();
    return {
      maximumElements,
      atoms: final.atoms,
      entries: final.entries.length,
      elements: document.head.querySelectorAll(
        'style[data-styled-atom-namespace="cycle-browser"]',
      ).length,
    };
  });

  expect(result).toEqual({
    maximumElements: 1,
    atoms: 0,
    entries: 0,
    elements: 0,
  });
});

test("replaces CSS in place and keeps computed styles current", async ({ page }) => {
  const result = await page.evaluate(async () => {
    const { createStyleRuntime } = await import("/dist/esm/index.js?replace");
    const probe = document.createElement("div");
    probe.className = "replace-probe";
    document.body.append(probe);
    const runtime = createStyleRuntime({
      namespace: "replace-browser",
      initialStyles: { card: ".replace-probe{color:rgb(1, 2, 3)}" },
    });
    const atom = runtime.registerAtom({ files: "card" });
    const beforeElement = document.head.querySelector(
      'style[data-styled-atom-namespace="replace-browser"]',
    );
    const beforeColor = getComputedStyle(probe).color;
    runtime.replace([
      { file: "card", css: ".replace-probe{color:rgb(4, 5, 6)}" },
    ]);
    const afterElement = document.head.querySelector(
      'style[data-styled-atom-namespace="replace-browser"]',
    );
    const value = {
      beforeColor,
      afterColor: getComputedStyle(probe).color,
      sameElement: beforeElement === afterElement,
      elements: document.head.querySelectorAll(
        'style[data-styled-atom-namespace="replace-browser"]',
      ).length,
    };
    atom.dispose();
    return value;
  });

  expect(result).toEqual({
    beforeColor: "rgb(1, 2, 3)",
    afterColor: "rgb(4, 5, 6)",
    sameElement: true,
    elements: 1,
  });
});

test("exposes loader source maps to Chromium developer tools", async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== "chromium", "The CSS domain is a Chromium CDP API.");
  const session = await page.context().newCDPSession(page);
  const headers: Array<{ sourceURL: string; sourceMapURL?: string }> = [];
  session.on("CSS.styleSheetAdded", ({ header }) => headers.push(header));
  await session.send("DOM.enable");
  await session.send("CSS.enable");
  const sourceMap =
    "data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImNhcmQuc2NzcyJdLCJzb3VyY2VzQ29udGVudCI6WyIuY2FyZCB7IGNvbG9yOiByZWQ7IH0iXSwibWFwcGluZ3MiOiJBQUFBIiwibmFtZXMiOltdfQ==";

  await page.evaluate(async (map) => {
    const { createStyleRuntime } = await import("/dist/esm/index.js?source-map");
    createStyleRuntime({
      namespace: "source-map-browser",
      initialStyles: {
        card: `.card{color:red}\n/*# sourceMappingURL=${map} */`,
      },
    }).registerAtom({ files: "card" });
  }, sourceMap);

  await expect
    .poll(() =>
      headers.find((header) => header.sourceURL.includes("styled-atom/file/card.css")),
    )
    .toBeTruthy();
  const header = headers.find((item) =>
    item.sourceURL.includes("styled-atom/file/card.css"),
  );
  expect(header?.sourceMapURL).toBe(sourceMap);
});

test("moves an atom between documents without leaving the old target behind", async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    const { createStyleRuntime } = await import("/dist/esm/index.js?target-move");
    const frame = document.createElement("iframe");
    const loaded = new Promise<void>((resolve) => {
      frame.addEventListener("load", () => resolve(), { once: true });
    });
    frame.srcdoc = '<div class="moving">frame</div>';
    document.body.append(frame);
    await loaded;
    const frameDocument = frame.contentDocument!;
    const runtime = createStyleRuntime({
      namespace: "moving-browser",
      initialStyles: { card: ".moving{color:rgb(31, 41, 51)}" },
    });
    const atom = runtime.registerAtom({ files: "card" });
    const hostBefore = document.head.querySelectorAll(
      'style[data-styled-atom-namespace="moving-browser"]',
    ).length;
    atom.update({ files: "card", target: frameDocument });
    const value = {
      hostBefore,
      hostAfter: document.head.querySelectorAll(
        'style[data-styled-atom-namespace="moving-browser"]',
      ).length,
      frameAfter: frameDocument.head.querySelectorAll(
        'style[data-styled-atom-namespace="moving-browser"]',
      ).length,
      frameColor: frame.contentWindow!.getComputedStyle(
        frameDocument.querySelector(".moving")!,
      ).color,
    };
    atom.dispose();
    return {
      ...value,
      frameAfterDispose: frameDocument.head.querySelectorAll(
        'style[data-styled-atom-namespace="moving-browser"]',
      ).length,
    };
  });

  expect(result).toEqual({
    hostBefore: 1,
    hostAfter: 0,
    frameAfter: 1,
    frameColor: "rgb(31, 41, 51)",
    frameAfterDispose: 0,
  });
});

test("hydrates collected CSS and follows a portal into an iframe", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  await page.goto("/e2e/react.html");
  await page.waitForFunction(
    () =>
      window.styledAtomFixtureReady === true ||
      window.styledAtomFixtureError !== undefined,
  );
  expect(await page.evaluate(() => window.styledAtomFixtureError)).toBeUndefined();

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
