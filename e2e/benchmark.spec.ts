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
    await page.locator('style[data-styled-atom-namespace^="benchmark-"]').count(),
  ).toBe(0);
});
