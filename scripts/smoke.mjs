import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { addDays, isoDate } from "../src/booking.js";

const base = process.env.BASE_URL || "http://127.0.0.1:4173";
const browser = await chromium.launch({ headless: true });
const results = [],
  errors = [],
  failedRequests = [];
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  timezoneId: "Asia/Seoul",
});
context.on("page", (page) => {
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("response", (response) => {
    if (
      response.url().startsWith(base) &&
      response.status() >= 400 &&
      !response.url().includes("does-not-exist")
    )
      failedRequests.push(`${response.status()} ${response.url()}`);
  });
});
const page = await context.newPage();
page.setDefaultTimeout(10000);
await mkdir(".tmp", { recursive: true });
const record = (value) => {
  results.push(value);
  console.log("PASS", value);
};
async function noOverflow(target, name) {
  assert.ok(
    await target.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
    `${name}: horizontal overflow`,
  );
}
async function screenshot(target, name) {
  await target.evaluate(async () => {
    document
      .querySelectorAll('img[loading="lazy"]')
      .forEach((image) => (image.loading = "eager"));
    await Promise.all(
      [...document.images].map((image) => image.decode().catch(() => {})),
    );
    await document.fonts.ready;
  });
  await target.screenshot({ path: `.tmp/${name}.png`, fullPage: true });
}
try {
  await page.goto(base);
  assert.match(await page.title(), /Pipe Hotel/);
  assert.equal(await page.locator("h1").count(), 1);
  await screenshot(page, "home-desktop");
  assert.equal(
    await page
      .locator("img")
      .evaluateAll(
        (images) =>
          images.filter((image) => !image.complete || !image.naturalWidth)
            .length,
      ),
    0,
  );
  await noOverflow(page, "desktop home");
  record("Home renders with all images and no horizontal overflow");

  await page.locator('.hero-booking [data-action="booking"]').first().click();
  await page.locator('#booking-form [name="branch"]').selectOption("yeonnam");
  const checkin = addDays(isoDate(), 10);
  await page.locator('[name="checkin"]').fill(checkin);
  await page.locator('[name="checkout"]').fill(addDays(checkin, 3));
  await page.locator('[name="guests"]').selectOption("2");
  await page.locator('[name="rooms"]').selectOption("1");
  await page.locator('[name="promo"]').fill("PIPE15");
  await page.locator('#booking-form button[type="submit"]').click();
  await page.waitForURL("**/rooms?**");
  await page.locator(".room-card").first().waitFor();
  assert.equal(await page.locator(".room-card").count(), 3);
  assert.match(page.url(), /branch=yeonnam/);
  record("Search preserves branch, dates, occupancy and promotion");
  await page.locator("#room-sort").selectOption("high");
  assert.match(
    await page.locator(".room-card h3").first().innerText(),
    /SUPERIOR/,
  );
  await page
    .locator('[data-action="room-filter"][data-id="standard-double"]')
    .click();
  assert.equal(await page.locator(".room-card").count(), 1);
  await page.locator(".room-card h3 a").click();
  await page.waitForURL("**/rooms/standard-double?**");
  await page.locator(".price-total").waitFor();
  assert.match(await page.locator(".price-total").innerText(), /193\.71/);
  record("Filters, sorting and discounted $193.71 total work");
  await screenshot(page, "room-desktop");
  await noOverflow(page, "desktop detail");
  await page.locator("#promo-code").fill("BOGUS");
  await page.locator("#promo-form button").click();
  assert.match(await page.locator("#promo-status").innerText(), /not valid/);
  assert.match(await page.locator(".price-total").innerText(), /224\.40/);
  await page.locator("#promo-code").fill("PIPE15");
  await page.locator("#promo-form button").click();
  assert.match(await page.locator(".price-total").innerText(), /193\.71/);
  record("Invalid promo rejected; valid promo recalculates total");
  await page.locator(".gallery-main").click();
  assert.match(
    await page.locator(".lightbox-controls").innerText(),
    /01 \/ 04/,
  );
  await page.keyboard.press("ArrowRight");
  assert.match(
    await page.locator(".lightbox-controls").innerText(),
    /02 \/ 04/,
  );
  await page.keyboard.press("Escape");
  assert.equal(await page.locator("dialog[open]").count(), 0);
  record("Gallery arrow keys and Escape dismissal work");
  await page.locator('.booking-panel [data-action="reserve"]').click();
  await page.locator('[data-action="confirm-reservation"]').click();
  assert.match(await page.locator(".confirmation-ref").innerText(), /DEMO-/);
  assert.match(
    await page.locator(".form-note").innerText(),
    /No actual booking/,
  );
  await screenshot(page, "reservation-confirmation");
  await page.locator(".modal-close").click();
  record("Reservation reaches clearly labeled demo confirmation");
  await page.goto(`${base}/locations`);
  await page.locator(".location-row").first().waitFor();
  assert.equal(await page.locator(".location-row").count(), 4);
  await page
    .locator('[data-action="branch-filter"][data-id="dongdaemun"]')
    .click();
  assert.equal(await page.locator(".location-row").count(), 1);
  assert.match(
    await page.locator(".location-copy h2").innerText(),
    /DONGDAEMUN/,
  );
  await page.locator('[data-action="branch-filter"][data-id="all"]').click();
  await screenshot(page, "locations-desktop");
  record("Location directory and district filters work");
  await page.goto(`${base}/rooms?branch=myeongdong&guests=8&rooms=1`);
  await page.locator(".empty-state").waitFor();
  record("Capacity mismatch gives actionable empty state");
  await page.goto(`${base}/rooms?branch=yongsan&guests=4&rooms=1`);
  await page.locator(".room-card").waitFor();
  assert.equal(await page.locator(".room-card").count(), 1);
  await page.locator(".room-card h3 a").click();
  await page.waitForURL("**/rooms/studio?**");
  assert.match(await page.locator(".price-total").innerText(), /415\.80/);
  record("Four-person apartment inventory and pricing are consistent");
  await page.goto(`${base}/#offers`);
  await page.locator('[data-action="offer-book"][data-id="long"]').click();
  assert.equal(await page.locator('[name="promo"]').inputValue(), "STAY7");
  const start = await page.locator('[name="checkin"]').inputValue();
  assert.equal(
    await page.locator('[name="checkout"]').inputValue(),
    addDays(start, 7),
  );
  await page.locator('[name="branch"]').selectOption("yeonnam");
  await page.locator('[name="guests"]').selectOption("2");
  await page.locator('#booking-form button[type="submit"]').click();
  await page.waitForURL("**/rooms?**");
  await page.locator(".room-card h3 a").first().click();
  await page.waitForURL("**/rooms/standard-double?**");
  assert.match(await page.locator("#promo-status").innerText(), /20%/);
  record("Long-stay offer sets seven nights and applies 20% discount");
  await page.goto(base);
  await page.locator("#newsletter-email").fill("demo@example.com");
  await page.locator("#newsletter-form button").click();
  await page.locator("#toast.visible").waitFor();
  assert.match(await page.locator("#toast").innerText(), /No email was saved/);
  await page.locator(".language-button").click();
  assert.equal(await page.locator("html").getAttribute("lang"), "ko");
  await page.locator(".currency-button").click();
  assert.match(await page.locator(".branch-card").first().innerText(), /₩/);
  await page.reload();
  await page.locator(".branch-card").first().waitFor();
  assert.equal(await page.locator("html").getAttribute("lang"), "ko");
  await noOverflow(page, "Korean desktop");
  await page.locator(".language-button").click();
  await page.locator(".currency-button").click();
  await page.locator("#faq summary").first().click();
  assert.equal(await page.locator("#faq details[open]").count(), 1);
  record("Newsletter, FAQ, Korean UI and currency preferences work");
  const mobile = await context.newPage();
  await mobile.setViewportSize({ width: 390, height: 844 });
  await mobile.goto(base);
  await mobile.locator("h1").waitFor();
  await screenshot(mobile, "home-mobile");
  await noOverflow(mobile, "mobile home");
  await mobile.locator(".menu-toggle").click();
  assert.equal(await mobile.locator("#mobile-nav").isVisible(), true);
  await mobile.locator("#mobile-nav a").first().click();
  await mobile.waitForURL("**/locations?**");
  await mobile.locator(".location-row").first().waitFor();
  await noOverflow(mobile, "mobile locations");
  await screenshot(mobile, "locations-mobile");
  await mobile.goto(
    `${base}/rooms/standard-double?branch=yeonnam&guests=2&rooms=1&promo=PIPE15`,
  );
  await mobile.locator(".booking-panel").waitFor();
  await noOverflow(mobile, "mobile detail");
  await screenshot(mobile, "room-mobile");
  await mobile.locator(".mobile-reserve button").click();
  assert.equal(await mobile.locator("dialog[open]").count(), 1);
  await mobile.locator('[data-action="confirm-reservation"]').click();
  assert.match(await mobile.locator(".confirmation-ref").innerText(), /DEMO-/);
  await screenshot(mobile, "confirmation-mobile");
  await mobile.keyboard.press("Escape");
  await mobile.setViewportSize({ width: 320, height: 700 });
  await mobile.goto(base);
  await mobile.locator("h1").waitFor();
  await noOverflow(mobile, "320px home");
  await mobile.goto(`${base}/rooms/standard-double?branch=yeonnam`);
  await mobile.locator(".booking-panel").waitFor();
  await noOverflow(mobile, "320px detail");
  record("Mobile navigation, 320px layout and demo reservation work");
  const response = await page.goto(`${base}/does-not-exist`);
  assert.equal(response.status(), 404);
  await page.locator(".not-found").waitFor();
  record("Unknown routes return HTTP 404 and recovery page");
  assert.deepEqual(errors, []);
  assert.deepEqual(failedRequests, []);
  record("No JavaScript runtime errors or failed first-party assets");
  await writeFile(
    ".tmp/verification.json",
    JSON.stringify(
      {
        base,
        checkedAt: new Date().toISOString(),
        results,
        errors,
        failedRequests,
      },
      null,
      2,
    ),
  );
  console.log(`\n${results.length} browser checks passed.`);
} finally {
  await browser.close();
}
