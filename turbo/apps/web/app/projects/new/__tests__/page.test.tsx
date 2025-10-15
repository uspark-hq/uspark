import { render, screen, waitFor, fireEvent } from "@testing-library/react";
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
    render(<NewProjectPage />);

    // Should auto-skip to repository step (GitHub already connected)
    await waitFor(() => {
      expect(screen.getByRole("combobox")).toBeInTheDocument();
    });

    // Select a repository
    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "test-user/test-repo" } });

    // Click continue
    const continueButton = screen.getByRole("button", { name: /Continue/i });
    fireEvent.click(continueButton);

    // Should go directly to ready step (no token step needed)
    await waitFor(() => {
      expect(screen.getByText("You're All Set!")).toBeInTheDocument();
    });
  });

  it("should display error when project creation fails", async () => {
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

    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "test-user/test-repo" } });
    fireEvent.click(screen.getByRole("button", { name: /Continue/i }));

    await waitFor(() => {
      expect(screen.getByText("You're All Set!")).toBeInTheDocument();
    });

    // Click Start Scanning
    fireEvent.click(screen.getByRole("button", { name: /Start Scanning/i }));

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

  it("should auto-redirect when scan completes successfully", async () => {
    // Mock window.location.href
    delete (window as { location?: unknown }).location;
    window.location = { href: "https://www.example.com" } as Location;

    let pollCount = 0;

    // Mock project creation and scanning
    server.use(
      http.post("*/api/projects", () => {
        return HttpResponse.json({
          id: "project-123",
          name: "test-repo",
          created_at: new Date().toISOString(),
        });
      }),
      // Initial fetch after project creation and polling
      http.get("*/api/projects", () => {
        pollCount++;
        if (pollCount === 1) {
          // First fetch: get created project with scanning status
          return HttpResponse.json({
            projects: [
              {
                id: "project-123",
                name: "test-repo",
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                initial_scan_status: "running",
                initial_scan_progress: {
                  todos: [
                    {
                      content: "Clone repository",
                      status: "in_progress",
                      activeForm: "Cloning repository",
                    },
                  ],
                },
              },
            ],
          });
        } else {
          // Subsequent polls: scan completed
          return HttpResponse.json({
            projects: [
              {
                id: "project-123",
                name: "test-repo",
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                initial_scan_status: "completed",
                initial_scan_progress: null,
              },
            ],
          });
        }
      }),
    );

    render(<NewProjectPage />);

    // Navigate through the flow
    await waitFor(() => {
      expect(screen.getByRole("combobox")).toBeInTheDocument();
    });

    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "test-user/test-repo" } });
    fireEvent.click(screen.getByRole("button", { name: /Continue/i }));

    await waitFor(() => {
      expect(screen.getByText("You're All Set!")).toBeInTheDocument();
    });

    // Start scanning
    fireEvent.click(screen.getByRole("button", { name: /Start Scanning/i }));

    // Wait for scanning UI
    await waitFor(() => {
      expect(screen.getByText("Cloning repository")).toBeInTheDocument();
    });

    // Should auto-redirect when scan completes
    await waitFor(
      () => {
        expect(window.location.href).toBe(
          "https://app.example.com/projects/project-123",
        );
      },
      { timeout: 5000 },
    );
  });

  it("should auto-redirect when scan fails", async () => {
    // Mock window.location.href
    delete (window as { location?: unknown }).location;
    window.location = { href: "https://www.example.com" } as Location;

    let pollCount = 0;

    // Mock project creation and scanning
    server.use(
      http.post("*/api/projects", () => {
        return HttpResponse.json({
          id: "project-456",
          name: "test-repo",
          created_at: new Date().toISOString(),
        });
      }),
      // Initial fetch after project creation and polling
      http.get("*/api/projects", () => {
        pollCount++;
        if (pollCount === 1) {
          // First fetch: get created project with scanning status
          return HttpResponse.json({
            projects: [
              {
                id: "project-456",
                name: "test-repo",
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                initial_scan_status: "running",
                initial_scan_progress: {
                  todos: [
                    {
                      content: "Analyze code",
                      status: "in_progress",
                      activeForm: "Analyzing code",
                    },
                  ],
                },
              },
            ],
          });
        } else {
          // Subsequent polls: scan failed
          return HttpResponse.json({
            projects: [
              {
                id: "project-456",
                name: "test-repo",
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                initial_scan_status: "failed",
                initial_scan_progress: null,
              },
            ],
          });
        }
      }),
    );

    render(<NewProjectPage />);

    // Navigate through the flow
    await waitFor(() => {
      expect(screen.getByRole("combobox")).toBeInTheDocument();
    });

    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "test-user/test-repo" } });
    fireEvent.click(screen.getByRole("button", { name: /Continue/i }));

    await waitFor(() => {
      expect(screen.getByText("You're All Set!")).toBeInTheDocument();
    });

    // Start scanning
    fireEvent.click(screen.getByRole("button", { name: /Start Scanning/i }));

    // Wait for scanning UI
    await waitFor(() => {
      expect(screen.getByText("Analyzing code")).toBeInTheDocument();
    });

    // Should auto-redirect even when scan fails
    await waitFor(
      () => {
        expect(window.location.href).toBe(
          "https://app.example.com/projects/project-456",
        );
      },
      { timeout: 5000 },
    );
  });
});
