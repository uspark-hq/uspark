"use client";

import { SignUpButton } from "@clerk/nextjs";
import {
  AINetworkIllustration,
  DataFlowIllustration,
  CreativeSparkIllustration,
} from "./components/AIIllustration";
import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.container}>
      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <h1 className={styles.heroTitle}>
            Your AI conversations,
            <br />
            <span className={styles.heroTitleGradient}>forever organized</span>
          </h1>
          <p className={styles.heroSubtitle}>
            Stop losing brilliant ideas to chat history. uSpark transforms every
            AI conversation into searchable, editable documents that grow with
            your team.
          </p>

          <div className={styles.heroCta}>
            <SignUpButton mode="modal">
              <button className={styles.primaryButton}>
                Start Building Knowledge
              </button>
            </SignUpButton>
            <button className={styles.secondaryButton}>See How It Works</button>
          </div>

          <div className={styles.heroTrust}>
            <span>Trusted by 10,000+ teams</span>
            <span className={styles.divider}>•</span>
            <span>70% faster documentation</span>
            <span className={styles.divider}>•</span>
            <span>Free to start</span>
          </div>
        </div>

        {/* Product Demo Visual */}
        <div className={styles.heroDemo}>
          <div className={styles.demoWindow}>
            <div className={styles.windowHeader}>
              <div className={styles.windowDots}>
                <span></span>
                <span></span>
                <span></span>
              </div>
              <span className={styles.windowTitle}>uSpark</span>
            </div>
            <div className={styles.demoContent}>
              <div className={styles.chatSide}>
                <div className={styles.chatBubble}>
                  <p>Create a PRD for user authentication with SSO support</p>
                </div>
                <div className={styles.aiResponse}>
                  <p>I&apos;ll create a comprehensive PRD for you...</p>
                </div>
              </div>
              <div className={styles.transformArrow}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M7 7l10 10M17 7v10H7"
                    stroke="url(#gradient)"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <defs>
                    <linearGradient
                      id="gradient"
                      x1="0%"
                      y1="0%"
                      x2="100%"
                      y2="100%"
                    >
                      <stop offset="0%" stopColor="#667eea" />
                      <stop offset="100%" stopColor="#764ba2" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              <div className={styles.documentSide}>
                <div className={styles.documentPreview}>
                  <h3># User Authentication PRD</h3>
                  <p>## Overview</p>
                  <p>Single Sign-On implementation...</p>
                  <p>## User Stories</p>
                  <p>## Technical Requirements</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Transformation Demo Section */}
      <section className={styles.demo}>
        <h2 className={styles.sectionTitle}>See the Magic Happen</h2>
        <div className={styles.demoContainer}>
          <div className={styles.demoStep}>
            <span className={styles.stepNumber}>1</span>
            <h3>You Chat</h3>
            <div className={styles.chatExample}>
              <p className={styles.userMessage}>
                &quot;I need a PRD for a new user onboarding flow with email
                verification and progress tracking&quot;
              </p>
            </div>
          </div>
          <div className={styles.demoArrow}>→</div>
          <div className={styles.demoStep}>
            <span className={styles.stepNumber}>2</span>
            <h3>AI Creates</h3>
            <div className={styles.documentPreview}>
              <code>📄 user-onboarding-prd.md</code>
              <p className={styles.previewContent}>
                # User Onboarding Flow PRD
                <br />
                ## Overview
                <br />
                ## User Stories
                <br />
                ## Requirements
                <br />
                ## Success Metrics...
              </p>
            </div>
          </div>
          <div className={styles.demoArrow}>→</div>
          <div className={styles.demoStep}>
            <span className={styles.stepNumber}>3</span>
            <h3>You Own</h3>
            <div className={styles.ownershipFeatures}>
              <p>✅ Edit anywhere</p>
              <p>✅ Share with team</p>
              <p>✅ Version history</p>
              <p>✅ Export anytime</p>
            </div>
          </div>
        </div>
      </section>

      {/* Core Concepts Section */}
      <section className={styles.concepts}>
        <h2 className={styles.sectionTitle}>
          Finally, AI That Creates Reusable Knowledge
        </h2>
        <div className={styles.conceptsGrid}>
          <div className={styles.conceptCard}>
            <div className={styles.conceptIcon}>
              <span className={styles.iconGradient}>💬</span>
            </div>
            <h3>Chat Naturally, Save Automatically</h3>
            <p>
              Just describe what you need. Every conversation becomes a
              structured document you can edit, share, and reuse forever.
            </p>
          </div>
          <div className={styles.conceptCard}>
            <div className={styles.conceptIcon}>
              <span className={styles.iconGradient}>📝</span>
            </div>
            <h3>Professional Documents in Seconds</h3>
            <p>
              Generate PRDs, technical specs, or content briefs instantly. AI
              creates the structure, you refine the details.
            </p>
          </div>
          <div className={styles.conceptCard}>
            <div className={styles.conceptIcon}>
              <span className={styles.iconGradient}>👥</span>
            </div>
            <h3>Real-Time Team Collaboration</h3>
            <p>
              See teammates&apos; edits live. Continue each other&apos;s AI
              conversations. Build shared knowledge together, naturally.
            </p>
          </div>
          <div className={styles.conceptCard}>
            <div className={styles.conceptIcon}>
              <span className={styles.iconGradient}>💻</span>
            </div>
            <h3>Edit Anywhere You Like</h3>
            <p>
              Sync to your Mac, use VS Code, or stay in the browser. Your
              documents, your tools, your workflow.
            </p>
          </div>
        </div>
      </section>

      {/* Why uSpark Section */}
      <section className={styles.whyUspark}>
        <h2 className={styles.sectionTitle}>
          The Missing Link in Your AI Workflow
        </h2>
        <div className={styles.comparisonGrid}>
          <div className={styles.comparisonCard}>
            <h3>ChatGPT / Claude</h3>
            <div className={styles.comparisonContent}>
              <p className={styles.problem}>❌ Linear chat history</p>
              <p className={styles.problem}>❌ Can&apos;t edit responses</p>
              <p className={styles.problem}>❌ No team collaboration</p>
              <p className={styles.problem}>❌ Lost after session ends</p>
            </div>
          </div>
          <div className={styles.comparisonCard}>
            <h3>Notion / Docs</h3>
            <div className={styles.comparisonContent}>
              <p className={styles.problem}>❌ AI is just a feature</p>
              <p className={styles.problem}>❌ Manual organization</p>
              <p className={styles.problem}>❌ Complex structures</p>
              <p className={styles.problem}>❌ Not AI-native</p>
            </div>
          </div>
          <div className={styles.comparisonCard}>
            <h3>uSpark</h3>
            <div className={styles.comparisonContent}>
              <p className={styles.solution}>✓ Every chat → document</p>
              <p className={styles.solution}>✓ Edit anywhere, anytime</p>
              <p className={styles.solution}>✓ Real-time collaboration</p>
              <p className={styles.solution}>✓ AI-native from day one</p>
            </div>
          </div>
        </div>
      </section>

      {/* User Stories Section */}
      <section className={styles.stories}>
        <h2 className={styles.sectionTitle}>Built for Teams Who Ship</h2>
        <div className={styles.storiesContainer}>
          <div className={styles.storyCard}>
            <div className={styles.storyImage}>
              <div className={styles.imageGradient1}>
                <div className={styles.illustrationContainer}>
                  <AINetworkIllustration />
                </div>
              </div>
            </div>
            <div className={styles.storyContent}>
              <span className={styles.storyLabel}>Product Managers</span>
              <h3>PRDs in Minutes, Not Hours</h3>
              <p>
                &quot;I describe the feature in plain English. uSpark generates
                a complete PRD with user stories, requirements, and acceptance
                criteria. I refine it through conversation. What took 3 hours
                now takes 20 minutes.&quot;
              </p>
              <div className={styles.storyMetrics}>
                <div className={styles.metric}>
                  <span className={styles.metricValue}>70%</span>
                  <span className={styles.metricLabel}>
                    Faster PRD Creation
                  </span>
                </div>
                <div className={styles.metric}>
                  <span className={styles.metricValue}>100%</span>
                  <span className={styles.metricLabel}>Consistent Format</span>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.storyCard}>
            <div className={styles.storyContent}>
              <span className={styles.storyLabel}>Engineering Teams</span>
              <h3>Documentation That Stays Updated</h3>
              <p>
                &quot;Our technical docs live where we work. Edit in VS Code,
                sync automatically, collaborate in real-time. The AI understands
                our codebase context and helps maintain consistency across all
                docs.&quot;
              </p>
              <div className={styles.storyMetrics}>
                <div className={styles.metric}>
                  <span className={styles.metricValue}>2 sec</span>
                  <span className={styles.metricLabel}>Sync Time</span>
                </div>
                <div className={styles.metric}>
                  <span className={styles.metricValue}>Zero</span>
                  <span className={styles.metricLabel}>Context Switching</span>
                </div>
              </div>
            </div>
            <div className={styles.storyImage}>
              <div className={styles.imageGradient2}>
                <div className={styles.illustrationContainer}>
                  <DataFlowIllustration />
                </div>
              </div>
            </div>
          </div>

          <div className={styles.storyCard}>
            <div className={styles.storyImage}>
              <div className={styles.imageGradient3}>
                <div className={styles.illustrationContainer}>
                  <CreativeSparkIllustration />
                </div>
              </div>
            </div>
            <div className={styles.storyContent}>
              <span className={styles.storyLabel}>Design Teams</span>
              <h3>From Ideas to Specifications</h3>
              <p>
                &quot;We brainstorm with AI, and every idea becomes a document.
                Design specs, user research notes, feature proposals - all
                searchable, all connected. Our entire design system is now
                AI-aware.&quot;
              </p>
              <div className={styles.storyMetrics}>
                <div className={styles.metric}>
                  <span className={styles.metricValue}>5x</span>
                  <span className={styles.metricLabel}>
                    More Ideas Captured
                  </span>
                </div>
                <div className={styles.metric}>
                  <span className={styles.metricValue}>90%</span>
                  <span className={styles.metricLabel}>Reuse Rate</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className={styles.finalCta}>
        <div className={styles.finalCtaContent}>
          <h2>Stop Losing Your Best Ideas to Chat History</h2>
          <p className={styles.finalCtaTopText}>
            Every conversation with AI should build your knowledge base, not
            disappear into the void.
          </p>
          <SignUpButton mode="modal">
            <button className={styles.primaryCta}>
              Start Building Knowledge
              <span className={styles.arrow}>→</span>
            </button>
          </SignUpButton>
          <p className={styles.finalCtaBottomText}>
            Free to start. No credit card required. Your documents stay yours
            forever.
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
            © 2025 uSpark. Where conversations become knowledge.
          </p>
        </div>
      </footer>
    </div>
  );
}
