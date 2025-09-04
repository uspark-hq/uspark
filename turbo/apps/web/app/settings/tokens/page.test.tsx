import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import TokensPage from "./page";

// Mock the form component and action
vi.mock("./token-form", () => ({
  TokenForm: ({ action }: { action: Function }) => (
    <div data-testid="token-form">
      Mocked TokenForm - Action: {action.name}
    </div>
  ),
}));

vi.mock("./actions", () => ({
  generateTokenAction: vi.fn().mockName("generateTokenAction"),
}));

describe("TokensPage", () => {
  it("should render page title and description", () => {
    render(<TokensPage />);
    
    expect(screen.getByRole("heading", { level: 1, name: "CLI Tokens" })).toBeInTheDocument();
    
    expect(screen.getByText(/Generate tokens to authenticate with the uSpark CLI/)).toBeInTheDocument();
    expect(screen.getByText(/USPARK_TOKEN/)).toBeInTheDocument();
  });

  it("should render TokenForm component with generateTokenAction", () => {
    render(<TokensPage />);
    
    const tokenForm = screen.getByTestId("token-form");
    expect(tokenForm).toBeInTheDocument();
    expect(tokenForm).toHaveTextContent("generateTokenAction");
  });

  it("should have proper page styling", () => {
    render(<TokensPage />);
    
    const container = screen.getByRole("heading", { level: 1 }).closest("div");
    expect(container).toHaveStyle({
      maxWidth: "800px",
      margin: "0 auto",
      padding: "20px",
    });
  });

  it("should render instructions about environment variable", () => {
    render(<TokensPage />);
    
    const instructions = screen.getByText(/Set the/);
    expect(instructions).toBeInTheDocument();
    
    const code = screen.getByText("USPARK_TOKEN");
    expect(code.tagName).toBe("CODE");
  });
});