/**
 * @vitest-environment jsdom
 */
import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  beforeAll,
  afterAll,
  afterEach,
} from "vitest";
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GitHubRepoSelector } from "../github-repo-selector";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

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

// Setup MSW server
const server = setupServer(
  http.get("*/api/github/repositories", () => {
    return HttpResponse.json({ repositories: mockRepositories });
  }),
);

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

afterEach(() => {
  vi.clearAllMocks();
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

describe("GitHubRepoSelector", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should allow user to select a repository from the list", async () => {
    const onSelectMock = vi.fn();
    const user = userEvent.setup();

    render(<GitHubRepoSelector onSelect={onSelectMock} />);

    // Wait for component to load
    await waitFor(() => {
      expect(screen.getByRole("combobox")).toBeInTheDocument();
    });

    // Open the repository selector
    await user.click(screen.getByRole("combobox"));

    // Wait for repositories to load
    await waitFor(() => {
      expect(
        screen.getByRole("option", { name: /repo-1/i }),
      ).toBeInTheDocument();
    });

    // Select a repository
    await user.click(screen.getByRole("option", { name: /repo-1/i }));

    // Verify onSelect was called with correct data
    expect(onSelectMock).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "repo-1",
        fullName: "owner1/repo-1",
        installationId: 123,
      }),
      123,
    );
  });

  it("should display selected repository information after selection", async () => {
    const user = userEvent.setup();

    render(<GitHubRepoSelector onSelect={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByRole("combobox")).toBeInTheDocument();
    });

    // Open and select a repository
    await user.click(screen.getByRole("combobox"));

    await waitFor(() => {
      expect(
        screen.getByRole("option", { name: /repo-1/i }),
      ).toBeInTheDocument();
    });

    await user.click(screen.getByRole("option", { name: /repo-1/i }));

    // Verify selected repository is shown in the trigger button
    await waitFor(() => {
      const button = screen.getByRole("combobox");
      expect(button).toHaveTextContent("owner1/repo-1");
    });
  });

  it("should show privacy badge for selected repository", async () => {
    const user = userEvent.setup();

    render(<GitHubRepoSelector onSelect={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByRole("combobox")).toBeInTheDocument();
    });

    // Select a private repository
    await user.click(screen.getByRole("combobox"));

    await waitFor(() => {
      expect(
        screen.getByRole("option", { name: /repo-2/i }),
      ).toBeInTheDocument();
    });

    await user.click(screen.getByRole("option", { name: /repo-2/i }));

    // Verify private badge is displayed
    await waitFor(() => {
      expect(screen.getByText("Private")).toBeInTheDocument();
    });
  });

  it("should group repositories by owner", async () => {
    const user = userEvent.setup();

    render(<GitHubRepoSelector onSelect={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByRole("combobox")).toBeInTheDocument();
    });

    // Open the selector
    await user.click(screen.getByRole("combobox"));

    // Verify owner groups are present
    await waitFor(() => {
      expect(screen.getByText("owner1")).toBeInTheDocument();
      expect(screen.getByText("owner2")).toBeInTheDocument();
    });
  });

  it("should close popover after selecting a repository", async () => {
    const user = userEvent.setup();

    render(<GitHubRepoSelector onSelect={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByRole("combobox")).toBeInTheDocument();
    });

    // Open the selector
    await user.click(screen.getByRole("combobox"));

    // Verify search input is visible (popover is open)
    await waitFor(() => {
      expect(
        screen.getByPlaceholderText("Search repositories..."),
      ).toBeInTheDocument();
    });

    // Select a repository
    await user.click(screen.getByRole("option", { name: /repo-1/i }));

    // Verify search input is no longer visible (popover closed)
    await waitFor(() => {
      expect(
        screen.queryByPlaceholderText("Search repositories..."),
      ).not.toBeInTheDocument();
    });
  });
});
