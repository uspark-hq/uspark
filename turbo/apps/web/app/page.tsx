"use client";

import { SignUpButton } from "@clerk/nextjs";
import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.container}>
      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.logoContainer}>
            <div className={styles.sparkEffect}></div>
            <h1 className={styles.logo}>
              <span className={styles.logoU}>u</span>
              <span className={styles.logoSpark}>Spark</span>
            </h1>
          </div>
          <p className={styles.slogan}>
            Ignite Your AI Workflow. Supercharge Your Productivity.
          </p>
          <p className={styles.heroDescription}>
            The next-generation AI assistant that understands your context,
            learns your patterns, and delivers intelligent automation at scale.
          </p>
          <div className={styles.ctaContainer}>
            <SignUpButton mode="modal">
              <button className={styles.primaryCta}>
                Join the Waiting List
                <span className={styles.arrow}>→</span>
              </button>
            </SignUpButton>
            <p className={styles.ctaSubtext}>
              Be among the first to experience the future of AI assistance
            </p>
          </div>
        </div>
        <div className={styles.heroVisual}>
          <div className={styles.floatingCard}>
            <div className={styles.cardGradient}></div>
          </div>
        </div>
      </section>

      {/* Core Concepts Section */}
      <section className={styles.concepts}>
        <h2 className={styles.sectionTitle}>
          Redefining What AI Can Do For You
        </h2>
        <div className={styles.conceptsGrid}>
          <div className={styles.conceptCard}>
            <div className={styles.conceptIcon}>
              <span className={styles.iconGradient}>🧠</span>
            </div>
            <h3>Contextual Intelligence</h3>
            <p>
              uSpark remembers your preferences, understands your projects, and
              adapts to your unique workflow patterns.
            </p>
          </div>
          <div className={styles.conceptCard}>
            <div className={styles.conceptIcon}>
              <span className={styles.iconGradient}>⚡</span>
            </div>
            <h3>Lightning Fast Automation</h3>
            <p>
              Execute complex workflows in seconds. From data analysis to
              content creation, uSpark handles it all with unprecedented speed.
            </p>
          </div>
          <div className={styles.conceptCard}>
            <div className={styles.conceptIcon}>
              <span className={styles.iconGradient}>🔐</span>
            </div>
            <h3>Enterprise-Grade Security</h3>
            <p>
              Your data stays yours. With end-to-end encryption and
              privacy-first architecture, trust is built into every interaction.
            </p>
          </div>
          <div className={styles.conceptCard}>
            <div className={styles.conceptIcon}>
              <span className={styles.iconGradient}>🎯</span>
            </div>
            <h3>Precision Customization</h3>
            <p>
              Fine-tune uSpark to match your exact needs. Create custom agents,
              workflows, and integrations that work perfectly for you.
            </p>
          </div>
        </div>
      </section>

      {/* User Stories Section */}
      <section className={styles.stories}>
        <h2 className={styles.sectionTitle}>Transform Your Daily Workflow</h2>
        <div className={styles.storiesContainer}>
          <div className={styles.storyCard}>
            <div className={styles.storyImage}>
              <div className={styles.imageGradient1}></div>
            </div>
            <div className={styles.storyContent}>
              <span className={styles.storyLabel}>For Developers</span>
              <h3>Code Smarter, Ship Faster</h3>
              <p>
                &quot;uSpark reduced our development cycle by 40%. It
                understands our codebase, suggests optimal solutions, and
                automates testing workflows. It&apos;s like having a senior
                developer available 24/7.&quot;
              </p>
              <div className={styles.storyMetrics}>
                <div className={styles.metric}>
                  <span className={styles.metricValue}>40%</span>
                  <span className={styles.metricLabel}>Faster Development</span>
                </div>
                <div className={styles.metric}>
                  <span className={styles.metricValue}>60%</span>
                  <span className={styles.metricLabel}>Fewer Bugs</span>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.storyCard}>
            <div className={styles.storyContent}>
              <span className={styles.storyLabel}>For Researchers</span>
              <h3>Accelerate Discovery</h3>
              <p>
                &quot;What used to take weeks now takes hours. uSpark analyzes
                research papers, synthesizes findings, and helps us identify
                patterns we would have never found manually.&quot;
              </p>
              <div className={styles.storyMetrics}>
                <div className={styles.metric}>
                  <span className={styles.metricValue}>10x</span>
                  <span className={styles.metricLabel}>Research Speed</span>
                </div>
                <div className={styles.metric}>
                  <span className={styles.metricValue}>95%</span>
                  <span className={styles.metricLabel}>Accuracy Rate</span>
                </div>
              </div>
            </div>
            <div className={styles.storyImage}>
              <div className={styles.imageGradient2}></div>
            </div>
          </div>

          <div className={styles.storyCard}>
            <div className={styles.storyImage}>
              <div className={styles.imageGradient3}></div>
            </div>
            <div className={styles.storyContent}>
              <span className={styles.storyLabel}>For Creators</span>
              <h3>Unleash Creative Potential</h3>
              <p>
                &quot;uSpark is my creative partner. From ideation to final
                polish, it helps me produce content that resonates. My
                engagement has tripled since I started using it.&quot;
              </p>
              <div className={styles.storyMetrics}>
                <div className={styles.metric}>
                  <span className={styles.metricValue}>3x</span>
                  <span className={styles.metricLabel}>Engagement Growth</span>
                </div>
                <div className={styles.metric}>
                  <span className={styles.metricValue}>5h</span>
                  <span className={styles.metricLabel}>Saved Daily</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className={styles.finalCta}>
        <div className={styles.finalCtaContent}>
          <h2>Ready to Spark Your Potential?</h2>
          <p>
            Join thousands of innovators already on the waiting list. Be first
            to experience the AI assistant that changes everything.
          </p>
          <SignUpButton mode="modal">
            <button className={styles.primaryCta}>
              Reserve Your Spot
              <span className={styles.arrow}>→</span>
            </button>
          </SignUpButton>
          <p className={styles.availabilityText}>
            Limited early access • Launching Q1 2025
          </p>
        </div>
        <div className={styles.finalCtaBackground}></div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <div className={styles.footerLogo}>
            <span className={styles.logoU}>u</span>
            <span className={styles.logoSpark}>Spark</span>
          </div>
          <p className={styles.footerText}>
            © 2025 uSpark. Building the future of AI assistance.
          </p>
        </div>
      </footer>
    </div>
  );
}
