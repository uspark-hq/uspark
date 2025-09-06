/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import SharesPage from "./page";

// Mock Next.js Link component
vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

// Mock fetch for API calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("SharesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render loading state initially", () => {
    mockFetch.mockImplementation(() => 
      new Promise(() => {}) // Never resolves to keep loading
    );

    render(<SharesPage />);
    expect(screen.getByText("Loading shares...")).toBeInTheDocument();
  });

  it("should render empty state when no shares", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ shares: [] }),
    });

    render(<SharesPage />);

    await waitFor(() => {
      expect(screen.getByText("No shared links yet")).toBeInTheDocument();
      expect(screen.getByText(/Share files from your projects/)).toBeInTheDocument();
    });
  });

  it("should render shares list when data is available", async () => {
    const mockShares = [
      {
        id: "share-1",
        token: "token-1",
        projectId: "project-1",
        filePath: "src/test.ts",
        url: "https://uspark.dev/share/token-1",
        createdAt: "2024-01-01T10:00:00Z",
        accessedCount: 5,
        lastAccessedAt: "2024-01-02T15:00:00Z",
      },
      {
        id: "share-2",
        token: "token-2",
        projectId: "project-2",
        filePath: "README.md",
        url: "https://uspark.dev/share/token-2",
        createdAt: "2024-01-03T10:00:00Z",
        accessedCount: 0,
        lastAccessedAt: null,
      },
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ shares: mockShares }),
    });

    render(<SharesPage />);

    await waitFor(() => {
      // Check first share
      expect(screen.getByText("📄 src/test.ts")).toBeInTheDocument();
      expect(screen.getByText("Project: project-1")).toBeInTheDocument();
      expect(screen.getByText("Accessed: 5 times")).toBeInTheDocument();

      // Check second share
      expect(screen.getByText("📄 README.md")).toBeInTheDocument();
      expect(screen.getByText("Project: project-2")).toBeInTheDocument();
      expect(screen.getByText("Accessed: 0 times")).toBeInTheDocument();
    });
  });

  it("should handle delete share", async () => {
    const mockShares = [
      {
        id: "share-1",
        token: "token-1",
        projectId: "project-1",
        filePath: "test.ts",
        url: "https://uspark.dev/share/token-1",
        createdAt: "2024-01-01T10:00:00Z",
        accessedCount: 0,
        lastAccessedAt: null,
      },
    ];

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ shares: mockShares }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

    // Mock window.confirm
    const originalConfirm = window.confirm;
    window.confirm = vi.fn(() => true);

    render(<SharesPage />);

    await waitFor(() => {
      expect(screen.getByText("📄 test.ts")).toBeInTheDocument();
    });

    // Click revoke button
    const revokeButton = screen.getByText("Revoke");
    fireEvent.click(revokeButton);

    await waitFor(() => {
      // Verify delete API was called
      expect(mockFetch).toHaveBeenCalledWith("/api/shares/share-1", {
        method: "DELETE",
      });
    });

    // Restore confirm
    window.confirm = originalConfirm;
  });

  it("should handle copy link", async () => {
    const mockShares = [
      {
        id: "share-1",
        token: "token-1",
        projectId: "project-1",
        filePath: "test.ts",
        url: "https://uspark.dev/share/token-1",
        createdAt: "2024-01-01T10:00:00Z",
        accessedCount: 0,
        lastAccessedAt: null,
      },
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ shares: mockShares }),
    });

    // Mock clipboard API
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn(),
      },
    });

    render(<SharesPage />);

    await waitFor(() => {
      expect(screen.getByText("📄 test.ts")).toBeInTheDocument();
    });

    // Click copy button
    const copyButton = screen.getByText("Copy Link");
    fireEvent.click(copyButton);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      "https://uspark.dev/share/token-1"
    );
  });

  it("should display correct heading and back link", () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ shares: [] }),
    });

    render(<SharesPage />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Shared Links"
    );
    expect(screen.getByText("← Back to Settings")).toBeInTheDocument();
    expect(screen.getByText(/Manage your shared file links/)).toBeInTheDocument();
  });

  it("should handle API error gracefully", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    render(<SharesPage />);

    await waitFor(() => {
      // Should still hide loading after error
      expect(screen.queryByText("Loading shares...")).not.toBeInTheDocument();
    });

    expect(consoleSpy).toHaveBeenCalledWith(
      "Error fetching shares:",
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });
});