import { expect, test } from "@playwright/test";
import { newUser, signUp } from "./helpers";

test("guest list → WhatsApp invite → public RSVP → the couple sees the answer", async ({ browser }) => {
  const { page } = await newUser(browser, "נועה כהן", "דן");

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
  expect(message).toContain("נועה ודן");

  // The guest has no account.
  const guestCtx = await browser.newContext({ locale: "he-IL" });
  const guest = await guestCtx.newPage();
  await guest.goto(link);
  await guest.locator("input[type=radio][value=yes]").nth(0).check({ force: true });
  await guest.locator("input[type=radio][value=yes]").nth(1).check({ force: true });
  await guest.locator("input[type=radio][value=no]").nth(2).check({ force: true });
  await guest.click("main form button[type=submit]");
  await expect(guest.getByText("תודה")).toBeVisible();

  await page.goto("/home");
  await expect(page.getByText("משפחת כהן: 2 מגיעים, 1 לא")).toBeVisible();
  await page.goto("/guests");
  await expect(page.getByText("מגיעים").first()).toBeVisible();
});

test("two partners: blind scoring, disagreement, then a recorded decision", async ({ browser }) => {
  const { page: a } = await newUser(browser, "נועה כהן", "דן");

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

  await a.goto("/settings");
  await a.getByRole("button", { name: /הזמנת דן/ }).click();
  const joinUrl = (await a.locator('p[dir=ltr]:has-text("/join/")').first().innerText()).trim();

  const bCtx = await browser.newContext({ locale: "he-IL" });
  const b = await bCtx.newPage();
  await b.goto(joinUrl);
  await b.getByRole("link", { name: "יצירת חשבון והצטרפות" }).click();
  await b.fill("input[name=name]", "דן לוי");
  await b.fill("input[name=email]", `b.${Date.now()}@example.com`);
  await b.fill("input[name=password]", "correct-horse-9");
  await b.click("main form button[type=submit]");
  await b.waitForURL("**/join/**");
  await b.click("main form button[type=submit]");
  await b.waitForURL("**/home");

  await b.goto(decisionUrl);
  // blind: nothing of noa's scores is visible before dan rates
  await expect(b.locator('span:has-text("נועה:")')).toHaveCount(0);
  const bCells = b.locator('select[name^="s_"]');
  for (let i = 0; i < n; i++) await bCells.nth(i).selectOption(String(i < perOption ? 1 : 5));
  await b.getByRole("button", { name: "שמירת הציונים שלי" }).click();
  await expect(b.getByText("הציונים שלך נשמרו")).toBeVisible();
  await b.reload();
  await expect(b.locator('span:has-text("נועה:")').first()).toBeVisible();
  await expect(b.getByText("איפה אתם לא מסכימים")).toBeVisible();

  await a.goto(decisionUrl);
  await a.locator("input[name=optionId]").first().check();
  await a.fill("textarea[name=note]", "מסעדה, יותר אינטימי");
  await a.getByRole("button", { name: "לסגור את ההחלטה" }).click();
  await expect(a.getByText(/הוחלט:/).first()).toBeVisible();
});

test("tenant isolation: another wedding's ids are simply not found", async ({ browser }) => {
  const { page: a } = await newUser(browser, "נועה כהן", "דן");
  await a.goto("/guests/new");
  await a.fill("input[name=name]", "אורח פרטי");
  await a.click("main form:has(input[name=name]) button[type=submit]");
  await a.waitForURL("**/guests");
  await a.getByRole("link", { name: "אורח פרטי" }).click();
  await a.waitForURL("**/guests/*");
  const guestUrl = new URL(a.url()).pathname;
  await a.goto("/decisions");
  await a.getByText("תאריך החתונה").first().click();
  await a.waitForURL("**/decisions/*");
  const decisionPath = new URL(a.url()).pathname;

  const { page: c } = await newUser(browser, "מישהי אחרת", "מישהו");
  expect((await c.goto(guestUrl))!.status()).toBe(404);
  expect((await c.goto(decisionPath))!.status()).toBe(404);

  // unauthenticated: exports are refused, the app redirects to login
  const anon = await browser.newContext();
  expect((await anon.request.get("/guests/export")).status()).toBe(401);
  expect((await anon.request.get("/settings/export")).status()).toBe(401);
  const page = await anon.newPage();
  await page.goto("/home");
  await expect(page).toHaveURL(/\/login/);
});

test("date finder respects the custom: Lag BaOmer is open for Ashkenazim, closed for Sephardim", async ({ browser }) => {
  const { page } = await newUser(browser, "נועה כהן", "דן");
  await page.goto("/date?check=2026-05-05");
  await expect(page.getByText("ל״ג בעומר").first()).toBeVisible();
  await expect(page.getByText("אפשרי").first()).toBeVisible();

  await page.goto("/settings");
  await page.locator('input[name=calendarCustom][value=sepharad]').check();
  await page.click("form:has(input[name=venueName]) button[type=submit]");
  await expect(page.getByText("נשמר")).toBeVisible();
  await page.goto("/date?check=2026-05-05");
  await expect(page.getByText("לא אפשרי").first()).toBeVisible();
});

test("signup rejects a weak password and a duplicate email", async ({ page }) => {
  await page.goto("/signup");
  await page.fill("input[name=name]", "טסט");
  await page.fill("input[name=email]", "weak@example.com");
  await page.fill("input[name=password]", "short");
  await page.click("main form button[type=submit]");
  await expect(page).toHaveURL(/\/signup/);

  const email = `dup.${Date.now()}@example.com`;
  await signUp(page, "ראשון", email);
  await page.context().clearCookies();
  await page.goto("/signup");
  await page.fill("input[name=name]", "שני");
  await page.fill("input[name=email]", email);
  await page.fill("input[name=password]", "correct-horse-9");
  await page.click("main form button[type=submit]");
  await expect(page.getByText("כבר קיים חשבון")).toBeVisible();
});
