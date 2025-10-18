import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, afterEach, describe, it, expect } from "vitest";
import { server, http, HttpResponse } from "../../../../src/test/msw-setup";
import NewProjectPage from "../page";

describe("NewProjectPage", () => {
  beforeEach(() => {
    // Set up default handlers for this test suite
    server.use(
      // GitHub installation status endpoint
      http.get("*/api/github/installation-status", () => {
        return HttpResponse.json({
          installation: {
            id: 12345,
            account: {
              login: "test-user",
              avatar_url: "https://example.com/avatar.png",
            },
          },
        });
      }),

      // GitHub repositories endpoint
      http.get("*/api/github/repositories", () => {
        return HttpResponse.json({
          repositories: [
            {
              id: 1,
              name: "test-repo",
              fullName: "test-user/test-repo",
              installationId: 12345,
              private: false,
              url: "https://github.com/test-user/test-repo",
            },
          ],
        });
      }),

      // Projects endpoint - POST (create)
      http.post("*/api/projects", () => {
        return HttpResponse.json({
          id: "project-123",
          name: "test-repo",
          created_at: new Date().toISOString(),
        });
      }),
    );
  });

  afterEach(() => server.resetHandlers());

  it("should auto-advance to repository step when GitHub is already connected", async () => {
    render(<NewProjectPage />);

    // Should show loading initially
    expect(screen.getByText("Loading...")).toBeInTheDocument();

    // Should auto-skip choice step and go directly to repository step
    await waitFor(() => {
      expect(screen.getByText("Select a Repository")).toBeInTheDocument();
    });

    // Step 2 indicator should be active
    expect(screen.getByText("Repository")).toBeInTheDocument();
  });

  it("should show GitHub connection step when not connected", async () => {
    server.use(
      http.get("*/api/github/installation-status", () => {
        return HttpResponse.json({ installation: null });
      }),
    );

    render(<NewProjectPage />);

    // Should show choice step first
    await waitFor(() => {
      expect(screen.getByText("Create a New Project")).toBeInTheDocument();
    });

    // Click GitHub option
    const githubButton = screen.getByRole("button", {
      name: /Connect GitHub Repository/i,
    });
    fireEvent.click(githubButton);

    // Should show GitHub connection step
    await waitFor(() => {
      expect(
        screen.getByText("Connect Your GitHub Account"),
      ).toBeInTheDocument();
    });

    expect(
      screen.getByRole("button", { name: /Connect GitHub/i }),
    ).toBeInTheDocument();
  });

  it("should navigate to repository selection and continue to ready step", async () => {
    const user = userEvent.setup();

    render(<NewProjectPage />);

    // Should auto-skip to repository step (GitHub already connected)
    await waitFor(() => {
      expect(screen.getByRole("combobox")).toBeInTheDocument();
    });

    // Open combobox and select a repository
    await user.click(screen.getByRole("combobox"));

    // Wait for repository option to appear
    await waitFor(() => {
      expect(
        screen.getByRole("option", { name: /test-repo/i }),
      ).toBeInTheDocument();
    });

    await user.click(screen.getByRole("option", { name: /test-repo/i }));

    // Verify repository is selected (shown in combobox button)
    await waitFor(() => {
      expect(screen.getByRole("combobox")).toHaveTextContent(
        "test-user/test-repo",
      );
    });

    // Click continue
    await user.click(screen.getByRole("button", { name: /Continue/i }));

    // Should go directly to ready step (no token step needed)
    await waitFor(() => {
      expect(screen.getByText(/You'?re All Set!/i)).toBeInTheDocument();
    });
  });

  it("should display error when project creation fails", async () => {
    const user = userEvent.setup();

    server.use(
      http.post("*/api/projects", () => {
        return HttpResponse.json(
          {
            error: "duplicate_project_name",
            error_description: "A project with this name already exists",
          },
          { status: 409 },
        );
      }),
    );

    render(<NewProjectPage />);

    // Should auto-skip to repository step (GitHub already connected)
    await waitFor(() => {
      expect(screen.getByRole("combobox")).toBeInTheDocument();
    });

    // Open combobox and select a repository
    await user.click(screen.getByRole("combobox"));

    await waitFor(() => {
      expect(
        screen.getByRole("option", { name: /test-repo/i }),
      ).toBeInTheDocument();
    });

    await user.click(screen.getByRole("option", { name: /test-repo/i }));

    // Click continue
    await user.click(screen.getByRole("button", { name: /Continue/i }));

    await waitFor(() => {
      expect(screen.getByText(/You'?re All Set!/i)).toBeInTheDocument();
    });

    // Click Start Scanning
    await user.click(screen.getByRole("button", { name: /Start Scanning/i }));

    // Should display error
    await waitFor(() => {
      expect(
        screen.getByText("A project with this name already exists"),
      ).toBeInTheDocument();
    });
  });

  it("should disable continue button when no repository selected", async () => {
    render(<NewProjectPage />);

    // Should auto-skip to repository step (GitHub already connected)
    await waitFor(() => {
      expect(screen.getByText("Select a Repository")).toBeInTheDocument();
    });

    const continueButton = screen.getByRole("button", { name: /Continue/i });
    expect(continueButton).toBeDisabled();
  });

  it("should allow manual project creation without GitHub", async () => {
    // Mock no GitHub connection to see choice step
    server.use(
      http.get("*/api/github/installation-status", () => {
        return HttpResponse.json({ installation: null });
      }),
    );

    render(<NewProjectPage />);

    // Should show choice step (no GitHub connected)
    await waitFor(() => {
      expect(screen.getByText("Create a New Project")).toBeInTheDocument();
    });

    // Click Manual option
    const manualButton = screen.getByRole("button", {
      name: /Create Project Manually/i,
    });
    fireEvent.click(manualButton);

    // Should show manual project name input
    await waitFor(() => {
      expect(screen.getByText("Name Your Project")).toBeInTheDocument();
    });

    // Enter project name
    const projectNameInput = screen.getByPlaceholderText("My Awesome Project");
    fireEvent.change(projectNameInput, {
      target: { value: "Test Manual Project" },
    });

    // Click Continue
    const continueButton = screen.getByRole("button", { name: /Continue/i });
    fireEvent.click(continueButton);

    // Should reach ready step
    await waitFor(() => {
      expect(screen.getByText("You're All Set!")).toBeInTheDocument();
    });

    // Should show manual project name in the summary
    expect(screen.getByText("Test Manual Project")).toBeInTheDocument();

    // Should have Create Project button (not Start Scanning)
    expect(
      screen.getByRole("button", { name: /Create Project/i }),
    ).toBeInTheDocument();
  });

  it("should disable continue button when project name is empty in manual mode", async () => {
    // Mock no GitHub connection to see choice step
    server.use(
      http.get("*/api/github/installation-status", () => {
        return HttpResponse.json({ installation: null });
      }),
    );

    render(<NewProjectPage />);

    // Wait for choice step (no GitHub connected)
    await waitFor(() => {
      expect(screen.getByText("Create a New Project")).toBeInTheDocument();
    });

    const manualButton = screen.getByRole("button", {
      name: /Create Project Manually/i,
    });
    fireEvent.click(manualButton);

    // Should show manual project name input
    await waitFor(() => {
      expect(screen.getByText("Name Your Project")).toBeInTheDocument();
    });

    // Continue button should be disabled with empty name
    const continueButton = screen.getByRole("button", { name: /Continue/i });
    expect(continueButton).toBeDisabled();
  });

  it("should redirect to init page after GitHub project creation", async () => {
    const user = userEvent.setup();

    // Mock window.location.href
    Object.defineProperty(window, "location", {
      value: { href: "https://www.example.com" },
      writable: true,
    });

    // Mock project creation
    server.use(
      http.post("*/api/projects", () => {
        return HttpResponse.json({
          id: "project-123",
          name: "test-repo",
          created_at: new Date().toISOString(),
        });
      }),
    );

    render(<NewProjectPage />);

    // Navigate through the flow
    await waitFor(() => {
      expect(screen.getByRole("combobox")).toBeInTheDocument();
    });

    // Open combobox and select a repository
    await user.click(screen.getByRole("combobox"));

    await waitFor(() => {
      expect(
        screen.getByRole("option", { name: /test-repo/i }),
      ).toBeInTheDocument();
    });

    await user.click(screen.getByRole("option", { name: /test-repo/i }));

    // Click continue
    await user.click(screen.getByRole("button", { name: /Continue/i }));

    await waitFor(() => {
      expect(screen.getByText(/You'?re All Set!/i)).toBeInTheDocument();
    });

    // Start scanning - should redirect to init page
    await user.click(screen.getByRole("button", { name: /Start Scanning/i }));

    // Should redirect to init page
    await waitFor(() => {
      expect(window.location.href).toBe("/projects/project-123/init");
    });
  });
});
