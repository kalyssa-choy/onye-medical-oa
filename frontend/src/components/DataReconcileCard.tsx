import React, { useState } from "react";
import styles from "./DataReconcileCard.module.css";

type Reliability = "low" | "medium" | "high";
const LAB_ENTRY_PATTERN = /^([^:]+):\s*(-?\d+(\.\d+)?)$/;

interface SourceRecord {
  system: string;
  medication: string;
  last_updated: string;
  source_reliability: Reliability;
}

interface ReconcileResponse {
  reconciled_medication: string;
  confidence_score: number;
  reasoning: string;
  recommended_actions: string[];
  clinical_safety_check: "PASSED" | "DENIED";
}

type ReviewStatus = "none" | "approved" | "rejected";

export const DataReconcileCard: React.FC = () => {
  const [age, setAge] = useState("");
  const [conditions, setConditions] = useState("");
  const [labs, setLabs] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [result, setResult] = useState<ReconcileResponse | null>(null);
  const [reviewStatus, setReviewStatus] = useState<ReviewStatus>("none");

  const [sources, setSources] = useState<SourceRecord[]>([
    {
      system: "",
      medication: "",
      last_updated: "",
      source_reliability: "high",
    },
  ]);

  const updateSource = (
    index: number,
    field: keyof SourceRecord,
    value: string,
  ) => {
    setSources((prev) =>
      prev.map((source, i) =>
        i === index ? { ...source, [field]: value } : source,
      ),
    );
  };

  const addSource = () => {
    setSources((prev) => [
      ...prev,
      {
        system: "",
        medication: "",
        last_updated: "",
        source_reliability: "high",
      },
    ]);
  };

  const removeSource = (index: number) => {
    setSources((prev) => prev.filter((_, i) => i !== index));
  };

  const parseLabs = (input: string): Record<string, number> => {
    if (!input.trim()) return {};

    return input
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .reduce((acc: Record<string, number>, item) => {
        const match = item.match(LAB_ENTRY_PATTERN);
        if (!match) return acc;

        const key = match[1].trim();
        const value = Number(match[2]);

        if (!Number.isNaN(value)) {
          acc[key] = value;
        }

        return acc;
      }, {});
  };

  const checkInputData = (): string => {
    const numericAge = Number(age);

    if (!Number.isFinite(numericAge) || numericAge <= 0) {
      return "Age is required and must be a positive number.";
    }

    if (!conditions.trim()) {
      return "At least one condition is required.";
    }

    if (!labs.trim()) {
      return "Recent labs are required.";
    } else {
      const pieces = labs
        .split(",")
        .map((piece) => piece.trim())
        .filter(Boolean);

      for (const piece of pieces) {
        const match = piece.match(LAB_ENTRY_PATTERN);
        if (!match) {
          return "Recent labs must be entered as key:number pairs separated by commas.";
        }
      }
    }

    if (sources.length === 0) {
      return "At least one conflicting source is required.";
    }

    for (const [index, source] of sources.entries()) {
      if (!source.system.trim()) {
        return `Source ${index + 1}: system is required.`;
      }

      if (!source.medication.trim()) {
        return `Source ${index + 1}: medication is required.`;
      }

      if (!source.last_updated.trim()) {
        return `Source ${index + 1}: last updated date is required.`;
      }

      if (!/^\d{4}-\d{2}-\d{2}$/.test(source.last_updated)) {
        return `Source ${index + 1}: date must be in YYYY-MM-DD format.`;
      }
    }

    return "";
  };

  const getConfidenceLabel = (score: number) => {
    if (score >= 0.8) return "High Confidence";
    if (score >= 0.5) return "Medium Confidence";
    return "Low Confidence";
  };

  const getConfidenceClass = (score: number) => {
    if (score >= 0.8) return styles.confidenceHigh;
    if (score >= 0.5) return styles.confidenceMedium;
    return styles.confidenceLow;
  };

  const handleReconcileClick = async () => {
    setErrorMessage("");
    setResult(null);
    setReviewStatus("none");

    const validationError = checkInputData();
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    const payload = {
      patient_context: {
        age: Number(age),
        conditions: conditions
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        recent_labs: parseLabs(labs),
      },
      sources: sources.map((source) => ({
        system: source.system.trim(),
        medication: source.medication.trim(),
        last_updated: source.last_updated,
        source_reliability: source.source_reliability,
      })),
    };

    try {
      setLoading(true);

      const response = await fetch("/api/reconcile/medication", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Medication reconciliation failed.");
      }

      setResult(data);
    } catch (error: any) {
      setErrorMessage(error.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.reconcileCard}>
      <h2>Medication Reconciliation Tool</h2>
      <div className={styles.contextInputs}>
        <div className={styles.contextInputsAge}>
          <label>Age*</label>
          <input
            type="number"
            placeholder="Enter age"
            value={age}
            onChange={(e) => setAge(e.target.value)}
          />
        </div>
        <div className={styles.contextInputsItem}>
          <label>Conditions*</label>
          <input
            type="text"
            placeholder="e.g. Type 2 Diabetes, Hypertension"
            value={conditions}
            onChange={(e) => setConditions(e.target.value)}
          />
        </div>

        <div className={styles.contextInputsItem}>
          <label>Recent Labs*</label>
          <input
            type="text"
            placeholder="e.g. GFR:45, A1C:7.1"
            value={labs}
            onChange={(e) => setLabs(e.target.value)}
          />
        </div>

       

      </div>

      <h3>Medication Records to Reconcile</h3>

      {sources.map((source, index) => (
        <div key={index} className={styles.sourceCard}>
          <div className={styles.sourceInputsFirstRow}>
            <div className={styles.sourceInputsFirstRowItem}>
              <label>System*</label>
              <input
                type="text"
                value={source.system}
                onChange={(e) => updateSource(index, "system", e.target.value)}
                placeholder="e.g. Hospital EHR"
              />
            </div>

            <div className={styles.sourceInputsFirstRowItem}>
              <label>Medication*</label>
              <input
                type="text"
                value={source.medication}
                onChange={(e) => updateSource(index, "medication", e.target.value)}
                placeholder="e.g. Metformin 500mg twice daily"
              />
            </div>
          </div>
          <div className={styles.sourceInputsSecondRow}>
            <div className={styles.sourceInputsSecondRowItem}>
              <label>Last Updated*</label>
              <input
                type="text"
                placeholder="YYYY-MM-DD"
                value={source.last_updated}
                onChange={(e) => updateSource(index, "last_updated", e.target.value)}
              />
            </div>

            <div className={styles.sourceInputsSecondRowItem}>
              <label>Source Reliability*</label>
              <select
                value={source.source_reliability}
                onChange={(e) =>
                  updateSource(
                    index,
                    "source_reliability",
                    e.target.value as Reliability,
                  )
                }
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          

          {sources.length > 1 && (
            <button
              type="button"
              className={styles.removeSourceButton}
              onClick={() => removeSource(index)}
            >
              Remove Medication Record
            </button>
          )}
        </div>
      ))}

      <button
        type="button"
        className={styles.addSourceButton}
        onClick={addSource}
      >
        Add Another Medication Record
      </button>

      <div className={styles.reconcileButtonRow}>
        <button
          type="button"
          className={styles.reconcileButton}
          onClick={handleReconcileClick}
          disabled={loading}
        >
          {loading ? "Reconciling..." : "Reconcile Medication"}
        </button>
      </div>

      {errorMessage && <p className={styles.errorMessage}>{errorMessage}</p>}

      {result && (
        <div
          className={`${styles.reconcileResultCard} ${reviewStatus === "approved" ? styles.reconcileResultApproved : ""} ${reviewStatus === "rejected" ? styles.reconcileResultRejected : ""}`}
        >
          <h3>Reconciled Result</h3>

          <div className={styles.resultRow}>
            <strong>Reconciled Medication:</strong>
            <p>{result.reconciled_medication}</p>
          </div>

          <div className={styles.resultRow}>
            <strong>Confidence Score:</strong>
            <p className={getConfidenceClass(result.confidence_score)}>
              {result.confidence_score.toFixed(2)} —{" "}
              {getConfidenceLabel(result.confidence_score)}
            </p>
          </div>

          <div className={styles.resultRow}>
            <strong>Reasoning:</strong>
            <p>{result.reasoning}</p>
          </div>

          <div className={styles.resultRow}>
            <strong>Recommended Actions:</strong>
            <ul>
              {result.recommended_actions.map((action, index) => (
                <li key={index}>{action}</li>
              ))}
            </ul>
          </div>

          <div className={styles.resultRow}>
            <strong>Clinical Safety Check:</strong>
            <p>{result.clinical_safety_check}</p>
          </div>

          <div className={styles.resultActions}>
            <button
              type="button"
              className={styles.approveButton}
              onClick={() => setReviewStatus("approved")}
            >
              Approve
            </button>
            <button
              type="button"
              className={styles.rejectButton}
              onClick={() => setReviewStatus("rejected")}
            >
              Reject
            </button>
          </div>
          {reviewStatus === "approved" && (
            <p className={styles.updateSuccessMessage}>Successfully updated!</p>
          )}
          {reviewStatus === "rejected" && (
            <p className={styles.updateRejectedMessage}>Result was rejected</p>
          )}
        </div>
      )}
    </div>
  );
};