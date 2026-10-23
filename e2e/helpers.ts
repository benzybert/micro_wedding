import { expect, type Browser, type Page } from "@playwright/test";

/** Fill the one-time setup form (names pre-filled by default; override when a test needs specific ones). */
export async function runSetup(page: Page, a = "נועה", b = "דן", date = "2027-03-23") {
  await page.waitForURL("**/onboarding");
  await page.fill("input[name=partnerAName]", a);
  await page.fill("input[name=partnerBName]", b);
  await page.fill("input[name=weddingDate]", date);
  await page.click("main form button[type=submit]");
  await page.waitForURL("**/who");
}

export async function pick(page: Page, who: "a" | "b") {
  await page.goto("/who");
  await page.locator(`button[name=who][value=${who}]`).click();
  await page.waitForURL("**/home");
  await expect(page.locator("h1")).toBeVisible();
}

/** Delete the wedding through the real UI so every test starts from a site that needs setup. */
export async function resetSite(browser: Browser) {
  const ctx = await browser.newContext({ locale: "he-IL" });
  const page = await ctx.newPage();
  await page.goto("/");
  await page.waitForURL(/\/(onboarding|who)$/);
  if (page.url().endsWith("/who")) {
    await page.locator("button[name=who][value=a]").click();
    await page.waitForURL("**/home");
    await page.goto("/settings");
    await page.fill("input[name=confirm]", "מחיקה");
    await page.getByRole("button", { name: "מחיקה לצמיתות" }).click();
    await page.waitForURL("**/onboarding");
  }
  await ctx.close();
}

/** Two devices: one per partner, on the same site. */
export async function twoPlanners(browser: Browser, a = "נועה", b = "דן") {
  const ctxA = await browser.newContext({ locale: "he-IL" });
  const pageA = await ctxA.newPage();
  await pageA.goto("/");
  await runSetup(pageA, a, b);
  await pick(pageA, "a");

  const ctxB = await browser.newContext({ locale: "he-IL" });
  const pageB = await ctxB.newPage();
  await pick(pageB, "b");
  return { a: pageA, b: pageB };
}
