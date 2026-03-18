import test from "node:test";
import assert from "node:assert/strict";

import { buildCacheKey, createCacheStore } from "../utils/cacheStore.js";
import { isValidDate, selectBestSource } from "../utils/reconcileUtils.js";
import {
  buildEmptyValidationResult,
  buildMockValidationResult,
  hasAnyValidationInput,
} from "../utils/validateUtils.js";

//test valid date
test("isValidDate accepts YYYY-MM-DD dates", () => {
  assert.equal(isValidDate("2026-03-16"), true);
});

//test invalid format date
test("isValidDate rejects invalid formats", () => {
  assert.equal(isValidDate("03/16/2026"), false);
});

//chooses best source based on reliability and recency
test("selectBestSource prefers higher reliability then recency", () => {
  const selected = selectBestSource([
    {
      system: "A",
      medication: "Med A",
      last_updated: "2026-01-10",
      source_reliability: "medium",
    },
    {
      system: "B",
      medication: "Med B",
      last_updated: "2026-01-15",
      source_reliability: "high",
    },
    {
      system: "C",
      medication: "Med C",
      last_updated: "2026-02-01",
      source_reliability: "low",
    },
  ]);

  assert.equal(selected.system, "B");
});

// checks if there is input
test("hasAnyValidationInput detects empty payload", () => {
  const hasInput = hasAnyValidationInput({
    demographics: {},
    medications: [],
    allergies: [],
    conditions: [],
    vital_signs: {},
    last_updated: "",
  });

  assert.equal(hasInput, false);
});

//returns 0 score baseline
test("buildEmptyValidationResult returns 0 score baseline", () => {
  const result = buildEmptyValidationResult();
  assert.equal(result.overall_score, 0);
  assert.equal(result.breakdown.completeness, 0);
  assert.equal(result.issues_detected.length, 0);
});

//flags implausible blood pressure (340/180)
test("buildMockValidationResult flags implausible blood pressure", () => {
  const result = buildMockValidationResult({
    demographics: { name: "John Doe" },
    medications: ["Metformin"],
    allergies: [],
    conditions: ["Type 2 Diabetes"],
    vital_signs: { blood_pressure: "340/180", heart_rate: 72 },
    last_updated: "2026-03-16",
  });

  assert.equal(result.issues_detected.length > 0, true);
  assert.equal(result.issues_detected[0].field, "vital_signs.blood_pressure");
});

//test cache store can set/get values by key
test("cache store can set/get values by key", () => {
  const cache = createCacheStore(1000);
  const key = buildCacheKey("validate", true, { foo: "bar" });
  const payload = { value: 42 };
  cache.set(key, payload);

  assert.deepEqual(cache.get(key), payload);
});
