import React, { useState } from "react";
import styles from "./DataValidationCard.module.css";

//interface for a validation issue
interface ValidationIssue {
  field: string;
  issue: string;
  severity: "low" | "medium" | "high";
}

//interface for a validation result
interface ValidationResult {
  overall_score: number;
  breakdown: {
    completeness: number;
    accuracy: number;
    timeliness: number;
    clinical_plausibility: number;
  };
  //array of validation issues
  issues_detected: ValidationIssue[];
}

//interface for a validation api response
interface ValidationApiResponse {
  ai_response: ValidationResult;
  raw_output: string;
  error?: string;
}

// data format pattern (YYYY-MM-DD)
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

//api key for the app, with default value for testing
const APP_API_KEY = import.meta.env.VITE_APP_API_KEY || "onye-dev-key";

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Something went wrong.";

// helper function to convert strings with comma separated values into an array
const toStringList = (value: string) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

// parse vital signs input into a record of key:value pairs
const parseVitals = (input: string): Record<string, string | number> => {
  if (!input.trim()) return {};

  return (
    input
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      //loop through array made by split by comma
      .reduce((acc: Record<string, string | number>, item) => {
        const parts = item.split(":");
        if (parts.length < 2) return acc;

        const key = parts[0].trim();
        const rawValue = parts.slice(1).join(":").trim();
        if (!key || !rawValue) return acc;

        const numericValue = Number(rawValue);
        acc[key] = Number.isNaN(numericValue) ? rawValue : numericValue;
        return acc; //map
      }, {})
  );
};

//empty result for when no input is provided
const EMPTY_RESULT: ValidationResult = {
  overall_score: 0,
  breakdown: {
    completeness: 0,
    accuracy: 0,
    timeliness: 0,
    clinical_plausibility: 0,
  },
  issues_detected: [], //array of validation issues
};

//get the score class based on the score for styling
const getScoreClass = (score: number) => {
  if (score >= 80) return styles.scoreHigh;
  if (score >= 60) return styles.scoreMedium;
  return styles.scoreLow;
};

//get the severity class based on the severity for styling
const getSeverityClass = (severity: ValidationIssue["severity"]) => {
  if (severity === "high") return styles.severityHigh;
  if (severity === "medium") return styles.severityMedium;
  return styles.severityLow;
};

