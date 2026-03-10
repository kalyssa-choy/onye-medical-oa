import express from "express";
import OpenAI from "openai";

const router = express.Router();

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

router.post("/validate/data-quality", async (req, res) => {
  try {
    const { 
        demographics, 
        medications, 
        allergies, 
        conditions, 
        vital_signs, 
        last_updated 
    } = req.body;

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
    console.error("Validation error:", error);
    res.status(500).json({
      error: "Data quality validation failed"
    });
  }
});

export default router;