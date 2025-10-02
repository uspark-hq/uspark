/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import SharesPage from "./page";

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

describe("SharesPage", () => {
  beforeAll(() => {
    // MSW server is already started in msw-setup.ts
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should handle delete share", async () => {
    // Mock window.confirm
    const originalConfirm = window.confirm;
    window.confirm = vi.fn(() => true);

    render(<SharesPage />);

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText("Loading shares...")).not.toBeInTheDocument();
    });

    // Click revoke button (first one)
    const revokeButtons = screen.getAllByText("Revoke");
    if (revokeButtons[0]) {
      fireEvent.click(revokeButtons[0]);
    }

    // Wait for the share to be removed from UI
    await waitFor(() => {
      // The component should filter out the deleted share
      expect(screen.queryByText("src/test.ts")).not.toBeInTheDocument();
    });

    // Restore confirm
    window.confirm = originalConfirm;
  });

  it("should handle copy link", async () => {
    // Mock clipboard API
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });

    render(<SharesPage />);

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText("Loading shares...")).not.toBeInTheDocument();
    });

    // Click copy button (first one)
    const copyButtons = screen.getAllByText("Copy Link");
    if (copyButtons[0]) {
      fireEvent.click(copyButtons[0]);
    }

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      "https://www.uspark.ai/share/token-1",
    );
  });
});
