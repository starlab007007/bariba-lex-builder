import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
const localeEntries = JSON.parse(
  readFileSync(
    new URL("../src/data/locales/platform.json", import.meta.url),
    "utf8",
  ),
).entries;
const cancelEntry = localeEntries.find(
  (entry: any) => entry.fr.trim().toLowerCase() === "annuler",
);
const closeEntry = localeEntries.find((entry: any) => entry.fr.trim().toLowerCase() === "fermer");
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "POST,GET,OPTIONS",
};
test("Names and every form label follow the interface language while submission data stays intact", async ({ page }) => {
  await setup(page);
  await page.goto("/e2e/fixtures/platform-locale.html");
  await expect(page.getByTestId("fixed-name")).toHaveText("Baatɔnum");
  await expect(page.getByTestId("forms").getByRole("heading")).toHaveText("Baatɔnum · Baatɔnum");
  await page.getByRole("button", {name:"BA test", exact:true}).click();
  await expect(page.getByTestId("native-field")).toHaveAttribute("placeholder", "Gbɛ́ru");
  await expect(page.getByTestId("native-area")).toHaveAttribute("aria-label", "Gbɛ́ru");
  await expect(page.locator("legend")).toHaveText("Gbɛ́ru");
  await expect(page.locator("optgroup")).toHaveAttribute("label", "Gbɛ́ru");
  await expect(page.getByTestId("submit-label")).toHaveValue("Gbɛ́ru");
  await page.getByTestId("submit-label").evaluate(node => node.setAttribute("name", "action"));
  await expect(page.getByTestId("submit-label")).toHaveValue("Annuler");
  await page.getByTestId("submit-label").evaluate(node => node.removeAttribute("name"));
  await expect(page.getByTestId("submit-label")).toHaveValue("Gbɛ́ru");
  await expect(page.getByTestId("submit-payload")).toHaveValue("Annuler");
  await expect(page.getByTestId("native-field")).toHaveValue("Bariba Ali 1200 ne donne pas");
  await expect(page.getByTestId("native-area")).toHaveValue("Bàátɔ̀nú : Ali ne donne pas 1200");
  await expect(page.getByTestId("language-select")).toHaveValue("ba");
  await expect(page.getByTestId("original-name")).toHaveText("Bariba · Bàátɔ̀nú");
  await expect(page.getByTestId("forms").locator("svg")).toHaveAttribute("aria-label", "Gbɛ́ru");
  await page.getByRole("button", {name:"FR test", exact:true}).click();
  await expect(page.getByTestId("native-area")).toHaveAttribute("placeholder", "Annuler");
  await expect(page.getByTestId("submit-label")).toHaveValue("Annuler");
  await expect(page.getByTestId("fixed-name")).toHaveText("Baatɔnum");
});
async function setup(page: Page) {
  const calls: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/functions/v1/")) calls.push(request.url());
  });
  await page.route("**/rest/v1/**", (route) =>
    route.fulfill({ headers: cors, json: [] }),
  );
  return calls;
}
test("The real dictionary contribution form uses sourced labels instead of old hard-coded translations", async ({ page }) => {
  await setup(page);
  await page.goto("/dictionary");
  await page.getByRole("button", {name:"Baatɔnum", exact:true}).click();
  const propose = page.getByRole("button", {name:"De yɛnu wɛɛru", exact:true});
  await expect(propose).toBeVisible();
  await propose.click();
  await expect(page.getByRole("heading", {name:"Yɛnu wɛɛru", exact:true})).toBeVisible();
  await expect(page.getByText("Baatɔnum yɛnu *", {exact:true})).toBeVisible();
  await expect(page.getByText("Fi ɔ̀rɔ̀ tuntun kún", {exact:true})).toHaveCount(0);
  await page.getByRole("button", {name:closeEntry.ba, exact:true}).click();
  await page.getByRole("button", {name:"Français", exact:true}).click();
  await page.getByRole("button", {name:"Proposer un mot", exact:true}).click();
  await expect(page.getByRole("heading", {name:"Nouveau mot", exact:true})).toBeVisible();
  await expect(page.getByText("Mot Baatɔnum *", {exact:true})).toBeVisible();
});
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

