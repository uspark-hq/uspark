"use client";

import { useEffect } from "react";
import styles from "./page.module.css";

export default function CliAuthSuccessPage() {
  useEffect(() => {
    // Auto-close tab after 5 seconds
    const timer = setTimeout(() => {
      // Try to close the tab/window
      if (window.opener) {
        window.close();
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.iconWrapper}>
          <svg
            className={styles.icon}
            width="80"
            height="80"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="2"
            />
            <path
              d="M8 12L11 15L16 9"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <h1 className={styles.title}>Authorization Successful!</h1>

        <p className={styles.description}>
          Your CLI has been successfully connected to Uspark.
        </p>

        <div className={styles.message}>
          <p>You can now close this window and return to your terminal.</p>
          <p className={styles.hint}>
            This window will close automatically in a few seconds...
          </p>
        </div>

        <div className={styles.divider}></div>

        <div className={styles.nextSteps}>
          <h2>Next Steps</h2>
          <ul>
            <li>Return to your terminal</li>
            <li>The CLI should now be authenticated</li>
            <li>
              Run <code>uspark auth status</code> to verify
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
