import { expect, test } from "@playwright/test";
import { resetSite, twoPlanners } from "./helpers";

test.beforeEach(async ({ browser }) => {
  await resetSite(browser);
});

const DAY = 86_400_000;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY).toISOString();

/** What tools/whatsapp-pull writes. */
function exportFile(chats: { name: string; phone: string; lastMessageAt: string }[]) {
  const json = { format: "micro-wedding/whatsapp-chats", version: 1, exportedAt: new Date().toISOString(), chats };
  return { name: "whatsapp-chats.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(json)) };
}

const chats = [
  { name: "דנה כהן", phone: "972501112222", lastMessageAt: daysAgo(10) },
  { name: "יוסי לוי", phone: "972502223333", lastMessageAt: daysAgo(90) },
  { name: "מיכל אברהם", phone: "972503334444", lastMessageAt: daysAgo(150) },
  { name: "ישן מאוד", phone: "972504445555", lastMessageAt: daysAgo(400) },
  { name: "כבר אורח", phone: "972505556666", lastMessageAt: daysAgo(5) },
];

test("WhatsApp import: window → yes/no review → guests; rejected people are not offered again", async ({ browser }) => {
  const { a: page } = await twoPlanners(browser, "נועה", "דן");

  // someone already on the list, saved in a different phone format
  await page.goto("/guests/new");
  await page.fill("input[name=name]", "כבר אורח");
  await page.fill("input[name=phone]", "050-555-6666");
  await page.click("main form:has(input[name=name]) button[type=submit]");
  await page.waitForURL("**/guests");

  await page.goto("/guests/import");
  await page.getByRole("link", { name: "ייבוא מוואטסאפ" }).click();
  await page.waitForURL("**/guests/import/whatsapp");

  // upload with the default window (half a year): 400 days ago is outside, the existing guest is skipped
  await page.setInputFiles("input[type=file]", exportFile(chats));
  await page.getByRole("button", { name: "טעינה לרשימת האישור" }).click();
  await expect(page.getByRole("status").filter({ hasText: "נוספו 3 אנשים לרשימת האישור" })).toContainText("1 כבר ברשימת האורחים");
  await expect(page.getByRole("status").filter({ hasText: "נוספו 3 אנשים" })).toContainText("1 מחוץ לטווח הזמן");

  const review = page.locator("li", { hasText: "הודעה אחרונה" });
  await expect(review).toHaveCount(3);
  // newest first
  await expect(review.nth(0)).toContainText("דנה כהן");
  await expect(review.nth(0)).toContainText("050-111-2222");
  await expect(review.nth(2)).toContainText("מיכל אברהם");

  // yes for Dana, no for Yossi, Michal stays undecided
  await page.getByRole("button", { name: "כן, להוסיף את דנה כהן" }).click();
  await page.getByRole("button", { name: "לא, לא להוסיף את יוסי לוי" }).click();
  await expect(page.getByText("1 כן")).toBeVisible();
  await page.selectOption("select[name=tier]", "must");
  await page.selectOption("select[name=side]", "a");
  await page.getByRole("button", { name: "שמירת ההחלטות" }).click();
  await expect(page.getByText("1 נוספו לרשימת האורחים")).toBeVisible();
  await expect(page.getByText("1 נדחו")).toBeVisible();
  await expect(page.getByText("1 עדיין ממתינים להחלטה")).toBeVisible();
  await expect(page.locator("li", { hasText: "הודעה אחרונה" })).toHaveCount(1);

  // re-uploading the same file: Dana is a guest now, Yossi was rejected, Michal is still waiting
  await page.setInputFiles("input[type=file]", exportFile(chats));
  await page.getByRole("button", { name: "טעינה לרשימת האישור" }).click();
  await expect(page.getByRole("status").filter({ hasText: "לא נוספו אנשים חדשים" })).toContainText("2 כבר ברשימת האורחים");
  await expect(page.locator("li", { hasText: "הודעה אחרונה" })).toHaveCount(1);
  await expect(page.locator("li", { hasText: "יוסי לוי" })).toHaveCount(0);

  // finishing the review lands on the guest list, filtered to the people who came from WhatsApp
  await page.getByRole("button", { name: "כן, להוסיף את מיכל אברהם" }).click();
  await page.getByRole("button", { name: "שמירת ההחלטות" }).click();
  await page.waitForURL("**/guests?q=*");
  await expect(page.getByRole("link", { name: "דנה כהן" })).toBeVisible();
  await expect(page.getByRole("link", { name: "מיכל אברהם" })).toBeVisible();
  await expect(page.getByText("יוסי לוי")).toHaveCount(0);
  // the manually added guest does not carry the WhatsApp label, so the filter leaves it out
  await expect(page.getByRole("link", { name: "כבר אורח" })).toHaveCount(0);
  await expect(page.getByText("וואטסאפ").first()).toBeVisible();
});

test("WhatsApp import: a wrong file is refused with a clear message and nothing is stored", async ({ browser }) => {
  const { a: page } = await twoPlanners(browser, "נועה", "דן");
  await page.goto("/guests/import/whatsapp");

  await page.setInputFiles("input[type=file]", { name: "x.json", mimeType: "application/json", buffer: Buffer.from('{"hello":1}') });
  await page.getByRole("button", { name: "טעינה לרשימת האישור" }).click();
  await expect(page.locator("p[role=alert]")).toContainText("לא מגיע מהכלי whatsapp-pull");
  await expect(page.locator("li", { hasText: "הודעה אחרונה" })).toHaveCount(0);
});

test("WhatsApp import: both partners share one approval list, and a device that has not picked who it is is sent to /who", async ({ browser }) => {
  const { a, b } = await twoPlanners(browser, "נועה", "דן");
  await a.goto("/guests/import/whatsapp");
  await a.setInputFiles("input[type=file]", exportFile([{ name: "סודי פרטי", phone: "972509998888", lastMessageAt: daysAgo(3) }]));
  await a.getByRole("button", { name: "טעינה לרשימת האישור" }).click();
  await expect(a.getByText("סודי פרטי")).toBeVisible();

  // the other partner, on another device, sees the same person and can decide
  await b.goto("/guests/import/whatsapp");
  await expect(b.getByText("סודי פרטי")).toBeVisible();
  await b.getByRole("button", { name: "לא, לא להוסיף את סודי פרטי" }).click();
  await b.getByRole("button", { name: "שמירת ההחלטות" }).click();
  // the last person was decided, so the review card is gone: the page itself must say what happened
  await expect(b.getByRole("status").filter({ hasText: "אין מי שממתין להחלטה" })).toContainText("1 אדם נדחה");
  await a.reload();
  await expect(a.getByText("סודי פרטי")).toHaveCount(0);

  // a device with no identity gets nothing, not even the page
  const anon = await (await browser.newContext({ locale: "he-IL" })).newPage();
  await anon.goto("/guests/import/whatsapp");
  await expect(anon).toHaveURL(/\/who$/);
  await expect(anon.getByText("סודי פרטי")).toHaveCount(0);
});
