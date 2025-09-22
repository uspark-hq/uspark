import Link from "next/link";
import { Navigation } from "../components/navigation";

export default function SettingsPage() {
  return (
    <>
      <Navigation />
      <div
        style={{
          maxWidth: "800px",
          margin: "0 auto",
          padding: "20px",
          fontFamily:
            "var(--font-inter, -apple-system, BlinkMacSystemFont, sans-serif)",
        }}
      >
        <h1
          style={{
            fontSize: "2rem",
            marginBottom: "30px",
            color: "var(--foreground)",
          }}
        >
          Settings
        </h1>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "20px",
          }}
        >
          <Link
            href="/settings/github"
            style={{
              padding: "20px",
              border: "1px solid #e1e4e8",
              borderRadius: "8px",
              textDecoration: "none",
              color: "inherit",
              display: "block",
              transition: "border-color 0.2s",
            }}
          >
            <h2
              style={{
                fontSize: "1.25rem",
                marginBottom: "8px",
                color: "var(--foreground)",
              }}
            >
              GitHub Integration
            </h2>
            <p style={{ color: "#666", margin: 0 }}>
              Connect your GitHub account to sync projects with repositories
            </p>
          </Link>

          <Link
            href="/settings/tokens"
            style={{
              padding: "20px",
              border: "1px solid #e1e4e8",
              borderRadius: "8px",
              textDecoration: "none",
              color: "inherit",
              display: "block",
              transition: "border-color 0.2s",
            }}
          >
            <h2
              style={{
                fontSize: "1.25rem",
                marginBottom: "8px",
                color: "var(--foreground)",
              }}
            >
              CLI Tokens
            </h2>
            <p style={{ color: "#666", margin: 0 }}>
              Generate tokens to authenticate with the uSpark CLI
            </p>
          </Link>

          <Link
            href="/settings/shares"
            style={{
              padding: "20px",
              border: "1px solid #e1e4e8",
              borderRadius: "8px",
              textDecoration: "none",
              color: "inherit",
              display: "block",
              transition: "border-color 0.2s",
            }}
          >
            <h2
              style={{
                fontSize: "1.25rem",
                marginBottom: "8px",
                color: "var(--foreground)",
              }}
            >
              Shared Links
            </h2>
            <p style={{ color: "#666", margin: 0 }}>
              Manage shared project links and permissions
            </p>
          </Link>

          <Link
            href="/settings/claude-token"
            style={{
              padding: "20px",
              border: "1px solid #e1e4e8",
              borderRadius: "8px",
              textDecoration: "none",
              color: "inherit",
              display: "block",
              transition: "border-color 0.2s",
            }}
          >
            <h2
              style={{
                fontSize: "1.25rem",
                marginBottom: "8px",
                color: "var(--foreground)",
              }}
            >
              Claude OAuth Token
            </h2>
            <p style={{ color: "#666", margin: 0 }}>
              Configure your Claude OAuth token for E2B execution
            </p>
          </Link>
        </div>
      </div>
    </>
  );
}
