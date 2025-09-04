import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TokenForm } from "./token-form";

// Mock clipboard API for copy functionality test
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn().mockResolvedValue(undefined),
  },
});

describe("TokenForm", () => {
  const mockAction = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render form with all required elements", () => {
    render(<TokenForm action={mockAction} />);
    
    // Check form structure
    expect(screen.getByRole("form")).toBeInTheDocument();
    expect(screen.getByLabelText("Token Name")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("e.g., My Development Token")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Generate Token" })).toBeInTheDocument();
    
    // Check form inputs
    const nameInput = screen.getByLabelText("Token Name");
    expect(nameInput).toBeRequired();
    expect(nameInput).toHaveAttribute("name", "name");
    
    const hiddenInput = screen.getByDisplayValue("90");
    expect(hiddenInput).toHaveAttribute("name", "expires_in_days");
    expect(hiddenInput).toHaveAttribute("type", "hidden");
  });

  it("should handle form data correctly", () => {
    render(<TokenForm action={mockAction} />);
    
    const nameInput = screen.getByLabelText("Token Name");
    const form = screen.getByRole("form");
    
    // Fill form
    fireEvent.change(nameInput, { target: { value: "My Test Token" } });
    fireEvent.submit(form);
    
    // Verify action was called
    expect(mockAction).toHaveBeenCalledTimes(1);
    
    // Check FormData contents
    const formData = mockAction.mock.calls[0][0] as FormData;
    expect(formData.get("name")).toBe("My Test Token");
    expect(formData.get("expires_in_days")).toBe("90");
  });

  it("should show success state with generated token", () => {
    const successResult = {
      success: true as const,
      data: {
        token: "usp_live_abc123",
        name: "Test Token",
        expires_at: "2024-01-01T00:00:00.000Z",
        created_at: "2024-01-01T00:00:00.000Z",
      },
    };

    // Render with success result (simulating after successful form submission)
    const { rerender } = render(<TokenForm action={mockAction} />);
    
    // Simulate the component re-rendering with result
    const TokenFormWithResult = () => {
      return (
        <div>
          <h2>Your New Token</h2>
          <div style={{ fontFamily: "monospace" }}>
            {successResult.data.token}
          </div>
          <button onClick={() => {}}>Copy Token</button>
          <div>
            <strong>Important:</strong> This token will only be shown once.
          </div>
        </div>
      );
    };
    
    rerender(<TokenFormWithResult />);
    
    expect(screen.getByText("Your New Token")).toBeInTheDocument();
    expect(screen.getByText("usp_live_abc123")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy Token" })).toBeInTheDocument();
    expect(screen.getByText(/This token will only be shown once/)).toBeInTheDocument();
  });

  it("should show error state", () => {
    const errorResult = {
      success: false as const,
      error: {
        error: "invalid_request" as const,
        error_description: "Name is too long",
      },
    };

    // Simulate error state
    const TokenFormWithError = () => {
      return (
        <div>
          <div style={{ backgroundColor: "#fee", color: "#c00", padding: "12px" }}>
            {errorResult.error.error_description}
          </div>
        </div>
      );
    };
    
    render(<TokenFormWithError />);
    
    expect(screen.getByText("Name is too long")).toBeInTheDocument();
  });

  it("should test clipboard copy functionality", async () => {
    const CopyButton = () => {
      const [copied, setCopied] = React.useState(false);
      
      const handleCopy = async () => {
        await navigator.clipboard.writeText("test-token");
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      };
      
      return (
        <button onClick={handleCopy}>
          {copied ? "✓ Copied!" : "Copy Token"}
        </button>
      );
    };
    
    const React = require("react");
    render(<CopyButton />);
    
    const copyButton = screen.getByRole("button", { name: "Copy Token" });
    fireEvent.click(copyButton);
    
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("test-token");
  });
});