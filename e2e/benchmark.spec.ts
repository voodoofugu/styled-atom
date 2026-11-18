import { expect, test } from "@playwright/test";

type Measurements = Record<string, number>;

const median = (values: readonly number[]) => {
  const sorted = [...values].sort((first, second) => first - second);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
};

test.beforeEach(async ({ page }) => {
  await page.goto("/e2e/");
});

test("reports representative lifecycle benchmarks", async ({ page }, testInfo) => {
  const samples = await page.evaluate(async () => {
    const { compileStyleAtomStyles, createStyleRuntime } = await import(
      "/dist/esm/index.js?benchmarks"
    );
    const measure = (run: () => void) => {
      const started = performance.now();
      run();
      return performance.now() - started;
    };
    const results: Measurements[] = [];

    for (let sample = 0; sample < 7; sample += 1) {
      const compileInline = measure(() => {
        for (let index = 0; index < 1_000; index += 1) {
          compileStyleAtomStyles(`compiled-${index}`, {
            display: "grid",
            gap: index % 24,
            "&:hover": { color: "tomato" },
            "@media (width < 40rem)": { padding: 8 },
          });
        }
      });
      const uniqueRuntime = createStyleRuntime({
        namespace: `benchmark-unique-${sample}`,
      });
      let uniqueAtoms: ReturnType<typeof uniqueRuntime.registerAtom>[] = [];
      const uniqueMount = measure(() => {
        uniqueAtoms = Array.from({ length: 1_000 }, (_, index) =>
          uniqueRuntime.registerAtom({
            inlineStyle: {
              name: `unique-${index}`,
              css: `.unique-${index}{--index:${index}}`,
            },
          }),
        );
      });
      const uniqueRelease = measure(() => {
        uniqueAtoms.forEach((atom) => atom.dispose());
      });

      const sharedRuntime = createStyleRuntime({
        namespace: `benchmark-shared-${sample}`,
        initialStyles: { shared: ".shared{color:red}" },
      });
      let sharedAtoms: ReturnType<typeof sharedRuntime.registerAtom>[] = [];
      const sharedMount = measure(() => {
        sharedAtoms = Array.from({ length: 1_000 }, () =>
          sharedRuntime.registerAtom({ files: "shared" }),
        );
      });
      const sharedRelease = measure(() => {
        sharedAtoms.forEach((atom) => atom.dispose());
      });

      const toggleRuntime = createStyleRuntime({
        namespace: `benchmark-toggle-${sample}`,
      });
      const toggle = measure(() => {
        for (let round = 0; round < 100; round += 1) {
          const atoms = Array.from({ length: 50 }, (_, index) =>
            toggleRuntime.registerAtom({
              inlineStyle: {
                name: `toggle-${index}`,
                css: `.toggle-${index}{--round:${round}}`,
              },
            }),
          );
          atoms.forEach((atom) => atom.dispose());
        }
      });

      results.push({
        compileInline,
        uniqueMount,
        uniqueRelease,
        sharedMount,
        sharedRelease,
        toggle,
      });
    }
    return results;
  });

  const measurements = Object.fromEntries(
    Object.keys(samples[0] ?? {}).map((name) => [
      name,
      median(samples.map((sample) => sample[name] ?? 0)),
    ]),
  );
  await testInfo.attach("benchmark-median.json", {
    body: JSON.stringify(measurements, null, 2),
    contentType: "application/json",
  });
  console.info("styled-atom benchmark median (ms)", measurements);

  expect(measurements.uniqueMount).toBeLessThan(10_000);
  expect(measurements.compileInline).toBeLessThan(10_000);
  expect(measurements.uniqueRelease).toBeLessThan(10_000);
  expect(measurements.sharedMount).toBeLessThan(10_000);
  expect(measurements.sharedRelease).toBeLessThan(10_000);
  expect(measurements.toggle).toBeLessThan(10_000);
  expect(
    await page.locator('style[sa-namespace^="benchmark-"]').count(),
  ).toBe(0);
});

test("compares style text with cold and cached stylesheet links", async ({
  page,
}, testInfo) => {
  const samples = await page.evaluate(async () => {
    const probe = document.createElement("div");
    probe.className = "link-probe";
    document.body.append(probe);
    const css = [
      ".link-probe{color:rgb(180, 32, 48)}",
      ...Array.from(
        { length: 1_000 },
        (_, index) => `.link-rule-${index}{--link-rule:${index}}`,
      ),
    ].join("\n");
    const load = (href: string) =>
      new Promise<HTMLLinkElement>((resolve, reject) => {
        const link = document.createElement("link");
        const started = performance.now();
        link.rel = "stylesheet";
        link.href = href;
        link.addEventListener(
          "load",
          () => {
            link.dataset.duration = String(performance.now() - started);
            resolve(link);
          },
          { once: true },
        );
        link.addEventListener("error", () => reject(new Error(href)), {
          once: true,
        });
        document.head.append(link);
      });
    const results: Measurements[] = [];

    for (let sample = 0; sample < 7; sample += 1) {
      const style = document.createElement("style");
      const styleStarted = performance.now();
      style.textContent = css;
      document.head.append(style);
      void getComputedStyle(probe).color;
      const styleText = performance.now() - styleStarted;
      style.remove();

      const cold = await load(
        `/e2e/link-asset.css?version=red&rules=1000&sample=${sample}`,
      );
      void getComputedStyle(probe).color;
      const linkCold = Number(cold.dataset.duration);
      cold.remove();

      const cachedHref =
        "/e2e/link-asset.css?version=red&rules=1000&cache=1&benchmark=cached";
      const prime = await load(cachedHref);
      prime.remove();
      const cached = await load(cachedHref);
      void getComputedStyle(probe).color;
      const linkCached = Number(cached.dataset.duration);
      cached.remove();

      results.push({ linkCached, linkCold, styleText });
    }
    probe.remove();
    return results;
  });
  const measurements = Object.fromEntries(
    Object.keys(samples[0] ?? {}).map((name) => [
      name,
      median(samples.map((sample) => sample[name] ?? 0)),
    ]),
  );

  await testInfo.attach("external-stylesheet-median.json", {
    body: JSON.stringify(measurements, null, 2),
    contentType: "application/json",
  });
  console.info("external stylesheet benchmark median (ms)", measurements);

  expect(measurements.styleText).toBeLessThan(10_000);
  expect(measurements.linkCold).toBeLessThan(10_000);
  expect(measurements.linkCached).toBeLessThan(10_000);
});
