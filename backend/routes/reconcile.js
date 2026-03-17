import express from "express";
import OpenAI from "openai";
import { buildCacheKey, createCacheStore } from "../utils/cacheStore.js";
import { isValidDate, selectBestSource } from "../utils/reconcileUtils.js";

const router = express.Router();

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
const CACHE_TTL_MS = 5 * 60 * 1000;
// Lightweight in-memory cache to reduce repeated LLM calls for identical payloads.
const responseCache = createCacheStore(CACHE_TTL_MS);

router.post("/reconcile/medication", async (req, res) => {
  try {
    const { patient_context, sources } = req.body;
    const useMockMode =
      process.env.USE_MOCK_OPENAI === "true" || !process.env.OPENAI_API_KEY;

    /*
    Validate patient_context
    */
    if (!patient_context || typeof patient_context !== "object") {
      return res.status(400).json({
        error: "patient_context is required",
      });
    }

    const { age, conditions, recent_labs } = patient_context;

    if (!Number.isFinite(age) || age <= 0) {
      return res.status(400).json({
        error: "patient_context.age must be a positive number",
      });
    }

    if (!Array.isArray(conditions) || conditions.length === 0) {
      return res.status(400).json({
        error: "patient_context.conditions must be a non-empty array",
      });
    }

    if (
      recent_labs !== undefined &&
      (typeof recent_labs !== "object" ||
        recent_labs === null ||
        Array.isArray(recent_labs))
    ) {
      return res.status(400).json({
        error: "patient_context.recent_labs must be an object",
      });
    }

    /*
    Validate sources
    */
    if (!Array.isArray(sources) || sources.length === 0) {
      return res.status(400).json({
        error: "sources must be a non-empty array",
      });
    }

    for (const [index, source] of sources.entries()) {
      if (!source || typeof source !== "object") {
        return res.status(400).json({
          error: `sources[${index}] must be an object`,
        });
      }

      const { system, medication, last_updated, source_reliability } = source;

      if (!system || typeof system !== "string" || !system.trim()) {
        return res.status(400).json({
          error: `sources[${index}].system is required`,
        });
      }

      if (!medication || typeof medication !== "string" || !medication.trim()) {
        return res.status(400).json({
          error: `sources[${index}].medication is required`,
        });
      }

      if (!last_updated || !isValidDate(last_updated)) {
        return res.status(400).json({
          error: `sources[${index}].last_updated must be in YYYY-MM-DD format`,
        });
      }

      if (!["low", "medium", "high"].includes(source_reliability)) {
        return res.status(400).json({
          error: `sources[${index}].source_reliability must be low, medium, or high`,
        });
      }
    }

    const cacheKey = buildCacheKey("reconcile", useMockMode, req.body);
    const cached = responseCache.get(cacheKey);
    if (cached) {
      // Return cached response to minimize latency and API usage.
      return res.json(cached);
    }

    /*
    If we're in mock mode (e.g., for an OA without paid API access),
    return a deterministic reconciled result without calling OpenAI.
    */
    if (useMockMode) {
      const best = selectBestSource(sources);

      const mockResult = {
        reconciled_medication: best.medication,
        confidence_score: 0.85, //default score for mock mode
        reasoning:
          "Selected the medication from the most reliable and most recent source in the provided records.",
        recommended_actions: [
          "Verify this reconciled medication with the patient at the next clinical encounter.",
          "Update all source systems to reflect this reconciled medication list.",
        ],
        clinical_safety_check: "PASSED",
      };

      responseCache.set(cacheKey, mockResult);
      return res.json(mockResult);
    }

    /*
    Prompt for AI reconciliation
    */
    const prompt = `
You are a medical medication reconciliation assistant.

Your task is to compare conflicting medication records from different sources and determine the most likely truth.

Patient Context:
${JSON.stringify(patient_context, null, 2)}

Sources:
${JSON.stringify(sources, null, 2)}

Return ONLY valid JSON in this exact format:
{
  "reconciled_medication": "string",
  "confidence_score": number,
  "reasoning": "string",
  "recommended_actions": ["string"],
  "clinical_safety_check": "PASSED"
}

Rules:
- confidence_score must be between 0 and 1
- reasoning should be concise
- recommended_actions should be clear clinical steps
- clinical_safety_check must be "PASSED" or "DENIED"
- prefer more recent and more reliable sources
- use patient_context (age, conditions, recent_labs) if relevant
- do not include markdown
- do not include extra text
`;

    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: prompt,
    });

    const output = response.output_text;

    let parsedResult;

    try {
      parsedResult = JSON.parse(output);
    } catch (err) {
      return res.status(500).json({
        error: "Model returned invalid JSON",
        raw_output: output,
      });
    }

    /*
    Validate AI output
    */
    if (
      typeof parsedResult.reconciled_medication !== "string" ||
      typeof parsedResult.confidence_score !== "number" ||
      typeof parsedResult.reasoning !== "string" ||
      !Array.isArray(parsedResult.recommended_actions) ||
      !["PASSED", "DENIED"].includes(parsedResult.clinical_safety_check)
    ) {
      return res.status(500).json({
        error: "Model output format invalid",
        raw_output: parsedResult,
      });
    }

    /*
    Return result
    */
    responseCache.set(cacheKey, parsedResult);
    return res.json(parsedResult);
  } catch (error) {
    console.error("Reconciliation error:", error);

    if (error?.status === 429) {
      return res.status(429).json({
        error: "LLM rate limit exceeded. Please retry shortly.",
        details: error?.message || String(error),
      });
    }

    return res.status(500).json({
      error: "Medication reconciliation failed",
      details: error?.message || String(error),
    });
  }
});

export default router;