async function adminSetup(page: Page, existing = false) {
  await setup(page);
  await page.addInitScript(() => {
    const id = "00000000-0000-4000-8000-000000000001",
      now = Math.floor(Date.now() / 1000),
      payload = btoa(
        JSON.stringify({
          sub: id,
          exp: now + 3600,
          iat: now,
          aud: "authenticated",
          role: "authenticated",
        }),
      );
    localStorage.setItem(
      "sb-dvswhjawiooprghzeyol-auth-token",
      JSON.stringify({
        access_token: "eyJhbGciOiJIUzI1NiJ9." + payload + ".test",
        refresh_token: "test-refresh",
        token_type: "bearer",
        expires_at: now + 3600,
        expires_in: 3600,
        user: {
          id,
          email: "admin@fitila.test",
          app_metadata: { provider: "email", providers: ["email"] },
          user_metadata: {},
          aud: "authenticated",
          created_at: new Date().toISOString(),
        },
      }),
    );
  });
  await page.route("**/rest/v1/user_roles**", (route) =>
    route.fulfill({ headers: cors, json: [{ role: "admin" }] }),
  );
  const state: { rows: any[]; writes: any[] } = {
    rows: existing
      ? [
          {
            id: cancelEntry.id,
            fr: cancelEntry.fr,
            ba: "Gbɛru",
            status: "approved",
            revision: 1,
          },
        ]
      : [],
    writes: [],
  };
  await page.route("**/rest/v1/platform_locale_overrides**", async (route) => {
    const request = route.request(),
      params = new URL(request.url()).searchParams;
    if (request.method() === "GET") {
      const rows =
        params.get("status") === "eq.approved"
          ? state.rows.filter((row) => row.status === "approved")
          : state.rows;
      return route.fulfill({ headers: cors, json: rows });
    }
    if (request.method() === "OPTIONS")
      return route.fulfill({ headers: cors, status: 204 });
    const payload = request.postDataJSON();
    state.writes.push(payload);
    if (request.method() === "POST") {
      const rows = (Array.isArray(payload) ? payload : [payload]).map(
        (row) => ({ ...row, revision: 1 }),
      );
      state.rows.push(...rows);
      return route.fulfill({
        headers: cors,
        json: rows.map((row) => ({ id: row.id })),
      });
    }
    const row = state.rows.find((row) => "eq." + row.id === params.get("id"));
    if (!row || "eq." + row.revision !== params.get("revision"))
      return route.fulfill({ headers: cors, json: [] });
    Object.assign(row, payload, { revision: row.revision + 1 });
    return route.fulfill({ headers: cors, json: [{ id: row.id }] });
  });
  return state;
}
async function selectCancel(page: Page) {
  await page
    .getByRole("combobox", { name: "Statut des traductions" })
    .selectOption("all");
  await page
    .getByRole("textbox", { name: "Rechercher un libellé ou un fichier" })
    .fill("Annuler");
  await page
    .getByRole("button")
    .filter({ has: page.getByText("Annuler", { exact: true }) })
    .first()
    .click();
}
test("Administrators must confirm the native translation before publishing it", async ({
  page,
}) => {
  const state = await adminSetup(page);
  await page.goto("/e2e/fixtures/platform-locale.html?admin=1");
  await expect(
    page.getByRole("heading", { name: "Français ↔ Baatɔnum" }),
  ).toBeVisible();
  await selectCancel(page);
  await page.locator("textarea[lang=bba]").fill("Gbɛ́ru");
  const publish = page.getByRole("button", {
    name: "Valider et publier",
    exact: true,
  });
  await expect(publish).toBeDisabled();
  await page.getByRole("checkbox").check();
  await publish.click();
  await expect(page.getByRole("status")).toHaveText(
    "Traduction validée et publiée.",
  );
  expect(state.rows[0].status).toBe("approved");
  expect(state.rows[0].fr).toBe(cancelEntry.fr);
});
test("A stale administrator edit cannot overwrite a newer publication", async ({
  page,
}) => {
  const state = await adminSetup(page, true);
  await page.goto("/e2e/fixtures/platform-locale.html?admin=1");
  await selectCancel(page);
  await page.locator("textarea[lang=bba]").fill("Gbɛ́ru");
  state.rows[0].revision = 2;
  await page.getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "Valider et publier", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "Une autre personne a modifié",
  );
  expect(state.rows[0].ba).toBe("Gbɛru");
});
test("An imported catalogue creates drafts without publishing or overwriting approved entries", async ({
  page,
}) => {
  const state = await adminSetup(page);
  await page.goto("/e2e/fixtures/platform-locale.html?admin=1");
  await expect(
    page.getByRole("heading", { name: "Français ↔ Baatɔnum" }),
  ).toBeVisible();
  await page.getByLabel("Importer le catalogue de traductions").setInputFiles({
    name: "locale.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify([
        { id: cancelEntry.id, fr: cancelEntry.fr, ba: "Gbɛ́ru" },
        { id: "invalid", fr: "Private note", ba: "Private note" },
      ]),
    ),
  });
  await expect(page.getByRole("status")).toContainText("1 brouillons importés");
  expect(state.rows).toHaveLength(1);
  expect(state.rows[0].status).toBe("draft");
});
test("A visitor cannot enter the translation publishing tool", async ({
  page,
}) => {
  await setup(page);
  await page.goto("/e2e/fixtures/platform-locale.html?admin=1");
  await expect(page.getByText("Accès administrateur requis.")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Valider et publier", exact: true }),
  ).toHaveCount(0);
});

test("The real application keeps its language across the main pages and protected route redirects", async ({ page }) => {
  test.setTimeout(180000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await setup(page);
  await page.route("**/functions/v1/**", (route) =>
    route.fulfill({ headers: cors, json: {} }),
  );
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/learn");
  await page.getByRole("button", { name: "Baatɔnum", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "bba");
  await expect(page.getByRole("button", { name: "Tire mɛro", exact: true })).toBeVisible();
  for (const path of ["/learn", "/learn/daily", "/learn/review", "/learn/progress", "/learn/scenes", "/translator", "/ia", "/dunya", "/classe", "/classe/N1", "/dictionary", "/keyboard", "/settings", "/messages", "/auth", "/social", "/creator", "/espace", "/espace/scanner", "/teacher", "/teacher/voice-reading", "/admin/localization"]) {
    await page.goto(path);
    await expect(page.locator("html"), path).toHaveAttribute("lang", "bba");
    await expect(page.locator("main"), path).toBeVisible();
    await expect.poll(async () => (await page.locator("main").innerText()).trim().length, { message: path }).toBeGreaterThan(5);
    await expect(page.getByText(/❌ Une erreur est survenue/), path).toHaveCount(0);
  }
  await page.goto("/learn");
  await page.getByRole("button", { name: "Français", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "fr");
  await expect(page.getByRole("button", { name: "Dictionnaire", exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});
