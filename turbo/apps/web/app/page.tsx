"use client";

import { SignUpButton } from "@clerk/nextjs";
import { Button } from "@uspark/ui";
import {
  AINetworkIllustration,
  DataFlowIllustration,
  CreativeSparkIllustration,
} from "./components/AIIllustration";
import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.headerLogo}>
            <span className={styles.logoU}>u</span>
            <span className={styles.logoSpark}>Spark</span>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.heroText}>
            <h1 className={styles.heroTitle}>
              The Manager for
              <br />
              <span className={styles.heroTitleGradient}>
                ALL AI Coding Tools
              </span>
            </h1>
            <p className={styles.heroSubtitle}>
              Transform individual AI coding sessions into structured software
              projects. uSpark orchestrates Claude Code, Cursor, and Windsurf
              through systematic documentation and task management.
            </p>

            <div className={styles.heroCta}>
              <SignUpButton mode="modal">
                <Button size="lg" className={styles.primaryButton}>
                  Join Waitlist
                </Button>
              </SignUpButton>
            </div>
          </div>

          {/* Animated Demo */}
          <div className={styles.heroAnimation}>
            <div className={styles.animatedDemo}>
              <div className={styles.demoStep} data-step="1">
                <div className={styles.chatMessage}>
                  <p>
                    &quot;Break down this feature into AI-executable tasks&quot;
                  </p>
                </div>
              </div>
              <div className={styles.animatedArrow}>↓</div>
              <div className={styles.demoStep} data-step="2">
                <div className={styles.aiProcessing}>
                  <p>Analyzing codebase and generating tasks...</p>
                  <div className={styles.loadingDots}>
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
              <div className={styles.animatedArrow}>↓</div>
              <div className={styles.demoStep} data-step="3">
                <div className={styles.generatedDoc}>
                  <div className={styles.docHeader}>
                    📋 implementation-tasks.md
                  </div>
                  <div className={styles.docContent}>
                    <p># Task Breakdown</p>
                    <p>## Task 1: Setup API endpoints</p>
                    <p>## Task 2: Implement UI components</p>
                    <p>## Task 3: Add validation logic</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Transformation Demo Section */}
      <section className={styles.demo}>
        <h2 className={styles.sectionTitle}>
          Your AI Coding Workflow, Managed
        </h2>
        <div className={styles.demoContainer}>
          <div className={styles.demoStep}>
            <span className={styles.stepNumber}>1</span>
            <h3>Connect GitHub</h3>
            <div className={styles.chatExample}>
              <p className={styles.userMessage}>
                uSpark analyzes your codebase structure and understands your
                project context
              </p>
            </div>
          </div>
          <div className={styles.demoArrow}>→</div>
          <div className={styles.demoStep}>
            <span className={styles.stepNumber}>2</span>
            <h3>Generate Tasks</h3>
            <div className={styles.documentPreview}>
              <code>📋 task-breakdown.md</code>
              <p className={styles.previewContent}>
                # Feature Tasks
                <br />
                ## Task 1: API Setup
                <br />
                ## Task 2: Database Schema
                <br />
                ## Task 3: Frontend UI
                <br />
                With optimized prompts...
              </p>
            </div>
          </div>
          <div className={styles.demoArrow}>→</div>
          <div className={styles.demoStep}>
            <span className={styles.stepNumber}>3</span>
            <h3>Execute with AI</h3>
            <div className={styles.ownershipFeatures}>
              <p>✅ Claude Code execution</p>
              <p>✅ Sync to GitHub</p>
              <p>✅ Track progress</p>
              <p>✅ Manage tech debt</p>
            </div>
          </div>
        </div>
      </section>

      {/* Core Concepts Section */}
      <section className={styles.concepts}>
        <h2 className={styles.sectionTitle}>Built for AI Coding at Scale</h2>
        <div className={styles.conceptsGrid}>
          <div className={styles.conceptCard}>
            <div className={styles.conceptIcon}>
              <span className={styles.iconGradient}>🧠</span>
            </div>
            <h3>Project Intelligence</h3>
            <p>
              Understands your codebase through GitHub integration. Provides
              architectural insights and maintains context across all AI
              sessions.
            </p>
          </div>
          <div className={styles.conceptCard}>
            <div className={styles.conceptIcon}>
              <span className={styles.iconGradient}>📋</span>
            </div>
            <h3>Task Orchestration</h3>
            <p>
              Breaks down complex requirements into AI-executable tasks with
              high-quality prompts optimized for Claude Code, Cursor, or
              Windsurf.
            </p>
          </div>
          <div className={styles.conceptCard}>
            <div className={styles.conceptIcon}>
              <span className={styles.iconGradient}>📊</span>
            </div>
            <h3>Progress Tracking</h3>
            <p>
              Analyzes commit history and code changes to track real progress.
              Code doesn&apos;t lie - see what was actually built vs planned.
            </p>
          </div>
          <div className={styles.conceptCard}>
            <div className={styles.conceptIcon}>
              <span className={styles.iconGradient}>🔍</span>
            </div>
            <h3>Technical Debt Management</h3>
            <p>
              Identifies and tracks issues in AI-generated code. Systematic
              improvement through documented decisions and learnings.
            </p>
          </div>
        </div>
      </section>

      {/* Why uSpark Section */}
      <section className={styles.whyUspark}>
        <h2 className={styles.sectionTitle}>
          The Missing Management Layer for AI Coding
        </h2>
        <div className={styles.comparisonGrid}>
          <div className={`${styles.comparisonCard} ${styles.grayedOut}`}>
            <h3>Cursor / Windsurf / Claude Code</h3>
            <div className={styles.comparisonContent}>
              <p className={styles.problem}>❌ No project context</p>
              <p className={styles.problem}>❌ Session starts from scratch</p>
              <p className={styles.problem}>❌ No task management</p>
              <p className={styles.problem}>❌ Zero switching cost</p>
            </div>
          </div>
          <div className={`${styles.comparisonCard} ${styles.grayedOut}`}>
            <h3>Linear / Jira</h3>
            <div className={styles.comparisonContent}>
              <p className={styles.problem}>❌ Can&apos;t understand code</p>
              <p className={styles.problem}>❌ No AI prompt generation</p>
              <p className={styles.problem}>❌ Built for humans only</p>
              <p className={styles.problem}>❌ No codebase analysis</p>
            </div>
          </div>
          <div className={styles.comparisonCard}>
            <h3>uSpark</h3>
            <div className={styles.comparisonContent}>
              <p className={styles.solution}>✓ Maintains project memory</p>
              <p className={styles.solution}>✓ GitHub-native integration</p>
              <p className={styles.solution}>✓ AI task orchestration</p>
              <p className={styles.solution}>✓ Accumulated wisdom</p>
            </div>
          </div>
        </div>
      </section>

      {/* User Stories Section */}
      <section className={styles.stories}>
        <h2 className={styles.sectionTitle}>For AI Coding Practitioners</h2>
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
              <span className={styles.storyLabel}>Solo Developers</span>
              <h3>From MVP to Production</h3>
              <p>
                &quot;I can build features quickly with AI, but struggled with
                project organization. uSpark breaks down my requirements into
                perfect prompts for Claude Code, tracks what&apos;s built, and
                helps me manage the technical debt that comes with rapid AI
                development.&quot;
              </p>
              <div className={styles.storyMetrics}>
                <div className={styles.metric}>
                  <span className={styles.metricValue}>10x</span>
                  <span className={styles.metricLabel}>More Organized</span>
                </div>
                <div className={styles.metric}>
                  <span className={styles.metricValue}>GitHub</span>
                  <span className={styles.metricLabel}>Synced</span>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.storyCard}>
            <div className={styles.storyContent}>
              <span className={styles.storyLabel}>Tech Leads</span>
              <h3>Managing AI-Assisted Teams</h3>
              <p>
                &quot;My team uses different AI tools - Cursor, Windsurf, Claude
                Code. uSpark is our single source of truth. It generates
                consistent tasks, tracks actual progress through commits, and
                maintains our architectural decisions across all AI-generated
                code.&quot;
              </p>
              <div className={styles.storyMetrics}>
                <div className={styles.metric}>
                  <span className={styles.metricValue}>All Tools</span>
                  <span className={styles.metricLabel}>Supported</span>
                </div>
                <div className={styles.metric}>
                  <span className={styles.metricValue}>Real-time</span>
                  <span className={styles.metricLabel}>Progress</span>
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
              <span className={styles.storyLabel}>Indie Hackers</span>
              <h3>Ship Fast, Stay Organized</h3>
              <p>
                &quot;I&apos;m building products with AI but lacked engineering
                discipline. uSpark gives me structure - task breakdowns,
                technical specs, and a clear record of what&apos;s been built.
                It&apos;s like having a technical co-founder who keeps
                everything organized.&quot;
              </p>
              <div className={styles.storyMetrics}>
                <div className={styles.metric}>
                  <span className={styles.metricValue}>Structure</span>
                  <span className={styles.metricLabel}>Added</span>
                </div>
                <div className={styles.metric}>
                  <span className={styles.metricValue}>Tech Debt</span>
                  <span className={styles.metricLabel}>Tracked</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className={styles.finalCta}>
        <div className={styles.finalCtaContent}>
          <h2>AI Can Write Code, But It Can&apos;t Manage Projects</h2>
          <p className={styles.finalCtaTopText}>
            Bridge the gap between AI coding and software engineering. Start
            managing your AI development workflow properly.
          </p>
          <SignUpButton mode="modal">
            <Button size="lg" className={styles.primaryButton}>
              Join Waitlist
            </Button>
          </SignUpButton>
          <p className={styles.finalCtaBottomText}>
            Free to start. Works with Claude Code, Cursor, and Windsurf. Your
            project intelligence grows with every commit.
          </p>
        </div>
        <div className={styles.finalCtaBackground}></div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <div className={styles.footerLogo}>
            <span className={styles.footerLogoU}>u</span>
            <span className={styles.footerLogoSpark}>Spark</span>
          </div>
          <p className={styles.footerText}>
            © 2025 uSpark. The Manager for ALL AI Coding Tools.
          </p>
        </div>
      </footer>
    </div>
  );
}