//main component for the data validation card
export const DataValidationCard: React.FC = () => {
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("");
  const [medications, setMedications] = useState("");
  const [allergies, setAllergies] = useState("");
  const [conditions, setConditions] = useState("");
  const [vitals, setVitals] = useState("");
  const [lastUpdated, setLastUpdated] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [result, setResult] = useState<ValidationResult | null>(null);

  //check the input data for errors
  const checkInputData = (): string => {
    if (dob.trim() && !DATE_PATTERN.test(dob)) {
      return "Date of birth must be in YYYY-MM-DD format.";
    }
    if (lastUpdated.trim() && !DATE_PATTERN.test(lastUpdated)) {
      return "Last updated date must be in YYYY-MM-DD format.";
    }
    return "";
  };

  const handleValidateClick = async () => {
    setErrorMessage("");
    setResult(null);

    const validationError = checkInputData();
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    //create the payload for the validation request to backend
    const payload = {
      demographics: {
        name: name.trim(),
        dob: dob.trim(),
        gender: gender.trim(),
      },
      medications: toStringList(medications),
      allergies: toStringList(allergies),
      conditions: toStringList(conditions),
      vital_signs: parseVitals(vitals),
      last_updated: lastUpdated.trim(),
    };

    const hasAnyInput =
      payload.demographics.name.length > 0 ||
      payload.demographics.dob.length > 0 ||
      payload.demographics.gender.length > 0 ||
      payload.medications.length > 0 ||
      payload.allergies.length > 0 ||
      payload.conditions.length > 0 ||
      Object.keys(payload.vital_signs).length > 0 ||
      payload.last_updated.length > 0;
    //check if there is any input, and returns default empty result if there is not
    if (!hasAnyInput) {
      setResult(EMPTY_RESULT);
      return;
    }

    try {
      //try to make the validation request to backend
      setLoading(true);

      const response = await fetch("/api/validate/data-quality", {
        //make the validation request to backend
        method: "POST", //send data to the backend
        headers: {
          "Content-Type": "application/json", //set the content type to json
          "x-api-key": APP_API_KEY,
        },
        body: JSON.stringify(payload), //actually convert to json string
      });

      const data: ValidationApiResponse = await response.json();
      //throw an error when response is not ok
      if (!response.ok) {
        throw new Error(data.error || "Data validation failed.");
      }

      //update the result state with the response from the backend
      setResult(data.ai_response);
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  //rendering the components
  return (
    <div className={styles.validationCard}>
      <h2>Data Validation Tool</h2>

      <div className={styles.grid}>
        <div className={styles.field}>
          <label>Patient Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. John Doe"
          />
        </div>

        <div className={styles.field}>
          <label>Date of Birth</label>
          <input
            type="text"
            value={dob}
            onChange={(e) => setDob(e.target.value)}
            placeholder="YYYY-MM-DD"
          />
        </div>

        <div className={styles.field}>
          <label>Gender</label>
          <input
            type="text"
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            placeholder="e.g. M"
          />
        </div>

        <div className={`${styles.field} ${styles.fullWidth}`}>
          <label>Medications (comma-separated)</label>
          <input
            type="text"
            value={medications}
            onChange={(e) => setMedications(e.target.value)}
            placeholder="e.g. Metformin 500mg, Lisinopril 10mg"
          />
        </div>

        <div className={`${styles.field} ${styles.fullWidth}`}>
          <label>Allergies (comma-separated)</label>
          <input
            type="text"
            value={allergies}
            onChange={(e) => setAllergies(e.target.value)}
            placeholder="e.g. Penicillin, Latex"
          />
        </div>

        <div className={`${styles.field} ${styles.fullWidth}`}>
          <label>Conditions (comma-separated)</label>
          <input
            type="text"
            value={conditions}
            onChange={(e) => setConditions(e.target.value)}
            placeholder="e.g. Type 2 Diabetes, Hypertension"
          />
        </div>

        <div className={`${styles.field} ${styles.fullWidth}`}>
          <label>Vital Signs (key:value, comma-separated)</label>
          <input
            type="text"
            value={vitals}
            onChange={(e) => setVitals(e.target.value)}
            placeholder="e.g. blood_pressure:120/80, heart_rate:72"
          />
        </div>

        <div className={styles.field}>
          <label>Last Updated</label>
          <input
            type="text"
            value={lastUpdated}
            onChange={(e) => setLastUpdated(e.target.value)}
            placeholder="YYYY-MM-DD"
          />
        </div>
      </div>

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.validateButton}
          onClick={handleValidateClick}
          disabled={loading}
        >
          {/* loading message */}
          {loading ? "Validating..." : "Validate Data Quality"}
        </button>
      </div>

      {/* rendering the error message if there is one */}
      {errorMessage && <p className={styles.errorMessage}>{errorMessage}</p>}

      {/* rendering the result if there is one */}
      {result && (
        <div className={styles.resultCard}>
          <h3>Validation Result</h3>

          <div className={styles.scoreRow}>
            <p className={styles.scoreLabel}>Overall Score</p>
            <p className={`${styles.scoreValue} ${getScoreClass(result.overall_score)}`}>
              {result.overall_score}/100
            </p>
          </div>

          <div className={styles.breakdownGrid}>
            <div className={styles.metric}>
              <span>Completeness</span>
              <strong>{result.breakdown.completeness}</strong>
            </div>
            <div className={styles.metric}>
              <span>Accuracy</span>
              <strong>{result.breakdown.accuracy}</strong>
            </div>
            <div className={styles.metric}>
              <span>Timeliness</span>
              <strong>{result.breakdown.timeliness}</strong>
            </div>
            <div className={styles.metric}>
              <span>Clinical Plausibility</span>
              <strong>{result.breakdown.clinical_plausibility}</strong>
            </div>
          </div>

          <div className={styles.issuesSection}>
            {/* rendering the issues detected */}
            <h4>Issues Detected</h4>
            {result.issues_detected.length === 0 ? (
              <p className={styles.noIssues}>No issues detected.</p>
            ) : (
              <ul className={styles.issuesList}>
                {result.issues_detected.map((issue, index) => (
                  <li key={`${issue.field}-${index}`} className={styles.issueItem}>
                    <div className={styles.issueTopRow}>
                      <strong>{issue.field}</strong>
                      <span
                        className={`${styles.severityBadge} ${getSeverityClass(issue.severity)}`}
                      >
                        {issue.severity}
                      </span>
                    </div>
                    <p>{issue.issue}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
