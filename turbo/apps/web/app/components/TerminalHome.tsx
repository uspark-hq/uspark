"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Terminal from "react-console-emulator";
import styles from "./TerminalHome.module.css";

export function TerminalHome() {
  const router = useRouter();
  const { isSignedIn } = useAuth();

  // Auto-redirect to projects page if user is already signed in
  useEffect(() => {
    if (isSignedIn) {
      router.push("/projects");
    }
  }, [isSignedIn, router]);

  const commands = {
    about: {
      description: "Learn about uSpark",
      fn: () => {
        return `
uSpark - The Manager for ALL AI Coding Tools
=============================================

Transform individual AI coding sessions into structured software projects.

uSpark orchestrates Claude Code, Cursor, and Windsurf through:
  • Project Intelligence - Understands your codebase via GitHub
  • Task Orchestration - Breaks down features into AI-executable tasks
  • Progress Tracking - Analyzes commits to track real progress
  • Tech Debt Management - Identifies issues in AI-generated code

For solo developers, tech leads, and indie hackers building with AI.

Type 'login' to get started or 'signup' to join the waitlist.
        `.trim();
      },
    },
    login: {
      description: "Sign in to your account",
      fn: () => {
        if (isSignedIn) {
          router.push("/projects");
          return "Already signed in. Redirecting to projects...";
        }
        router.push("/sign-in");
        return "Redirecting to login...";
      },
    },
    signup: {
      description: "Join the waitlist",
      fn: () => {
        router.push("/sign-up");
        return "Redirecting to signup...";
      },
    },
    github: {
      description: "View our GitHub repository",
      fn: () => {
        window.open("https://github.com/uspark-hq/uspark", "_blank");
        return "Opening GitHub repository in new tab...";
      },
    },
  };

  const welcomeMessage = `
Welcome to uSpark - The Manager for ALL AI Coding Tools
========================================================

Transform AI coding sessions into structured software projects.
Orchestrate Claude Code, Cursor, and Windsurf through systematic
documentation and task management.

Available commands: about, login, signup, github, help, clear
Type 'help' to see command descriptions or 'login' to get started.
  `.trim();

  return (
    <div className={styles.terminalContainer}>
      <Terminal
        commands={commands}
        welcomeMessage={welcomeMessage}
        promptLabel={isSignedIn ? "user@uspark:~$" : "visitor@uspark:~$"}
        style={{
          backgroundColor: "#0a0a0a",
          minHeight: "100vh",
          padding: "2rem",
        }}
        messageStyle={{
          color: "#e0e0e0",
        }}
        promptLabelStyle={{
          color: "#00ff00",
        }}
        inputTextStyle={{
          color: "#ffffff",
        }}
        autoFocus
        noDefaults={false}
      />
    </div>
  );
}
