import { expect, type Browser, type Page } from "@playwright/test";

let counter = 0;
export const uniqueEmail = (tag: string) => `${tag}.${Date.now()}.${++counter}@example.com`;

export async function signUp(page: Page, name: string, email = uniqueEmail("u")) {
  await page.goto("/signup");
  await page.fill("input[name=name]", name);
  await page.fill("input[name=email]", email);
  await page.fill("input[name=password]", "correct-horse-9");
  await page.click("main form button[type=submit]");
  await page.waitForURL("**/onboarding");
  return email;
}

export async function createWedding(page: Page, partnerB: string, date = "2027-03-23") {
  await page.fill("input[name=partnerBName]", partnerB);
  await page.fill("input[name=weddingDate]", date);
  await page.click("main form button[type=submit]");
  await page.waitForURL("**/home");
  await expect(page.locator("h1")).toBeVisible();
}

export async function newUser(browser: Browser, name: string, partnerB?: string) {
  const context = await browser.newContext({ locale: "he-IL" });
  const page = await context.newPage();
  await signUp(page, name);
  if (partnerB) await createWedding(page, partnerB);
  return { context, page };
}
