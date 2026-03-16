export const hasAnyValidationInput = ({
  demographics,
  medications,
  allergies,
  conditions,
  vital_signs,
  last_updated,
}) =>
  (demographics && Object.keys(demographics).length > 0) ||
  (Array.isArray(medications) && medications.length > 0) ||
  (Array.isArray(allergies) && allergies.length > 0) ||
  (Array.isArray(conditions) && conditions.length > 0) ||
  (vital_signs && Object.keys(vital_signs).length > 0) ||
  Boolean(last_updated);

export const buildEmptyValidationResult = () => ({
  overall_score: 0,
  breakdown: {
    completeness: 0,
    accuracy: 0,
    timeliness: 0,
    clinical_plausibility: 0,
  },
  issues_detected: [],
});

export const buildMockValidationResult = ({
  demographics,
  medications,
  allergies,
  conditions,
  vital_signs,
  last_updated,
}) => {
  const sections = {
    demographics,
    medications,
    allergies,
    conditions,
    vital_signs,
  };

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

  let timeliness = 70;
  if (!last_updated) {
    timeliness = 40;
  }

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

  const accuracy = Math.round((clinicalPlausibility + completeness) / 2);

  const overall_score = Math.round(
    (completeness + accuracy + timeliness + clinicalPlausibility) / 4,
  );

  return {
    overall_score,
    breakdown: {
      completeness,
      accuracy,
      timeliness,
      clinical_plausibility: clinicalPlausibility,
    },
    issues_detected,
  };
};
