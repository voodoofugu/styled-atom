import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/e2e/");
});

test("loads, swaps and releases an external stylesheet without an unstyled gap", async ({
  page,
}) => {
  const requests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/e2e/link-asset.css")) {
      requests.push(request.url());
    }
  });
  const result = await page.evaluate(async () => {
    const probe = document.createElement("div");
    probe.className = "link-probe";
    document.body.append(probe);
    const load = (href: string, root: ParentNode = document.head) =>
      new Promise<HTMLLinkElement>((resolve, reject) => {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = href;
        link.addEventListener("load", () => resolve(link), { once: true });
        link.addEventListener("error", () => reject(new Error(href)), {
          once: true,
        });
        root.append(link);
      });
    const first = await load("/e2e/link-asset.css?version=red");
    const initial = getComputedStyle(probe).color;
    const nextLink = load("/e2e/link-asset.css?version=blue&delay=120");
    await new Promise((resolve) => setTimeout(resolve, 30));
    const duringSwap = getComputedStyle(probe).color;
    const linksDuringSwap = document.head.querySelectorAll(
      'link[rel="stylesheet"]',
    ).length;
    const second = await nextLink;
    const loadedNext = getComputedStyle(probe).color;
    first.remove();
    const afterSwap = getComputedStyle(probe).color;
    second.remove();
    const afterRelease = getComputedStyle(probe).color;
    probe.remove();
    return {
      afterRelease,
      afterSwap,
      duringSwap,
      initial,
      linksDuringSwap,
      loadedNext,
    };
  });

  expect(result).toEqual({
    initial: "rgb(180, 32, 48)",
    duringSwap: "rgb(180, 32, 48)",
    linksDuringSwap: 2,
    loadedNext: "rgb(16, 112, 96)",
    afterSwap: "rgb(16, 112, 96)",
    afterRelease: "rgb(0, 0, 0)",
  });
  expect(requests).toHaveLength(2);
});

test("loads an external stylesheet inside a ShadowRoot and reports failures", async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    const host = document.createElement("div");
    document.body.append(host);
    const shadow = host.attachShadow({ mode: "open" });
    const probe = document.createElement("span");
    probe.className = "link-probe";
    shadow.append(probe);
    const load = (href: string) =>
      new Promise<"load" | "error">((resolve) => {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = href;
        link.addEventListener("load", () => resolve("load"), { once: true });
        link.addEventListener("error", () => resolve("error"), { once: true });
        shadow.prepend(link);
      });
    const loaded = await load("/e2e/link-asset.css?version=red");
    const color = getComputedStyle(probe).color;
    const failed = await load("/e2e/link-asset.css?version=missing");
    host.remove();
    return { color, failed, loaded };
  });

  expect(result).toEqual({
    loaded: "load",
    color: "rgb(180, 32, 48)",
    failed: "error",
  });
});
