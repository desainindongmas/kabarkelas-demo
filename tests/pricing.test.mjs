import { test } from "node:test";
import assert from "node:assert/strict";
import { quoteSchool, quoteFoundation } from "../shared/pricing.mjs";

test("annual school quotes preserve the approved reference prices and minimum fee", () => {
  for (const [students, standardAnnual, proAnnual] of [
    [1, 3_500_000, 5_500_000],
    [199, 3_500_000, 5_500_000],
    [200, 3_500_000, 5_500_000],
    [500, 5_500_000, 8_500_000],
    [1_000, 8_500_000, 13_500_000],
    [2_000, 14_000_000, 22_000_000],
  ]) assert.deepEqual(quoteSchool(students), { students, standardAnnual, proAnnual, customQuote: false });
});

test("school pricing interpolates between each anchor without a capacity-tier jump", () => {
  assert.equal(quoteSchool(201).standardAnnual, 3_507_000);
  assert.equal(quoteSchool(201).proAnnual, 5_510_000);
  assert.equal(quoteSchool(350).standardAnnual, 4_500_000);
  assert.equal(quoteSchool(350).proAnnual, 7_000_000);
  assert.equal(quoteSchool(750).standardAnnual, 7_000_000);
  assert.equal(quoteSchool(750).proAnnual, 11_000_000);
  assert.equal(quoteSchool(1_500).standardAnnual, 11_250_000);
  assert.equal(quoteSchool(1_500).proAnnual, 17_750_000);
  assert.equal(quoteSchool(501).standardAnnual, 5_506_000);
  assert.equal(quoteSchool(1_001).standardAnnual, 8_506_000);
});

test("upgrade comparisons use the actual students and rounded annual bill", () => {
  const at350 = quoteSchool(350), at500 = quoteSchool(500);
  assert.equal(at350.proAnnual - at350.standardAnnual, 2_500_000);
  assert.equal(Math.round((at350.proAnnual - at350.standardAnnual) / at350.students / 12), 595);
  assert.equal(at500.proAnnual - at500.standardAnnual, 3_000_000);
  assert.equal((at500.proAnnual - at500.standardAnnual) / at500.students / 12, 500);
  assert.equal(Math.round(at350.standardAnnual / at350.students), 12_857);
});

test("annual prices stay monotone and rounded throughout the supported range", () => {
  let previous = quoteSchool(1);
  for (let students = 2; students <= 2_000; students++) {
    const quote = quoteSchool(students);
    assert.ok(quote.standardAnnual >= previous.standardAnnual);
    assert.ok(quote.proAnnual >= previous.proAnnual);
    assert.equal(quote.standardAnnual % 1_000, 0);
    assert.equal(quote.proAnnual % 1_000, 0);
    previous = quote;
  }
});

test("a school above 2000 students requires a custom quote", () => {
  assert.deepEqual(quoteSchool(2_001), { students: 2_001, standardAnnual: null, proAnnual: null, customQuote: true });
});

test("student counts must be positive safe integers, not coerced input", () => {
  for (const students of [0, -1, 2.5, NaN, Infinity, "500", null, undefined, Number.MAX_SAFE_INTEGER + 1])
    assert.throws(() => quoteSchool(students), RangeError);
});

test("foundation quote adds Pro once per unit and a separate management fee", () => {
  const quote = quoteFoundation([500, 500, 500]);
  assert.equal(quote.students, 1_500);
  assert.equal(quote.proAnnual, 25_500_000);
  assert.equal(quote.managementAnnual, 4_500_000);
  assert.equal(quote.annual, 30_000_000);
  assert.equal(quote.annual / quote.students, 20_000);
  assert.equal(quote.customQuote, false);
  assert.deepEqual(quote.units.map(({ unit, students, proAnnual, managementAnnual, annual }) =>
    ({ unit, students, proAnnual, managementAnnual, annual })), [1, 2, 3].map((unit) =>
    ({ unit, students: 500, proAnnual: 8_500_000, managementAnnual: 1_500_000, annual: 10_000_000 })));
});

test("foundation pricing uses each unit's student count before summing", () => {
  const quote = quoteFoundation([150, 350]);
  assert.equal(quote.proAnnual, 12_500_000);
  assert.equal(quote.managementAnnual, 3_000_000);
  assert.equal(quote.annual, 15_500_000);
  assert.equal(quote.students, 500);
  assert.equal(quote.annual / quote.students, 31_000);
});

test("one custom-quote unit makes the combined foundation total custom", () => {
  const quote = quoteFoundation([350, 2_001]);
  assert.equal(quote.customQuote, true);
  assert.equal(quote.proAnnual, null);
  assert.equal(quote.annual, null);
  assert.equal(quote.managementAnnual, 3_000_000);
  assert.equal(quote.students, 2_351);
  assert.equal(quote.units[0].annual, 8_500_000);
  assert.equal(quote.units[1].annual, null);
});

test("foundation quotes require at least two valid units", () => {
  for (const units of [[], [500], null, "500,500", [500, 0], [500, 1.5], [500, , 500]])
    assert.throws(() => quoteFoundation(units), RangeError);
});
