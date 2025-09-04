import { generateTokenAction } from "./actions";
import { TokenForm } from "./token-form";

export default function TokensPage() {
  return (
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
        CLI Tokens
      </h1>

      <p
        style={{
          marginBottom: "30px",
          color: "#666",
          lineHeight: "1.5",
        }}
      >
        Generate tokens to authenticate with the uSpark CLI. Set the{" "}
        <code>USPARK_TOKEN</code> environment variable to use CLI commands.
      </p>

      <TokenForm action={generateTokenAction} />
    </div>
  );
}
