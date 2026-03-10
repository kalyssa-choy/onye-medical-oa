import express from "express";
import OpenAI from "openai";

const router = express.Router();

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

router.post("/reconcile/medication", async (req, res) => {
  try {
    const { patient_context, sources } = req.body;
    if (!patient_context || typeof patient_context !== "object") {
        return res.status(400).json({
            error: "patient_context is required"
        });
    }
    if (!sources || !Array.isArray(sources) || sources.length === 0) {
      return res.status(400).json({
        error: "sources must be a non-empty array"
      });
    }

    const prompt = `
You are a medical medication reconciliation assistant.

Your task is to compare conflicting medication records from different sources and determine the most likely truth.

Patient Context: ${JSON.stringify(patient_context, null, 2)}

Sources: ${JSON.stringify(sources, null, 2)}

Return ONLY valid JSON in this exact format:
{
  "reconciled_medication": "string",
  "confidence_score": number,
  "reasoning": "string",
  "recommended_actions": ["string", "string"],
  "clinical_safety_check": "PASSED"
}

Rules:
- confidence_score must be a number from 0 to 1
- reasoning should be brief and clear
- recommended_actions should be actionable steps for a clinician 
- clinical_safety_check should be either "PASSED" or "DENIED" indicating the safety status
- do not include markdown
- do not include extra text
`;

    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: prompt
    });

    const output = response.output_text;

    let parsedResult;
    try {
      parsedResult = JSON.parse(output);
    } catch (parseError) {
      return res.status(500).json({
        error: "Model did not return valid JSON",
        rawOutput: output
      });
    }

    res.json(parsedResult);
  } catch (error) {
    console.error("Reconciliation error:", error);
    res.status(500).json({
      error: "Medication reconciliation failed"
    });
  }
});

export default router;