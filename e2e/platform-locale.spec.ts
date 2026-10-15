import { test, expect, type Page } from "@playwright/test";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "POST,GET,OPTIONS",
};
async function setup(page: Page) {
  const calls: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/functions/")) calls.push(request.url());
  });
  await page.route("**/rest/v1/**", (route) =>
    route.fulfill({ headers: cors, json: [] }),
  );
  return calls;
}
for (const width of [375, 768, 1280])
  test(`Language covers real navigation, hard-coded labels and accessibility at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    const calls = await setup(page);
    await page.goto("/e2e/fixtures/platform-locale.html");
    await expect(
      page.getByRole("heading", { name: "Annuler", exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "BA test", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Gbɛ́ru", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Tire mɛro", exact: true }),
    ).toBeVisible();
    await expect(page.getByTestId("draft")).toHaveAttribute(
      "placeholder",
      "Gbɛ́ru",
    );
    await expect(page.getByTestId("draft")).toHaveAttribute(
      "aria-label",
      "Gbɛ́ru",
    );
    await expect(page.locator("html")).toHaveAttribute("lang", "bba");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/locale-ba-${width}.png`,
      fullPage: true,
    });
    await page.getByRole("button", { name: "FR test", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Annuler", exact: true }),
    ).toBeVisible();
    await expect(page.getByTestId("draft")).toHaveAttribute(
      "placeholder",
      "Annuler",
    );
    expect(calls).toHaveLength(0);
  });
test("Inputs, caret, editable documents and original language text survive toggling", async ({
  page,
}) => {
  await setup(page);
  await page.goto("/e2e/fixtures/platform-locale.html");
  const input = page.getByTestId("draft");
  await input.fill("Annuler 1200 Ali ne donne pas");
  await input.focus();
  await input.evaluate((node: HTMLInputElement) =>
    node.setSelectionRange(4, 4),
  );
  await page.evaluate(() => (window as any).__locale("ba"));
  await expect(
    page.getByRole("heading", { name: "Gbɛ́ru", exact: true }),
  ).toBeVisible();
  await expect(input).toHaveValue("Annuler 1200 Ali ne donne pas");
  expect(
    await input.evaluate((node: HTMLInputElement) => node.selectionStart),
  ).toBe(4);
  await expect(page.getByTestId("textarea")).toHaveValue("Annuler");
  await expect(page.getByTestId("editor")).toHaveText("Annuler");
  await expect(page.getByTestId("original")).toHaveText("Annuler");
  await expect(page.getByTestId("native")).toHaveText("Mɛɛribu");
  await expect(page.getByTestId("unknown")).toHaveText(
    "Phrase sans référence : Ali ne donne pas 1200.",
  );
});
test("React updates, late children and portals translate and restore without changing node identity", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await setup(page);
  await page.goto("/e2e/fixtures/platform-locale.html");
  await page.getByRole("button", { name: "BA test", exact: true }).click();
  await page.getByTestId("change").click();
  await expect(page.getByTestId("changing")).toHaveText("Wiru");
  await page.getByTestId("late").click();
  await expect(page.getByTestId("late-content")).toHaveText("Bɔru");
  await expect(page.getByTestId("late-content")).toHaveAttribute(
    "title",
    "Bɔru",
  );
  await page.getByTestId("portal").click();
  await expect(page.getByTestId("portal-content")).toHaveText("Bɔru");
  await page.getByTestId("remove").click();
  await expect(page.getByTestId("late-content")).toHaveCount(0);
  await page.getByRole("button", { name: "FR test", exact: true }).click();
  await expect(page.getByTestId("changing")).toHaveText("Retour");
  await expect(page.getByTestId("portal-content")).toHaveText("Supprimer");
  expect(errors).toEqual([]);
});
test("The saved language works after reload without AI or a language catalogue fetch", async ({
  page,
}) => {
  const calls = await setup(page);
  await page.goto("/e2e/fixtures/platform-locale.html");
  await page.getByRole("button", { name: "BA test", exact: true }).click();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Gbɛ́ru", exact: true }),
  ).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("fitila-lang"))).toBe(
    "ba",
  );
  expect(calls).toHaveLength(0);
});
test("Translator keeps its typed original and model result when the interface language changes", async ({
  page,
}) => {
  await setup(page);
  await page.route("**/data/translation-memory.json", (route) =>
    route.fulfill({ json: { v: 1, pairs: [], fr2ba: {}, ba2fr: {} } }),
  );
  await page.route("**/data/dictionary*", (route) =>
    route.fulfill({ json: [] }),
  );
  await page.route("**/functions/v1/byt5-bariba-translate", (route) =>
    route.fulfill({
      headers: cors,
      json: { translation: "Annuler", method: "test-model" },
    }),
  );
  await page.goto("/e2e/fixtures/platform-locale.html?translator=1");
  await page.getByRole("checkbox").first().uncheck();
  const input = page.getByPlaceholder("Écrivez en français…");
  await input.fill("Annuler Ali 1200 ne donne pas");
  await page
    .getByRole("button", { name: "Traduire le texte", exact: true })
    .click();
  await expect(
    page.locator("[data-i18n-preserve]").filter({ hasText: "Annuler" }),
  ).toHaveCount(2);
  await page.evaluate(() => (window as any).__locale("ba"));
  await expect(page.locator("html")).toHaveAttribute("lang", "bba");
  await expect(
    page.locator("[data-i18n-preserve]").filter({ hasText: "Annuler" }),
  ).toHaveCount(2);
  await expect(
    page.getByRole("button", { name: "Comparer aux ressources", exact: true }),
  ).toHaveCount(0);
});
