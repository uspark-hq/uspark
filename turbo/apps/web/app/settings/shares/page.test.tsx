import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { useRouter } from "next/navigation";
import SharesManagementPage from "./page";

// Mock Next.js router
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
}));

describe("Shares Management Page", () => {
  const mockPush = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as ReturnType<typeof vi.fn>).mockReturnValue({
      push: mockPush,
    });

    // Mock clipboard API
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });

    // Mock fetch
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders page header correctly", () => {
    render(<SharesManagementPage />);

    expect(
      screen.getByRole("heading", { name: "Shared Links" })
    ).toBeInTheDocument();
    expect(
      screen.getByText("Manage your shared file links")
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "← Back to Projects" })
    ).toBeInTheDocument();
  });

  it("shows loading state initially", () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementationOnce(
      () => new Promise(() => {}) // Never resolves
    );

    render(<SharesManagementPage />);

    expect(screen.getByText("Loading shares...")).toBeInTheDocument();
  });

  it("shows empty state when no shares exist", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ shares: [] }),
    });

    render(<SharesManagementPage />);

    await waitFor(() => {
      expect(screen.getByText("No shared links yet")).toBeInTheDocument();
    });

    expect(
      screen.getByText("Share files from your projects to create links here")
    ).toBeInTheDocument();
  });

  it("displays list of shares", async () => {
    const mockShares = [
      {
        id: "share-1",
        url: "http://localhost:3000/share/token-1",
        token: "token-1",
        project_id: "proj-123",
        file_path: "src/index.ts",
        created_at: "2024-01-01T00:00:00Z",
        accessed_count: 5,
        last_accessed_at: "2024-01-02T00:00:00Z",
      },
      {
        id: "share-2",
        url: "http://localhost:3000/share/token-2",
        token: "token-2",
        project_id: "proj-456",
        file_path: "README.md",
        created_at: "2024-01-03T00:00:00Z",
        accessed_count: 0,
        last_accessed_at: null,
      },
    ];

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ shares: mockShares }),
    });

    render(<SharesManagementPage />);

    await waitFor(() => {
      expect(screen.getByText("src/index.ts")).toBeInTheDocument();
      expect(screen.getByText("README.md")).toBeInTheDocument();
    });

    // Check project IDs are displayed
    expect(screen.getByText("Project: proj-123")).toBeInTheDocument();
    expect(screen.getByText("Project: proj-456")).toBeInTheDocument();

    // Check access counts
    expect(screen.getByText("Views: 5")).toBeInTheDocument();
    expect(screen.getByText("Views: 0")).toBeInTheDocument();

    // Check URLs are displayed in input fields
    const urlInputs = screen.getAllByDisplayValue(/http:\/\/localhost:3000\/share\//);
    expect(urlInputs).toHaveLength(2);
  });

  it("copies share URL to clipboard", async () => {
    const mockShares = [
      {
        id: "share-1",
        url: "http://localhost:3000/share/token-1",
        token: "token-1",
        project_id: "proj-123",
        file_path: "src/index.ts",
        created_at: "2024-01-01T00:00:00Z",
        accessed_count: 0,
        last_accessed_at: null,
      },
    ];

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ shares: mockShares }),
    });

    render(<SharesManagementPage />);

    await waitFor(() => {
      expect(screen.getByText("src/index.ts")).toBeInTheDocument();
    });

    // Click copy button
    const copyButton = screen.getByRole("button", { name: "Copy Link" });
    fireEvent.click(copyButton);

    // Check clipboard was called
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      "http://localhost:3000/share/token-1"
    );

    // Check button shows success state
    await waitFor(() => {
      expect(screen.getByText("✓ Copied")).toBeInTheDocument();
    });

    // Success state should revert after 2 seconds
    await waitFor(
      () => {
        expect(screen.getByRole("button", { name: "Copy Link" })).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });

  it("deletes share when revoke button is clicked", async () => {
    const mockShares = [
      {
        id: "share-1",
        url: "http://localhost:3000/share/token-1",
        token: "token-1",
        project_id: "proj-123",
        file_path: "src/index.ts",
        created_at: "2024-01-01T00:00:00Z",
        accessed_count: 0,
        last_accessed_at: null,
      },
      {
        id: "share-2",
        url: "http://localhost:3000/share/token-2",
        token: "token-2",
        project_id: "proj-456",
        file_path: "README.md",
        created_at: "2024-01-03T00:00:00Z",
        accessed_count: 0,
        last_accessed_at: null,
      },
    ];

    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ shares: mockShares }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

    render(<SharesManagementPage />);

    await waitFor(() => {
      expect(screen.getByText("src/index.ts")).toBeInTheDocument();
      expect(screen.getByText("README.md")).toBeInTheDocument();
    });

    // Click revoke on first share
    const revokeButtons = screen.getAllByRole("button", { name: "Revoke" });
    fireEvent.click(revokeButtons[0]);

    // Should show deleting state
    expect(screen.getByText("Deleting...")).toBeInTheDocument();

    // Wait for deletion to complete
    await waitFor(() => {
      expect(screen.queryByText("src/index.ts")).not.toBeInTheDocument();
    });

    // Second share should still be visible
    expect(screen.getByText("README.md")).toBeInTheDocument();

    // Verify DELETE API was called
    expect(global.fetch).toHaveBeenCalledWith("/api/shares/share-1", {
      method: "DELETE",
    });
  });

  it("handles API errors when loading shares", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    render(<SharesManagementPage />);

    await waitFor(() => {
      expect(screen.queryByText("Loading shares...")).not.toBeInTheDocument();
    });

    // Should show empty state on error
    expect(screen.getByText("No shared links yet")).toBeInTheDocument();

    // Verify error was logged
    expect(consoleErrorSpy).toHaveBeenCalledWith("Failed to load shares");

    consoleErrorSpy.mockRestore();
  });

  it("handles API errors when deleting share", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const mockShares = [
      {
        id: "share-1",
        url: "http://localhost:3000/share/token-1",
        token: "token-1",
        project_id: "proj-123",
        file_path: "src/index.ts",
        created_at: "2024-01-01T00:00:00Z",
        accessed_count: 0,
        last_accessed_at: null,
      },
    ];

    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ shares: mockShares }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

    render(<SharesManagementPage />);

    await waitFor(() => {
      expect(screen.getByText("src/index.ts")).toBeInTheDocument();
    });

    // Click revoke button
    const revokeButton = screen.getByRole("button", { name: "Revoke" });
    fireEvent.click(revokeButton);

    // Should show deleting state
    expect(screen.getByText("Deleting...")).toBeInTheDocument();

    // Wait for error handling
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Revoke" })).toBeInTheDocument();
    });

    // Share should still be visible (not deleted)
    expect(screen.getByText("src/index.ts")).toBeInTheDocument();

    // Verify error was logged
    expect(consoleErrorSpy).toHaveBeenCalledWith("Failed to delete share");

    consoleErrorSpy.mockRestore();
  });

  it("handles network errors gracefully", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("Network error")
    );

    render(<SharesManagementPage />);

    await waitFor(() => {
      expect(screen.queryByText("Loading shares...")).not.toBeInTheDocument();
    });

    // Should show empty state on network error
    expect(screen.getByText("No shared links yet")).toBeInTheDocument();

    // Verify error was logged
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Error loading shares:",
      expect.any(Error)
    );

    consoleErrorSpy.mockRestore();
  });

  it("navigates back to projects when back button is clicked", () => {
    render(<SharesManagementPage />);

    const backButton = screen.getByRole("button", { name: "← Back to Projects" });
    fireEvent.click(backButton);

    expect(mockPush).toHaveBeenCalledWith("/projects");
  });

  it("formats dates correctly", async () => {
    const mockShares = [
      {
        id: "share-1",
        url: "http://localhost:3000/share/token-1",
        token: "token-1",
        project_id: "proj-123",
        file_path: "src/index.ts",
        created_at: "2024-01-15T14:30:00Z",
        accessed_count: 10,
        last_accessed_at: "2024-01-20T10:15:00Z",
      },
    ];

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ shares: mockShares }),
    });

    render(<SharesManagementPage />);

    await waitFor(() => {
      expect(screen.getByText("src/index.ts")).toBeInTheDocument();
    });

    // Check formatted dates are displayed
    expect(screen.getByText(/Created:/)).toBeInTheDocument();
    expect(screen.getByText(/Last accessed:/)).toBeInTheDocument();
  });

  it("handles shares with null file paths", async () => {
    const mockShares = [
      {
        id: "share-1",
        url: "http://localhost:3000/share/token-1",
        token: "token-1",
        project_id: "proj-123",
        file_path: null,
        created_at: "2024-01-01T00:00:00Z",
        accessed_count: 0,
        last_accessed_at: null,
      },
    ];

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ shares: mockShares }),
    });

    render(<SharesManagementPage />);

    await waitFor(() => {
      expect(screen.getByText("Entire Project")).toBeInTheDocument();
    });
  });

  it("allows selecting URL text in input field", async () => {
    const mockShares = [
      {
        id: "share-1",
        url: "http://localhost:3000/share/token-1",
        token: "token-1",
        project_id: "proj-123",
        file_path: "src/index.ts",
        created_at: "2024-01-01T00:00:00Z",
        accessed_count: 0,
        last_accessed_at: null,
      },
    ];

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ shares: mockShares }),
    });

    render(<SharesManagementPage />);

    await waitFor(() => {
      expect(screen.getByText("src/index.ts")).toBeInTheDocument();
    });

    // Click on URL input field
    const urlInput = screen.getByDisplayValue("http://localhost:3000/share/token-1") as HTMLInputElement;
    
    // Mock the select method
    urlInput.select = vi.fn();
    
    fireEvent.click(urlInput);

    // Verify select was called
    expect(urlInput.select).toHaveBeenCalled();
  });
});