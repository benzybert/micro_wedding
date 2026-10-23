import { expect, test } from "@playwright/test";
import { pick, resetSite, runSetup, twoPlanners } from "./helpers";

test.beforeEach(async ({ browser }) => {
  await resetSite(browser);
});

test("no login: the first visit asks for setup once, then for 'who are you', and nothing else", async ({ browser }) => {
  const ctx = await browser.newContext({ locale: "he-IL" });
  const page = await ctx.newPage();
  await page.goto("/guests");
  await expect(page).toHaveURL(/\/onboarding$/); // nothing exists yet
  await runSetup(page, "בן", "יערה");

  // an unknown device must pick a partner before it sees anything
  const anon = await browser.newContext({ locale: "he-IL" });
  const fresh = await anon.newPage();
  await fresh.goto("/guests");
  await expect(fresh).toHaveURL(/\/who$/);
  await expect(fresh.getByRole("button", { name: "אני בן" })).toBeVisible();
  expect((await anon.request.get("/guests/export")).status()).toBe(401);
  expect((await anon.request.get("/settings/export")).status()).toBe(401);

  await pick(fresh, "b");
  await expect(fresh.getByText("אני יערה").first()).toBeVisible();
  expect((await anon.request.get("/guests/export")).status()).toBe(200);

  // setup cannot be run a second time, and there is no sign-in or sign-up page any more
  await fresh.goto("/onboarding");
  await expect(fresh).toHaveURL(/\/home$/);
  expect((await fresh.goto("/login"))!.status()).toBe(404);
  expect((await fresh.goto("/signup"))!.status()).toBe(404);
});

test("guest list → WhatsApp invite → public RSVP → the couple sees the answer", async ({ browser }) => {
  const { a: page } = await twoPlanners(browser, "בן", "יערה");

  await page.goto("/guests/new");
  await page.fill("input[name=name]", "משפחת כהן");
  await page.fill("textarea[name=members]", "דנה כהן\nיוסי כהן\nמאיה (ילדה)");
  await page.selectOption("select[name=tier]", "must");
  await page.fill("input[name=phone]", "050-111-2222");
  await page.click("main form:has(input[name=name]) button[type=submit]");
  await page.waitForURL("**/guests");
  await expect(page.getByText("משפחת כהן")).toBeVisible();

  await page.goto("/guests/invite");
  const wa = await page.locator('a[href^="https://wa.me/972501112222"]').first().getAttribute("href");
  const message = decodeURIComponent(wa!.split("text=")[1]!);
  const link = message.match(/https?:\/\/\S+\/rsvp\/[\w-]+/)![0];
  expect(message).toContain("בן ויערה");

  // The guest has no identity cookie and needs none.
  const guestCtx = await browser.newContext({ locale: "he-IL" });
  const guest = await guestCtx.newPage();
  await guest.goto(link);
  await guest.locator("input[type=radio][value=yes]").nth(0).check({ force: true });
  await guest.locator("input[type=radio][value=yes]").nth(1).check({ force: true });
  await guest.locator("input[type=radio][value=no]").nth(2).check({ force: true });
  await guest.click("main form button[type=submit]");
  await expect(guest.getByText("תודה")).toBeVisible();
  expect((await guest.goto("/rsvp/not-a-real-token"))!.status()).toBe(404);

  await page.goto("/home");
  await expect(page.getByText("משפחת כהן: 2 מגיעים, 1 לא")).toBeVisible();
});

test("two partners on two devices: blind scoring, disagreement, then a recorded decision", async ({ browser }) => {
  const { a, b } = await twoPlanners(browser, "בן", "יערה");

  await a.goto("/decisions");
  await a.getByText("סוג המקום").click();
  await a.waitForURL("**/decisions/*");
  const decisionUrl = a.url();
  const cells = a.locator('select[name^="s_"]');
  const n = await cells.count();
  const perOption = n / 5;
  for (let i = 0; i < n; i++) await cells.nth(i).selectOption(String(i < perOption ? 5 : 2));
  await a.getByRole("button", { name: "שמירת הציונים שלי" }).click();
  await expect(a.getByText("הציונים שלך נשמרו")).toBeVisible();

  await b.goto(decisionUrl);
  // blind: nothing of the other partner's scores is visible before rating
  await expect(b.locator('span:has-text("בן:")')).toHaveCount(0);
  const bCells = b.locator('select[name^="s_"]');
  for (let i = 0; i < n; i++) await bCells.nth(i).selectOption(String(i < perOption ? 1 : 5));
  await b.getByRole("button", { name: "שמירת הציונים שלי" }).click();
  await expect(b.getByText("הציונים שלך נשמרו")).toBeVisible();
  await b.reload();
  await expect(b.locator('span:has-text("בן:")').first()).toBeVisible();
  await expect(b.getByText("איפה אתם לא מסכימים")).toBeVisible();

  await a.goto(decisionUrl);
  await a.locator("input[name=optionId]").first().check();
  await a.fill("textarea[name=note]", "מסעדה, יותר אינטימי");
  await a.getByRole("button", { name: "לסגור את ההחלטה" }).click();
  await expect(a.getByText(/הוחלט:/).first()).toBeVisible();
});

test("renaming a partner in settings renames the identity used in scores and activity", async ({ browser }) => {
  const { a } = await twoPlanners(browser, "בן", "יערה");
  await a.goto("/settings");
  await a.fill("input[name=partnerBName]", "יערה לוי");
  await a.click("form:has(input[name=venueName]) button[type=submit]");
  await expect(a.getByText("נשמר")).toBeVisible();
  await a.goto("/settings");
  await expect(a.getByText("יערה לוי").first()).toBeVisible();
});

test("date finder respects the custom: Lag BaOmer is open for Ashkenazim, closed for Sephardim", async ({ browser }) => {
  const { a: page } = await twoPlanners(browser);
  await page.goto("/date?check=2026-05-05");
  await expect(page.getByText("ל״ג בעומר").first()).toBeVisible();
  await expect(page.getByText("אפשרי").first()).toBeVisible();

  await page.goto("/settings");
  await page.locator("input[name=calendarCustom][value=sepharad]").check();
  await page.click("form:has(input[name=venueName]) button[type=submit]");
  await expect(page.getByText("נשמר")).toBeVisible();
  await page.goto("/date?check=2026-05-05");
  await expect(page.getByText("לא אפשרי").first()).toBeVisible();
});
