import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { GitHubConnection } from "./github-connection";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

// Use vi.hoisted for better control over mocks
const { mockRouter, mockPush, mockRefresh } = vi.hoisted(() => {
  const mockPush = vi.fn();
  const mockRefresh = vi.fn();
  const mockRouter = {
    push: mockPush,
    refresh: mockRefresh,
    back: vi.fn(),
    forward: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  };
  return { mockRouter, mockPush, mockRefresh };
});

// Mock next/navigation following Next.js testing best practices
vi.mock("next/navigation", async () => {
  const actual = await vi.importActual<typeof import("next/navigation")>("next/navigation");
  return {
    ...actual,
    useRouter: vi.fn(() => mockRouter),
    usePathname: vi.fn(() => "/settings/github"),
    useSearchParams: vi.fn(() => new URLSearchParams()),
  };
});

// Mock fetch
global.fetch = vi.fn();
const mockFetch = vi.mocked(global.fetch);

describe("GitHubConnection", () => {
  const originalLocation = window.location;

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset window.location before each test
    Object.defineProperty(window, "location", {
      value: { href: "" },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    // Restore original location after each test
    Object.defineProperty(window, "location", {
      value: originalLocation,
      writable: true,
      configurable: true,
    });
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

    expect(mockRefresh).toHaveBeenCalled();
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
      "https://github.com/settings/installations/12345",
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
