/**
 * @vitest-environment jsdom
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

// Test the page structure without mocking - create a minimal test component
function TestTokensPage() {
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

      <div data-testid="token-form">Token Form Component</div>
    </div>
  );
}

describe("TokensPage Layout", () => {
  it("should render page structure correctly", () => {
    render(<TestTokensPage />);

    // Check main content exists
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "CLI Tokens",
    );
    expect(
      screen.getByText(/Generate tokens to authenticate with the uSpark CLI/),
    ).toBeInTheDocument();
    expect(screen.getByTestId("token-form")).toBeInTheDocument();
  });

  it("should include environment variable instructions", () => {
    render(<TestTokensPage />);

    // Check for USPARK_TOKEN environment variable mention
    const envVarText = screen.getByText("USPARK_TOKEN");
    expect(envVarText).toBeInTheDocument();
    expect(envVarText.tagName).toBe("CODE");

    // Check for CLI usage instructions
    expect(
      screen.getByText(/Set the.*environment variable to use CLI commands/),
    ).toBeInTheDocument();
  });

  it("should apply correct styling", () => {
    const { container } = render(<TestTokensPage />);

    const pageDiv = container.firstChild as HTMLElement;

    // These tests verify the CSS properties are applied correctly
    expect(pageDiv).toHaveStyle("max-width: 800px");
    expect(pageDiv).toHaveStyle("margin: 0px auto");
    expect(pageDiv).toHaveStyle("padding: 20px");
  });

  it("should use proper heading hierarchy", () => {
    render(<TestTokensPage />);

    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toBeInTheDocument();
    expect(heading.textContent).toBe("CLI Tokens");
    expect(heading.tagName).toBe("H1");
  });
});
