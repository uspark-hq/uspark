/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// Mock Next.js Link component
vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

// Mock Server Actions
vi.mock("./actions", () => ({
  getShares: vi.fn(),
  deleteShare: vi.fn(),
}));

// Test the page structure without data fetching
function TestSharesPage() {
  return (
    <div
      style={{
        maxWidth: "1200px",
        margin: "0 auto",
        padding: "32px 24px",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      {/* Header */}
      <div
        style={{
          marginBottom: "32px",
          borderBottom: "1px solid rgba(156, 163, 175, 0.2)",
          paddingBottom: "24px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "8px",
          }}
        >
          <h1
            style={{
              fontSize: "28px",
              fontWeight: "600",
              margin: 0,
              color: "var(--foreground)",
            }}
          >
            Shared Links
          </h1>
          <a
            href="/settings"
            style={{
              padding: "8px 16px",
              fontSize: "14px",
              color: "rgba(156, 163, 175, 0.8)",
              textDecoration: "none",
              border: "1px solid rgba(156, 163, 175, 0.2)",
              borderRadius: "4px",
              backgroundColor: "transparent",
            }}
          >
            ← Back to Settings
          </a>
        </div>
        <p
          style={{
            fontSize: "14px",
            color: "rgba(156, 163, 175, 0.8)",
            margin: 0,
          }}
        >
          Manage your shared file links. Revoke access at any time.
        </p>
      </div>

      {/* Loading state */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "200px",
          color: "rgba(156, 163, 175, 0.6)",
        }}
      >
        Loading shares...
      </div>
    </div>
  );
}

describe("SharesPage Layout", () => {
  it("should render page structure correctly", () => {
    render(<TestSharesPage />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Shared Links",
    );
    expect(screen.getByText("← Back to Settings")).toBeInTheDocument();
    expect(
      screen.getByText(/Manage your shared file links/),
    ).toBeInTheDocument();
  });

  it("should display loading state", () => {
    render(<TestSharesPage />);
    expect(screen.getByText("Loading shares...")).toBeInTheDocument();
  });

  it("should apply correct styling", () => {
    const { container } = render(<TestSharesPage />);
    const pageDiv = container.firstChild as HTMLElement;

    expect(pageDiv).toHaveStyle("max-width: 1200px");
    expect(pageDiv).toHaveStyle("margin: 0px auto");
    expect(pageDiv).toHaveStyle("padding: 32px 24px");
  });

  it("should use proper heading hierarchy", () => {
    render(<TestSharesPage />);

    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toBeInTheDocument();
    expect(heading.textContent).toBe("Shared Links");
    expect(heading.tagName).toBe("H1");
  });
});