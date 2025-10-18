/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GitHubRepoSelector } from "../github-repo-selector";

describe("GitHubRepoSelector", () => {
  const mockRepositories = [
    {
      id: 1,
      name: "repo-1",
      fullName: "owner1/repo-1",
      installationId: 123,
      private: false,
      url: "https://github.com/owner1/repo-1",
    },
    {
      id: 2,
      name: "repo-2",
      fullName: "owner1/repo-2",
      installationId: 123,
      private: true,
      url: "https://github.com/owner1/repo-2",
    },
    {
      id: 3,
      name: "repo-3",
      fullName: "owner2/repo-3",
      installationId: 456,
      private: false,
      url: "https://github.com/owner2/repo-3",
    },
  ];

  beforeEach(() => {
    // Reset fetch mock before each test
    global.fetch = vi.fn();
  });

  it("displays loading state initially", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ repositories: [] }),
    } as Response);

    render(<GitHubRepoSelector onSelect={vi.fn()} />);

    // Should show skeleton during loading
    const skeletons = document.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("displays repositories in searchable list", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ repositories: mockRepositories }),
    } as Response);

    render(<GitHubRepoSelector onSelect={vi.fn()} />);

    await waitFor(() => {
      expect(
        screen.getByPlaceholderText("Search repositories..."),
      ).toBeInTheDocument();
    });

    // All repositories should be visible
    expect(screen.getByText("repo-1")).toBeInTheDocument();
    expect(screen.getByText("repo-2")).toBeInTheDocument();
    expect(screen.getByText("repo-3")).toBeInTheDocument();
  });

  it("groups repositories by owner", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ repositories: mockRepositories }),
    } as Response);

    render(<GitHubRepoSelector onSelect={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("owner1")).toBeInTheDocument();
      expect(screen.getByText("owner2")).toBeInTheDocument();
    });
  });

  it("calls onSelect when repository is selected", async () => {
    const onSelectMock = vi.fn();
    const user = userEvent.setup();

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ repositories: mockRepositories }),
    } as Response);

    render(<GitHubRepoSelector onSelect={onSelectMock} />);

    await waitFor(() => {
      expect(screen.getByText("repo-1")).toBeInTheDocument();
    });

    // Click on a repository
    await user.click(screen.getByText("repo-1"));

    expect(onSelectMock).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "repo-1",
        fullName: "owner1/repo-1",
      }),
      123,
    );
  });

  it("displays selected repository details", async () => {
    const user = userEvent.setup();

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ repositories: mockRepositories }),
    } as Response);

    render(<GitHubRepoSelector onSelect={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("repo-1")).toBeInTheDocument();
    });

    // Select a repository
    await user.click(screen.getByText("repo-1"));

    // Should show selected repository details
    await waitFor(() => {
      expect(screen.getByText("owner1/repo-1")).toBeInTheDocument();
      expect(screen.getByText("Public")).toBeInTheDocument();
    });
  });

  it("shows private badge for private repositories", async () => {
    const user = userEvent.setup();

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ repositories: mockRepositories }),
    } as Response);

    render(<GitHubRepoSelector onSelect={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("repo-2")).toBeInTheDocument();
    });

    // Select private repository
    await user.click(screen.getByText("repo-2"));

    await waitFor(() => {
      expect(screen.getByText("Private")).toBeInTheDocument();
    });
  });

  it("displays error message on fetch failure", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("Network error"),
    );

    render(<GitHubRepoSelector onSelect={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Network error")).toBeInTheDocument();
    });
  });

  it("displays 401 error message when unauthorized", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 401,
    } as Response);

    render(<GitHubRepoSelector onSelect={vi.fn()} />);

    await waitFor(() => {
      expect(
        screen.getByText("Please sign in to access GitHub repositories"),
      ).toBeInTheDocument();
    });
  });

  it("displays empty state when no repositories found", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ repositories: [] }),
    } as Response);

    render(<GitHubRepoSelector onSelect={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/No repositories found/i)).toBeInTheDocument();
    });
  });
});
