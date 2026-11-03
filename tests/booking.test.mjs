import test from "node:test";
import assert from "node:assert/strict";
import {
  addDays,
  nightsBetween,
  normalizeStay,
  quote,
  validateStay,
  validDate,
} from "../src/booking.js";

const stay = {
  checkin: "2026-11-10",
  checkout: "2026-11-13",
  guests: 2,
  rooms: 1,
  promo: "",
};
test("date math crosses months and leap years correctly", () => {
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(nightsBetween("2028-02-28", "2028-03-01"), 2);
  assert.equal(nightsBetween("2026-03-07", "2026-03-10"), 3);
  assert.equal(validDate("2026-02-30"), false);
});
test("rejects invalid stays and guest/room combinations", () => {
  assert.equal(validateStay(stay, "2026-11-03"), "");
  for (const change of [
    { checkout: stay.checkin },
    { checkin: "2026-01-01" },
    { guests: NaN },
    { guests: 1, rooms: 2 },
    { rooms: 0 },
    { checkout: "2027-01-01" },
  ]) {
    assert.ok(validateStay({ ...stay, ...change }, "2026-11-03"));
  }
});
test("pricing uses integer cents and taxes the discounted room plus cleaning", () => {
  assert.deepEqual(quote(62, stay), {
    nights: 3,
    subtotal: 18600,
    discount: 0,
    percent: 0,
    cleaning: 1800,
    tax: 2040,
    total: 22440,
    promoValid: true,
  });
  const price = quote(62, { ...stay, promo: "PIPE15", rooms: 2 });
  assert.equal(price.subtotal, 37200);
  assert.equal(price.discount, 5580);
  assert.equal(price.total, 38742);
});
test("long stay discount requires seven nights and unknown codes give no discount", () => {
  assert.equal(quote(62, { ...stay, promo: "STAY7" }).promoValid, false);
  assert.equal(
    quote(62, { ...stay, promo: "STAY7", checkout: "2026-11-17" }).percent,
    20,
  );
  assert.equal(quote(62, { ...stay, promo: "BOGUS" }).discount, 0);
  assert.throws(() => quote(-1, stay), RangeError);
});
test("untrusted search parameters normalize to valid defaults", () => {
  const value = normalizeStay(
    new URLSearchParams("branch=unknown&guests=abc&checkin=evil&promo=pipe15"),
    ["yeonnam"],
    "2026-11-03",
  );
  assert.equal(value.branch, "all");
  assert.equal(value.checkin, "2026-11-10");
  assert.equal(value.guests, 2);
  assert.equal(value.promo, "PIPE15");
});
