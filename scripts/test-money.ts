import { test } from "node:test";
import assert from "node:assert/strict";
import { computeTotals, lineTotal, normalizeMoney, sumMoney, toCents } from "../src/lib/documents/money";
import { addDays, isQuoteExpired, orgToday } from "../src/lib/documents/dates";
import { formatDocumentNumber } from "../src/lib/documents/numbering-format";

test("toCents parses strings exactly", () => {
  assert.equal(toCents("0.1"), 10);
  assert.equal(toCents("1500"), 150000);
  assert.equal(toCents("12.5"), 1250);
  assert.equal(toCents("99999999.99"), 9999999999);
  assert.equal(toCents(19.99), 1999);
});

test("normalizeMoney always yields 2dp", () => {
  assert.equal(normalizeMoney("1500"), "1500.00");
  assert.equal(normalizeMoney("12.5"), "12.50");
  assert.equal(normalizeMoney(0), "0.00");
});

test("line totals round half-up once", () => {
  // qty (2dp) × price (2dp) is exact to 4dp, then rounded half-up once.
  assert.equal(lineTotal({ quantity: "2.5", unitPrice: "0.03" }), 0.08); // 0.075 → 0.08
  assert.equal(lineTotal({ quantity: "1.5", unitPrice: "0.01" }), 0.02); // 0.015 → 0.02
  assert.equal(lineTotal({ quantity: "0.5", unitPrice: "0.01" }), 0.01); // 0.005 → 0.01
  assert.equal(lineTotal({ quantity: "2.5", unitPrice: "100"} ), 250);
  assert.equal(lineTotal({ quantity: "1", unitPrice: "99999999.99" }), 99999999.99);
});

test("totals with no discount and no tax", () => {
  const t = computeTotals(
    [
      { quantity: "1", unitPrice: "1000", taxable: true },
      { quantity: "2", unitPrice: "250.50", taxable: false },
    ],
    { discountType: "NONE", discountValue: "0", taxRate: "0" },
  );
  assert.deepEqual(t.lineTotals, [1000, 501]);
  assert.equal(t.subtotal, 1501);
  assert.equal(t.discountAmount, 0);
  assert.equal(t.taxAmount, 0);
  assert.equal(t.total, 1501);
});

test("percent discount apportioned across taxable lines before tax", () => {
  const t = computeTotals(
    [
      { quantity: "1", unitPrice: "1000", taxable: true },
      { quantity: "1", unitPrice: "500", taxable: false },
    ],
    { discountType: "PERCENT", discountValue: "10", taxRate: "8" },
  );
  assert.equal(t.subtotal, 1500);
  assert.equal(t.discountAmount, 150);
  assert.equal(t.taxableBase, 900); // 1000 − 150 × (1000 / 1500)
  assert.equal(t.taxAmount, 72);
  assert.equal(t.total, 1422);
});

test("amount discount is capped at the subtotal", () => {
  const t = computeTotals([{ quantity: "1", unitPrice: "100", taxable: true }], {
    discountType: "AMOUNT",
    discountValue: "250",
    taxRate: "0",
  });
  assert.equal(t.discountAmount, 100);
  assert.equal(t.total, 0);
});

test("tax rounding is half-up at the document level", () => {
  const t = computeTotals([{ quantity: "1", unitPrice: "10.05", taxable: true }], {
    discountType: "NONE",
    discountValue: "0",
    taxRate: "8",
  });
  assert.equal(t.taxAmount, 0.8); // 0.804 → 0.80
  const u = computeTotals([{ quantity: "1", unitPrice: "10.07", taxable: true }], {
    discountType: "NONE",
    discountValue: "0",
    taxRate: "8",
  });
  assert.equal(u.taxAmount, 0.81); // 0.8056 → 0.81
});

test("sumMoney does not drift", () => {
  const values = Array.from({ length: 1000 }, () => "0.10");
  assert.equal(sumMoney(values), 100);
});

test("orgToday crosses the UTC+8 midnight boundary correctly", () => {
  const now = new Date("2026-09-10T17:30:00Z"); // 01:30 on the 11th in Kuala Lumpur
  assert.equal(orgToday(480, now).toISOString(), "2026-09-11T00:00:00.000Z");
  assert.equal(orgToday(0, now).toISOString(), "2026-09-10T00:00:00.000Z");
});

test("quote expiry compares against the org's calendar day", () => {
  const now = new Date("2026-09-10T17:30:00Z");
  const base = { status: "SENT", withdrawnAt: null, supersededById: null };
  assert.equal(isQuoteExpired({ ...base, validUntil: new Date("2026-09-10") }, 480, now), true);
  assert.equal(isQuoteExpired({ ...base, validUntil: new Date("2026-09-11") }, 480, now), false);
  assert.equal(isQuoteExpired({ ...base, validUntil: addDays(new Date("2026-09-11"), 30) }, 480, now), false);
  assert.equal(isQuoteExpired({ ...base, status: "ACCEPTED", validUntil: new Date("2026-01-01") }, 480, now), false);
});

test("document numbers pad to the configured width", () => {
  assert.equal(formatDocumentNumber("Q-", 7, 4), "Q-0007");
  assert.equal(formatDocumentNumber("INV-", 12345, 4), "INV-12345");
});
