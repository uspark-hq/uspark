import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { GitHubConnection } from "./github-connection";
import { useRouter } from "next/navigation";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
}));

const mockUseRouter = vi.mocked(useRouter);

// Mock fetch
global.fetch = vi.fn();
const mockFetch = vi.mocked(global.fetch);

describe("GitHubConnection", () => {
  const mockRouter: Partial<AppRouterInstance> = {
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseRouter.mockReturnValue(mockRouter as AppRouterInstance);

    // Mock window.location
    delete (window as unknown as { location?: Location }).location;
    (window as unknown as { location: { href: string } }).location = {
      href: "",
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders loading state initially", () => {
    mockFetch.mockImplementation(() => new Promise(() => {}));

    render(<GitHubConnection />);

    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("renders not connected state when no installation found", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ installation: null }),
    } as Response);

    render(<GitHubConnection />);

    await waitFor(() => {
      expect(screen.getByText("Connect GitHub Account")).toBeInTheDocument();
    });

    expect(
      screen.getByText(/Install the uSpark GitHub App/),
    ).toBeInTheDocument();
  });

  it("renders connected state with installation details", async () => {
    const mockInstallation = {
      installationId: 12345,
      accountName: "test-user",
      accountType: "user",
      createdAt: "2024-01-01T00:00:00Z",
      repositorySelection: "selected",
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ installation: mockInstallation }),
    } as Response);

    render(<GitHubConnection />);

    await waitFor(() => {
      expect(screen.getByText("Connected to GitHub")).toBeInTheDocument();
    });

    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText(/test-user/)).toBeInTheDocument();
    expect(screen.getByText("Manage on GitHub")).toBeInTheDocument();
    expect(screen.getByText("Disconnect")).toBeInTheDocument();
  });

  it("handles connect button click", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ installation: null }),
    } as Response);

    render(<GitHubConnection />);

    await waitFor(() => {
      expect(screen.getByText("Connect GitHub")).toBeInTheDocument();
    });

    const connectButton = screen.getByText("Connect GitHub");
    fireEvent.click(connectButton);

    expect(window.location.href).toBe("/api/github/install");
  });

  it("handles disconnect button click", async () => {
    const mockInstallation = {
      installationId: 12345,
      accountName: "test-user",
      accountType: "user",
      createdAt: "2024-01-01T00:00:00Z",
      repositorySelection: "selected",
    };

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ installation: mockInstallation }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response);

    // Mock window.confirm
    window.confirm = vi.fn(() => true);

    render(<GitHubConnection />);

    await waitFor(() => {
      expect(screen.getByText("Disconnect")).toBeInTheDocument();
    });

    const disconnectButton = screen.getByText("Disconnect");
    fireEvent.click(disconnectButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/github/disconnect", {
        method: "POST",
      });
    });

    expect(mockRouter.refresh).toHaveBeenCalled();
  });

  it("handles manage on GitHub button click", async () => {
    const mockInstallation = {
      installationId: 12345,
      accountName: "test-user",
      accountType: "user",
      createdAt: "2024-01-01T00:00:00Z",
      repositorySelection: "selected",
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ installation: mockInstallation }),
    } as Response);

    // Mock window.open
    window.open = vi.fn();

    render(<GitHubConnection />);

    await waitFor(() => {
      expect(screen.getByText("Manage on GitHub")).toBeInTheDocument();
    });

    const manageButton = screen.getByText("Manage on GitHub");
    fireEvent.click(manageButton);

    expect(window.open).toHaveBeenCalledWith(
      "https://github.com/apps/uspark-sync",
      "_blank",
    );
  });

  it("renders error state when fetch fails", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    render(<GitHubConnection />);

    await waitFor(() => {
      expect(screen.getByText("Network error")).toBeInTheDocument();
    });
  });

  it("doesn't disconnect when user cancels confirmation", async () => {
    const mockInstallation = {
      installationId: 12345,
      accountName: "test-user",
      accountType: "user",
      createdAt: "2024-01-01T00:00:00Z",
      repositorySelection: "selected",
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ installation: mockInstallation }),
    } as Response);

    // Mock window.confirm to return false
    window.confirm = vi.fn(() => false);

    render(<GitHubConnection />);

    await waitFor(() => {
      expect(screen.getByText("Disconnect")).toBeInTheDocument();
    });

    const disconnectButton = screen.getByText("Disconnect");
    fireEvent.click(disconnectButton);

    // Should not call disconnect API
    expect(global.fetch).toHaveBeenCalledTimes(1); // Only the initial status fetch
  });
});
