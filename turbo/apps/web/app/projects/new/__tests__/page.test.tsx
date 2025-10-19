import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, afterEach, describe, it, expect } from "vitest";
import { server, http, HttpResponse } from "../../../../src/test/msw-setup";
import NewProjectPage from "../page";

describe("NewProjectPage", () => {
  beforeEach(() => {
    // Set up default handlers for this test suite
    server.use(
      // Repository verification endpoint
      http.post("*/api/github/verify-repo", async ({ request }) => {
        const body = (await request.json()) as { repoUrl: string };
        const repoUrl = body.repoUrl;

        // Simulate verification for test-user/test-repo
        if (
          repoUrl === "test-user/test-repo" ||
          repoUrl.includes("test-user/test-repo")
        ) {
          return HttpResponse.json({
            valid: true,
            type: "installed",
            fullName: "test-user/test-repo",
            repoName: "test-repo",
            installationId: 12345,
          });
        }

        // Simulate public repo verification
        if (
          repoUrl === "facebook/react" ||
          repoUrl.includes("facebook/react")
        ) {
          return HttpResponse.json({
            valid: true,
            type: "public",
            fullName: "facebook/react",
            repoName: "react",
          });
        }

        return HttpResponse.json(
          {
            error: "repository_not_found",
            error_description: "Repository not found or is private",
          },
          { status: 404 },
        );
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

  it("should show choice step initially", async () => {
    render(<NewProjectPage />);

    // Should show choice step with two options
    expect(screen.getByText("Create a New Project")).toBeInTheDocument();
    expect(
      screen.getByText("Choose how you want to set up your project"),
    ).toBeInTheDocument();

    // Should have GitHub Repository and Manual options
    expect(
      screen.getByRole("button", { name: /GitHub Repository/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Create Project Manually/i }),
    ).toBeInTheDocument();
  });

  it("should navigate to repository input when GitHub option is selected", async () => {
    render(<NewProjectPage />);

    // Click GitHub Repository option
    const githubButton = screen.getByRole("button", {
      name: /GitHub Repository/i,
    });
    fireEvent.click(githubButton);

    // Should show repository input step
    await waitFor(() => {
      expect(screen.getByText("Enter GitHub Repository")).toBeInTheDocument();
    });

    // Should have input field
    expect(
      screen.getByPlaceholderText(/Enter GitHub URL or owner\/repo/i),
    ).toBeInTheDocument();

    // Continue button should be disabled initially
    expect(screen.getByRole("button", { name: /Continue/i })).toBeDisabled();
  });

  it("should verify repository and enable continue button", async () => {
    const user = userEvent.setup();

    render(<NewProjectPage />);

    // Navigate to repository step
    const githubButton = screen.getByRole("button", {
      name: /GitHub Repository/i,
    });
    fireEvent.click(githubButton);

    await waitFor(() => {
      expect(screen.getByText("Enter GitHub Repository")).toBeInTheDocument();
    });

    // Type repository name
    const input = screen.getByPlaceholderText(
      /Enter GitHub URL or owner\/repo/i,
    );
    await user.type(input, "test-user/test-repo");

    // Trigger verification by blurring the input
    fireEvent.blur(input);

    // Should show verification success
    await waitFor(() => {
      expect(
        screen.getByText("Repository found and verified"),
      ).toBeInTheDocument();
    });

    // Continue button should now be enabled
    expect(
      screen.getByRole("button", { name: /Continue/i }),
    ).not.toBeDisabled();
  });

  it("should show error for invalid repository", async () => {
    const user = userEvent.setup();

    render(<NewProjectPage />);

    // Navigate to repository step
    const githubButton = screen.getByRole("button", {
      name: /GitHub Repository/i,
    });
    fireEvent.click(githubButton);

    await waitFor(() => {
      expect(screen.getByText("Enter GitHub Repository")).toBeInTheDocument();
    });

    // Type invalid repository name
    const input = screen.getByPlaceholderText(
      /Enter GitHub URL or owner\/repo/i,
    );
    await user.type(input, "invalid/nonexistent-repo");

    // Trigger verification
    fireEvent.blur(input);

    // Should show error
    await waitFor(() => {
      expect(
        screen.getByText("Repository not found or is private"),
      ).toBeInTheDocument();
    });

    // Continue button should remain disabled
    expect(screen.getByRole("button", { name: /Continue/i })).toBeDisabled();
  });

  it("should navigate to ready step after repository verification", async () => {
    const user = userEvent.setup();

    render(<NewProjectPage />);

    // Navigate to repository step
    const githubButton = screen.getByRole("button", {
      name: /GitHub Repository/i,
    });
    fireEvent.click(githubButton);

    await waitFor(() => {
      expect(screen.getByText("Enter GitHub Repository")).toBeInTheDocument();
    });

    // Enter and verify repository
    const input = screen.getByPlaceholderText(
      /Enter GitHub URL or owner\/repo/i,
    );
    await user.type(input, "test-user/test-repo");
    fireEvent.blur(input);

    // Wait for verification
    await waitFor(() => {
      expect(
        screen.getByText("Repository found and verified"),
      ).toBeInTheDocument();
    });

    // Click continue
    await user.click(screen.getByRole("button", { name: /Continue/i }));

    // Should reach ready step
    await waitFor(() => {
      expect(screen.getByText(/You'?re All Set!/i)).toBeInTheDocument();
    });

    // Should show repository name
    expect(screen.getByText("test-repo")).toBeInTheDocument();

    // Should have Start Scanning button
    expect(
      screen.getByRole("button", { name: /Start Scanning/i }),
    ).toBeInTheDocument();
  });

  it("should verify public repository", async () => {
    const user = userEvent.setup();

    render(<NewProjectPage />);

    // Navigate to repository step
    const githubButton = screen.getByRole("button", {
      name: /GitHub Repository/i,
    });
    fireEvent.click(githubButton);

    await waitFor(() => {
      expect(screen.getByText("Enter GitHub Repository")).toBeInTheDocument();
    });

    // Enter public repository
    const input = screen.getByPlaceholderText(
      /Enter GitHub URL or owner\/repo/i,
    );
    await user.type(input, "facebook/react");
    fireEvent.blur(input);

    // Should verify successfully
    await waitFor(() => {
      expect(
        screen.getByText("Repository found and verified"),
      ).toBeInTheDocument();
    });

    // Continue should be enabled
    expect(
      screen.getByRole("button", { name: /Continue/i }),
    ).not.toBeDisabled();
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

    // Navigate through the flow
    const githubButton = screen.getByRole("button", {
      name: /GitHub Repository/i,
    });
    fireEvent.click(githubButton);

    await waitFor(() => {
      expect(screen.getByText("Enter GitHub Repository")).toBeInTheDocument();
    });

    // Enter and verify repository
    const input = screen.getByPlaceholderText(
      /Enter GitHub URL or owner\/repo/i,
    );
    await user.type(input, "test-user/test-repo");
    fireEvent.blur(input);

    await waitFor(() => {
      expect(
        screen.getByText("Repository found and verified"),
      ).toBeInTheDocument();
    });

    // Click continue to ready step
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

  it("should allow manual project creation without GitHub", async () => {
    render(<NewProjectPage />);

    // Should show choice step
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
    render(<NewProjectPage />);

    // Wait for choice step
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

  it("should redirect to init page after installed repo project creation", async () => {
    const user = userEvent.setup();

    // Mock window.location.href
    Object.defineProperty(window, "location", {
      value: { href: "https://www.example.com" },
      writable: true,
    });

    render(<NewProjectPage />);

    // Navigate through the flow
    const githubButton = screen.getByRole("button", {
      name: /GitHub Repository/i,
    });
    fireEvent.click(githubButton);

    await waitFor(() => {
      expect(screen.getByText("Enter GitHub Repository")).toBeInTheDocument();
    });

    // Enter installed repository (returns installationId)
    const input = screen.getByPlaceholderText(
      /Enter GitHub URL or owner\/repo/i,
    );
    await user.type(input, "test-user/test-repo");
    fireEvent.blur(input);

    await waitFor(() => {
      expect(
        screen.getByText("Repository found and verified"),
      ).toBeInTheDocument();
    });

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

  it("should redirect to workspace for public repo without installation", async () => {
    const user = userEvent.setup();

    // Mock window.location
    Object.defineProperty(window, "location", {
      value: { href: "https://www.example.com" },
      writable: true,
    });

    render(<NewProjectPage />);

    // Navigate through the flow
    const githubButton = screen.getByRole("button", {
      name: /GitHub Repository/i,
    });
    fireEvent.click(githubButton);

    await waitFor(() => {
      expect(screen.getByText("Enter GitHub Repository")).toBeInTheDocument();
    });

    // Enter public repository (no installationId)
    const input = screen.getByPlaceholderText(
      /Enter GitHub URL or owner\/repo/i,
    );
    await user.type(input, "facebook/react");
    fireEvent.blur(input);

    await waitFor(() => {
      expect(
        screen.getByText("Repository found and verified"),
      ).toBeInTheDocument();
    });

    // Click continue
    await user.click(screen.getByRole("button", { name: /Continue/i }));

    await waitFor(() => {
      expect(screen.getByText(/You'?re All Set!/i)).toBeInTheDocument();
    });

    // Start scanning - should redirect to workspace (not init page)
    await user.click(screen.getByRole("button", { name: /Start Scanning/i }));

    // Should redirect to workspace
    await waitFor(() => {
      expect(window.location.href).toContain("/projects/project-123");
      expect(window.location.href).not.toContain("/init");
    });
  });
});
