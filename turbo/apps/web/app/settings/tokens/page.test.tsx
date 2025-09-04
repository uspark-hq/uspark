import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import TokensPage from "./page";

// Simple mock - just verify the component structure
vi.mock("./token-form", () => ({
  TokenForm: () => <div data-testid="token-form">Token Form Component</div>,
}));

vi.mock("./actions", () => ({
  generateTokenAction: () => {},
}));

describe("TokensPage", () => {
  it("should render complete page structure", () => {
    render(<TokensPage />);
    
    // Check main content
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("CLI Tokens");
    expect(screen.getByText(/Generate tokens to authenticate with the uSpark CLI/)).toBeInTheDocument();
    expect(screen.getByTestId("token-form")).toBeInTheDocument();
  });

  it("should include usage instructions", () => {
    render(<TokensPage />);
    
    // Check for USPARK_TOKEN environment variable mention
    const envVarText = screen.getByText("USPARK_TOKEN");
    expect(envVarText).toBeInTheDocument();
    expect(envVarText.tagName).toBe("CODE");
    
    // Check for CLI usage instructions
    expect(screen.getByText(/Set the.*environment variable to use CLI commands/)).toBeInTheDocument();
  });

  it("should have proper layout styling", () => {
    const { container } = render(<TokensPage />);
    
    const pageDiv = container.firstChild as HTMLElement;
    const styles = window.getComputedStyle(pageDiv);
    
    // These tests verify the CSS properties are applied
    expect(pageDiv).toHaveStyle("max-width: 800px");
    expect(pageDiv).toHaveStyle("margin: 0px auto");
    expect(pageDiv).toHaveStyle("padding: 20px");
  });

  it("should render heading with correct hierarchy", () => {
    render(<TokensPage />);
    
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toBeInTheDocument();
    expect(heading.textContent).toBe("CLI Tokens");
    
    // Verify it's actually an h1 element
    expect(heading.tagName).toBe("H1");
  });
});