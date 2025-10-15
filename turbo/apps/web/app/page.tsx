"use client";

import { TerminalHome } from "./components/TerminalHome";
import styles from "./page.module.css";

// Home page component - displays the landing page with terminal interface
export default function Home() {
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.headerLogo}>
            <span className={styles.logoU}>u</span>
            <span className={styles.logoSpark}>Spark</span>
          </div>
        </div>
      </header>

      <TerminalHome />
    </div>
  );
}
