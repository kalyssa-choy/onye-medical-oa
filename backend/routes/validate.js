import express from "express";
import OpenAI from "openai";
import { buildCacheKey, createCacheStore } from "../utils/cacheStore.js";
import {
  buildEmptyValidationResult,
  buildMockValidationResult,
  hasAnyValidationInput,
} from "../utils/validateUtils.js";

const router = express.Router();

//create openai client
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
const CACHE_TTL_MS = 5 * 60 * 1000; //how long to keep cache (milliseconds)
// Lightweight in-memory cache to reduce repeated LLM calls for identical payloads.
const responseCache = createCacheStore(CACHE_TTL_MS);

//data quality validation route
router.post("/validate/data-quality", async (req, res) => {
  try {
    const {
      demographics,
      medications,
      allergies,
      conditions,
      vital_signs,
      last_updated,
    } = req.body;

    // if mock mode in enabled or api key doesn't exist
    const useMockMode =
      process.env.USE_MOCK_OPENAI === "true" || !process.env.OPENAI_API_KEY;
    const cacheKey = buildCacheKey("validate", useMockMode, req.body);
    const cached = responseCache.get(cacheKey);
    if (cached) {
      // Return cached response to minimize latency and API usage.
      return res.json(cached);
    }

    /*
    If we're in mock mode return a deterministic data quality assessment without calling OpenAI
    */
    if (useMockMode) {
      const hasAnyInput = hasAnyValidationInput({
        demographics,
        medications,
        allergies,
        conditions,
        vital_signs,
        last_updated,
      });

      // checks if there is input
      if (!hasAnyInput) {
        const emptyResult = buildEmptyValidationResult();

        const emptyResponse = {
          ai_response: emptyResult,
          raw_output: JSON.stringify(emptyResult),
        };

        responseCache.set(cacheKey, emptyResponse);
        return res.json(emptyResponse);
      }

      // build mock result for mock mode
      const mockResult = buildMockValidationResult({
        demographics,
        medications,
        allergies,
        conditions,
        vital_signs,
        last_updated,
      });

      const mockResponse = {
        ai_response: mockResult,
        raw_output: JSON.stringify(mockResult),
      };

      responseCache.set(cacheKey, mockResponse);
      return res.json(mockResponse);
    }

    //prompt that will be send to the open ai client
    const prompt = `
You are a medical data quality assessor.

Your task is to determine a data quality score for the patient's medical record based on the following criteria:
- Completeness: Are all key sections (demographics, medications, allergies, conditions, vital signs) filled out?
- Consistency: Do the entries make sense together (e.g., no conflicting medications or allergies)?
- Timeliness: Is the information up to date based on the last_updated timestamp?

demographics: ${JSON.stringify(demographics || {}, null, 2)}
medications: ${JSON.stringify(medications || [], null, 2)}
allergies: ${JSON.stringify(allergies || [], null, 2)}
conditions: ${JSON.stringify(conditions || [], null, 2)}
vital_signs: ${JSON.stringify(vital_signs || {}, null, 2)}
last_updated: ${JSON.stringify(last_updated || "", null, 2)}

Return ONLY valid JSON in this exact format:
{
  "overall_score": number,
  "breakdown": {
    "completeness": number,
    "accuracy": number,
    "timeliness": number,
    "clinical_plausibility": number
  },
  "issues_detected":[
    {"field": "string", "issue": "string", "severity": "string"},
    ...
  ]
}

Rules:
- overall_score must be a number from 0 to 100
- breakdown scores must be numbers from 0 to 100
- completeness should assess how many key sections are filled out
- accuracy should assess internal consistency and plausibility of entries
- timeliness should assess how recent the last_updated timestamp is
- clinical_plausibility should assess if the combination of conditions, medications, allergies, and vital signs make sense clinically
- field in issues_detected should indicate which section has the issue (e.g., "medications", "allergies")
- issue should be a brief description of the problem detected
- severity should be "low", "medium", or "high" indicating the potential impact on patient care
- do not include markdown
- do not include extra text
`;

    // create the response request from the openai client
    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: prompt,
    });

    const output = response.output_text; //ai response

    let parsedResult;
    //parse response to json
    try {
      parsedResult = JSON.parse(output);
    } catch (parseError) {
      return res.status(500).json({
        error: "Model did not return valid JSON",
        raw_output: output,
      });
    }
     
    // final response object to return to frontend/update cache
    const modelResponse = {
      ai_response: parsedResult,
      raw_output: output,
    };
    responseCache.set(cacheKey, modelResponse);
    res.json(modelResponse);
  } catch (error) {
    console.error("Validation error:", error);

    if (error?.status === 429) {
      return res.status(429).json({
        error: "LLM rate limit exceeded. Please retry shortly.",
        details: error?.message || String(error),
      });
    }

    res.status(500).json({
      error: "Data quality validation failed",
    });
  }
});

export default router;
