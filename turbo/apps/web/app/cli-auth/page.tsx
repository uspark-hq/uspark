"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { verifyDeviceAction } from "./actions";
import styles from "./page.module.css";

export default function CliAuthPage() {
  const [deviceCode, setDeviceCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Auto-focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  // Redirect to sign-in if not authenticated
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/sign-in?redirect_url=/cli-auth");
    }
  }, [isLoaded, isSignedIn, router]);

  const handleInputChange = (index: number, value: string) => {
    // Only allow alphanumeric characters
    const sanitized = value.toUpperCase().replace(/[^A-Z0-9]/g, "");

    if (sanitized.length <= 1) {
      const newCode = deviceCode.split("");
      newCode[index] = sanitized;
      setDeviceCode(newCode.join(""));

      // Auto-focus next input
      if (sanitized && index < 7) {
        inputRefs.current[index + 1]?.focus();
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !deviceCode[index] && index > 0) {
      // Move to previous input on backspace
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "Enter" && deviceCode.length === 8) {
      handleSubmit();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text");
    // Remove any non-alphanumeric characters and dashes
    const cleaned = pasted.toUpperCase().replace(/[^A-Z0-9]/g, "");

    if (cleaned.length <= 8) {
      setDeviceCode(cleaned.padEnd(8, ""));
      // Focus last input or first empty one
      const firstEmptyIndex = cleaned.length < 8 ? cleaned.length : 7;
      inputRefs.current[firstEmptyIndex]?.focus();
    }
  };

  const handleSubmit = async () => {
    if (deviceCode.length !== 8) {
      setError("Please enter all 8 characters of the device code");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      // Format the device code with dash (XXXX-XXXX)
      const formattedCode = `${deviceCode.slice(0, 4)}-${deviceCode.slice(4)}`;

      // Call Server Action to verify device code and associate with user
      const result = await verifyDeviceAction(formattedCode);

      if (!result.success) {
        throw new Error("error_description" in result ? result.error_description : "Verification failed");
      }

      setSuccess(true);

      // Show success message for 2 seconds then redirect
      setTimeout(() => {
        router.push("/cli-auth/success");
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Redirecting to sign in...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.iconWrapper}>
          <svg
            className={styles.icon}
            width="64"
            height="64"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M7 8L3 11.6923L7 16M17 8L21 11.6923L17 16M14 4L10 20"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <h1 className={styles.title}>Authorize CLI Access</h1>

        <p className={styles.description}>
          Enter the 8-character code shown in your terminal to connect your CLI
          to Uspark.
        </p>

        {success ? (
          <div className={styles.success}>
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M20 6L9 17L4 12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span>Device authorized successfully!</span>
          </div>
        ) : (
          <>
            <div className={styles.inputGroup}>
              {[...Array(8)].map((_, index) => (
                <React.Fragment key={index}>
                  <input
                    ref={(el) => {
                      inputRefs.current[index] = el;
                    }}
                    type="text"
                    maxLength={1}
                    value={deviceCode[index] || ""}
                    onChange={(e) => handleInputChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onPaste={index === 0 ? handlePaste : undefined}
                    className={styles.input}
                    disabled={isLoading}
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="characters"
                    spellCheck={false}
                  />
                  {index === 3 && <span className={styles.dash}>-</span>}
                </React.Fragment>
              ))}
            </div>

            {error && (
              <div className={styles.error}>
                <svg
                  width="16"
                  height="16"
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
                    d="M12 8V12M12 16H12.01"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={isLoading || deviceCode.length !== 8}
              className={styles.button}
            >
              {isLoading ? "Verifying..." : "Authorize Device"}
            </button>

            <div className={styles.help}>
              <p>Having trouble?</p>
              <ul>
                <li>
                  Make sure you&apos;re entering the code exactly as shown
                </li>
                <li>The code expires after 15 minutes</li>
                <li>
                  Run <code>uspark auth login</code> to get a new code
                </li>
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
