import { useState } from "react";
import { DataReconcileCard } from "./components/DataReconcileCard";
import { DataValidationCard } from "./components/DataValidationCard";
import styles from "./App.module.css";

type ActiveCard = "reconcile" | "validate";

export const App = () => {
  const [activeCard, setActiveCard] = useState<ActiveCard>("reconcile");

  return (
    <div className={styles.page}>
      <div className={styles.glowTop} />
      <div className={styles.glowBottom} />
      <div className={styles.appShell}>
        <header className={styles.header}>
          <p className={styles.kicker}>Clinical Intelligence Platform</p>
          <h1>Onye Medical</h1>
          <p className={styles.subtitle}>
            Reconcile critical patient records with confidence and clarity.
          </p>
        </header>

        <nav className={styles.tabs}>
          <button
            type="button"
            onClick={() => setActiveCard("reconcile")}
            className={`${styles.tab} ${activeCard === "reconcile" ? styles.tabActive : ""}`}
          >
            Data Reconciliation
          </button>
          <button
            type="button"
            onClick={() => setActiveCard("validate")}
            className={`${styles.tab} ${activeCard === "validate" ? styles.tabActive : ""}`}
          >
            Data Validation
          </button>
        </nav>

        <main className={styles.content}>
          {activeCard === "reconcile" && <DataReconcileCard />}
          {activeCard === "validate" && <DataValidationCard />}
        </main>
      </div>
    </div>
  );
};
