import { expect, test } from "@playwright/test";

test("renders through an App Router boundary and reuses hydration CSS", async ({
  page,
  request,
}) => {
  const response = await request.get("/");
  const serverHtml = await response.text();

  expect(response.ok()).toBe(true);
  expect(serverHtml).toContain("Rendered by an App Router Server Component");
  expect(serverHtml).toContain("data-styled-atom-signature");
  expect(serverHtml).toContain("rgb(96, 64, 160)");

  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));

  await page.goto("/");
  const serverCard = page.locator("[data-server-card]");
  const hydrationCard = page.locator("[data-hydration-card]");
  await expect(hydrationCard).toHaveAttribute("data-hydrated", "true");
  await expect(serverCard).toHaveCSS("color", "rgb(38, 85, 115)");
  await expect(hydrationCard).toHaveCSS("color", "rgb(96, 64, 160)");
  await expect(page.locator("style[data-styled-atom-signature]"))
    .toHaveCount(2);

  await page.getByRole("button", { name: "update style" }).click();
  await expect(hydrationCard).toHaveCSS("color", "rgb(12, 118, 92)");
  await expect(page.locator("style[data-styled-atom-signature]"))
    .toHaveCount(1);
  expect(errors).toEqual([]);
});
