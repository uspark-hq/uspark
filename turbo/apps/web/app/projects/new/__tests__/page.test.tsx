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

      // Claude token endpoint - GET (check)
      http.get("*/api/claude-token", () => {
        return HttpResponse.json({
          token: "sk-ant-test-token",
        });
      }),

      // Claude token endpoint - POST (save)
      http.post("*/api/claude-token", () => {
        return HttpResponse.json({ success: true });
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

    // Should auto-advance to repository step
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

    // Wait for repository step and select to load
    await waitFor(() => {
      expect(screen.getByRole("combobox")).toBeInTheDocument();
    });

    // Select a repository
    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "test-user/test-repo" } });

    // Click continue
    const continueButton = screen.getByRole("button", { name: /Continue/i });
    fireEvent.click(continueButton);

    // Should skip token step (token already exists) and go to ready
    await waitFor(() => {
      expect(screen.getByText("You're All Set!")).toBeInTheDocument();
    });
  });

  it("should show token step when token does not exist", async () => {
    server.use(
      http.get("*/api/claude-token", () => {
        return HttpResponse.json({ token: null });
      }),
    );

    render(<NewProjectPage />);

    // Wait for repository step and select to load
    await waitFor(() => {
      expect(screen.getByRole("combobox")).toBeInTheDocument();
    });

    // Select repository and continue
    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "test-user/test-repo" } });

    const continueButton = screen.getByRole("button", { name: /Continue/i });
    fireEvent.click(continueButton);

    // Should show token step
    await waitFor(() => {
      expect(screen.getByText("Add Your Claude API Key")).toBeInTheDocument();
    });

    expect(screen.getByLabelText("API Key")).toBeInTheDocument();
  });

  it("should handle token submission and proceed to ready step", async () => {
    server.use(
      http.get("*/api/claude-token", () => {
        return HttpResponse.json({ token: null });
      }),
    );

    render(<NewProjectPage />);

    // Wait for repository step and select to load
    await waitFor(() => {
      expect(screen.getByRole("combobox")).toBeInTheDocument();
    });

    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "test-user/test-repo" } });

    fireEvent.click(screen.getByRole("button", { name: /Continue/i }));

    await waitFor(() => {
      expect(screen.getByText("Add Your Claude API Key")).toBeInTheDocument();
    });

    // Enter token
    const tokenInput = screen.getByLabelText("API Key");
    fireEvent.change(tokenInput, { target: { value: "sk-ant-new-token" } });

    // Submit
    fireEvent.click(screen.getByRole("button", { name: /Save and Continue/i }));

    // Should proceed to ready step
    await waitFor(() => {
      expect(screen.getByText("You're All Set!")).toBeInTheDocument();
    });
  });

  it("should display error when token save fails", async () => {
    server.use(
      http.get("*/api/claude-token", () => {
        return HttpResponse.json({ token: null });
      }),
      http.post("*/api/claude-token", () => {
        return HttpResponse.json(
          {
            error: "invalid_token",
            error_description: "Invalid API key format",
          },
          { status: 400 },
        );
      }),
    );

    render(<NewProjectPage />);

    // Wait for repository step and select to load
    await waitFor(() => {
      expect(screen.getByRole("combobox")).toBeInTheDocument();
    });

    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "test-user/test-repo" } });
    fireEvent.click(screen.getByRole("button", { name: /Continue/i }));

    await waitFor(() => {
      expect(screen.getByLabelText("API Key")).toBeInTheDocument();
    });

    // Submit invalid token
    const tokenInput = screen.getByLabelText("API Key");
    fireEvent.change(tokenInput, { target: { value: "invalid-token" } });
    fireEvent.click(screen.getByRole("button", { name: /Save and Continue/i }));

    // Should display error
    await waitFor(() => {
      expect(screen.getByText("Invalid API key format")).toBeInTheDocument();
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

    // Wait for repository step and select to load
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

    await waitFor(() => {
      expect(screen.getByText("Select a Repository")).toBeInTheDocument();
    });

    const continueButton = screen.getByRole("button", { name: /Continue/i });
    expect(continueButton).toBeDisabled();
  });

  it("should disable save button when token input is empty", async () => {
    server.use(
      http.get("*/api/claude-token", () => {
        return HttpResponse.json({ token: null });
      }),
    );

    render(<NewProjectPage />);

    // Wait for repository step and select to load
    await waitFor(() => {
      expect(screen.getByRole("combobox")).toBeInTheDocument();
    });

    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "test-user/test-repo" } });
    fireEvent.click(screen.getByRole("button", { name: /Continue/i }));

    await waitFor(() => {
      expect(screen.getByLabelText("API Key")).toBeInTheDocument();
    });

    const saveButton = screen.getByRole("button", {
      name: /Save and Continue/i,
    });
    expect(saveButton).toBeDisabled();
  });
});
