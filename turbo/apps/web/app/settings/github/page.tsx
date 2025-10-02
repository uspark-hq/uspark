import { GitHubConnection } from "./github-connection";
import { Navigation } from "../../components/navigation";

export default function GitHubSettingsPage() {
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
            marginBottom: "10px",
            color: "var(--foreground)",
          }}
        >
          GitHub Integration
        </h1>

        <p
          style={{
            marginBottom: "30px",
            color: "#666",
            lineHeight: "1.5",
          }}
        >
          Connect your GitHub account to sync uSpark projects with GitHub
          repositories. Once connected, you can push your project files to
          GitHub with a single click.
        </p>

        <GitHubConnection />

        <div
          style={{
            marginTop: "40px",
            padding: "20px",
            backgroundColor: "#f6f8fa",
            borderRadius: "8px",
            border: "1px solid #e1e4e8",
          }}
        >
          <h3
            style={{
              margin: "0 0 12px 0",
              fontSize: "1rem",
              color: "var(--foreground)",
            }}
          >
            How it works
          </h3>
          <ol
            style={{
              margin: 0,
              paddingLeft: "20px",
              color: "#666",
              lineHeight: 1.6,
            }}
          >
            <li>
              Install the uSpark GitHub App to your account or organization
            </li>
            <li>Choose which repositories the app can access</li>
            <li>Link each project to an existing repository</li>
            <li>Use the sync button in your project to push files to GitHub</li>
          </ol>
        </div>
      </div>
    </>
  );
}
