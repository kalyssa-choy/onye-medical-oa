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

    /*
    If we're in mock mode (without paid API access),
    return a deterministic data quality assessment without calling OpenAI.
    */
    if (process.env.USE_MOCK_OPENAI === "true" || !process.env.OPENAI_API_KEY) {
      const sections = {
        demographics,
        medications,
        allergies,
        conditions,
        vital_signs,
      };

      const hasAnyInput =
        (demographics && Object.keys(demographics).length > 0) ||
        (Array.isArray(medications) && medications.length > 0) ||
        (Array.isArray(allergies) && allergies.length > 0) ||
        (Array.isArray(conditions) && conditions.length > 0) ||
        (vital_signs && Object.keys(vital_signs).length > 0) ||
        Boolean(last_updated);

      if (!hasAnyInput) {
        const emptyResult = {
          overall_score: 0,
          breakdown: {
            completeness: 0,
            accuracy: 0,
            timeliness: 0,
            clinical_plausibility: 0,
          },
          issues_detected: [],
        };

        return res.json({
          ai_response: emptyResult,
          raw_output: JSON.stringify(emptyResult),
        });
      }

      let filledSections = 0;
      const totalSections = Object.keys(sections).length;

      Object.values(sections).forEach((section) => {
        const hasContent =
          section &&
          ((Array.isArray(section) && section.length > 0) ||
            (!Array.isArray(section) &&
              typeof section === "object" &&
              Object.keys(section).length > 0));
        if (hasContent) {
          filledSections += 1;
        }
      });

      const completeness = Math.round((filledSections / totalSections) * 100);

      // Very rough timeliness heuristic
      let timeliness = 70;
      if (!last_updated) {
        timeliness = 40;
      }

      // Simple plausibility check for blood pressure if present
      let clinicalPlausibility = 80;
      const issues_detected = [];

      if (
        vital_signs &&
        typeof vital_signs.blood_pressure === "string" &&
        vital_signs.blood_pressure.includes("/")
      ) {
        const [s, d] = vital_signs.blood_pressure.split("/").map((x) => Number(x));
        if (!Number.isNaN(s) && !Number.isNaN(d) && (s > 260 || d > 160)) {
          clinicalPlausibility = 40;
          issues_detected.push({
            field: "vital_signs.blood_pressure",
            issue: "Blood pressure value is physiologically implausible",
            severity: "high",
          });
        }
      }

      // Accuracy is loosely tied to plausibility here
      const accuracy = Math.round((clinicalPlausibility + completeness) / 2);

      const overall_score = Math.round(
        (completeness + accuracy + timeliness + clinicalPlausibility) / 4
      );

      const mockResult = {
        overall_score,
        breakdown: {
          completeness,
          accuracy,
          timeliness,
          clinical_plausibility: clinicalPlausibility,
        },
        issues_detected,
      };

      return res.json({
        ai_response: mockResult,
        raw_output: JSON.stringify(mockResult),
      });
    }

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
        raw_output: output
      });
    }

    res.json({
      ai_response: parsedResult,
      raw_output: output
    });
  } catch (error) {
    console.error("Validation error:", error);
    res.status(500).json({
      error: "Data quality validation failed"
    });
  }
});

export default router;