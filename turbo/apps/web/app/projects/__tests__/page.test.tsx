import React from "react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { useRouter } from "next/navigation";
import ProjectsListPage from "../page";
import { server, http, HttpResponse } from "../../../src/test/msw-setup";

// Mock Next.js router
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
  usePathname: vi.fn(() => "/projects"),
}));

describe("Projects List Page", () => {
  const mockPush = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as ReturnType<typeof vi.fn>).mockReturnValue({
      push: mockPush,
    });

    // Set up default handlers for this test suite
    server.use(
      // Default handler for GET /api/projects
      http.get("*/api/projects", () => {
        return HttpResponse.json({
          projects: [
            {
              id: "demo-project-123",
              name: "Demo Project",
              created_at: new Date(
                Date.now() - 7 * 24 * 60 * 60 * 1000,
              ).toISOString(),
              updated_at: new Date(
                Date.now() - 2 * 60 * 60 * 1000,
              ).toISOString(),
            },
            {
              id: "web-app-456",
              name: "Web Application",
              created_at: new Date(
                Date.now() - 14 * 24 * 60 * 60 * 1000,
              ).toISOString(),
              updated_at: new Date(
                Date.now() - 1 * 24 * 60 * 60 * 1000,
              ).toISOString(),
            },
            {
              id: "api-service-789",
              name: "API Service",
              created_at: new Date(
                Date.now() - 30 * 24 * 60 * 60 * 1000,
              ).toISOString(),
              updated_at: new Date(
                Date.now() - 3 * 24 * 60 * 60 * 1000,
              ).toISOString(),
            },
          ],
        });
      }),
      // Handler for POST /api/projects
      http.post("*/api/projects", async ({ request }) => {
        const body = (await request.json()) as { name: string };
        const newProject = {
          id: `project-${Date.now()}`,
          name: body.name,
          created_at: new Date().toISOString(),
        };
        return HttpResponse.json(newProject, { status: 201 });
      }),
    );
  });

  afterEach(() => server.resetHandlers());

  it("renders page header correctly", async () => {
    render(<ProjectsListPage />);

    // Wait for page to load
    await waitFor(() => {
      expect(
        screen.queryByText("Loading your projects..."),
      ).not.toBeInTheDocument();
    });

    expect(
      screen.getByRole("heading", { name: "Your Projects" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Manage and collaborate on your projects with Claude Code",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /new project/i }),
    ).toBeInTheDocument();
  });

  it("displays projects after loading from API", async () => {
    render(<ProjectsListPage />);

    // Wait for projects to load from API
    await waitFor(() => {
      expect(
        screen.queryByText("Loading your projects..."),
      ).not.toBeInTheDocument();
    });

    // Check that projects from API are displayed
    expect(screen.getByText("Demo Project")).toBeInTheDocument();
    expect(screen.getByText("Web Application")).toBeInTheDocument();
    expect(screen.getByText("API Service")).toBeInTheDocument();
  });

  it("shows project metadata", async () => {
    render(<ProjectsListPage />);

    // Wait for projects to load
    await waitFor(() => {
      expect(
        screen.queryByText("Loading your projects..."),
      ).not.toBeInTheDocument();
    });

    // Check file counts are displayed (now showing 0 files since we're using real API)
    expect(screen.getAllByText("0 files")).toHaveLength(3);

    // Check that size information is displayed (all should be 0 B)
    expect(screen.getAllByText("0 B")).toHaveLength(3);
  });

  it("navigates to project detail when clicking on project card", async () => {
    render(<ProjectsListPage />);

    await waitFor(() => {
      expect(
        screen.queryByText("Loading your projects..."),
      ).not.toBeInTheDocument();
    });

    const demoProject = screen.getByText("Demo Project").closest("div");
    expect(demoProject).toBeInTheDocument();

    fireEvent.click(demoProject!);

    expect(mockPush).toHaveBeenCalledWith("/projects/demo-project-123");
  });

  it("opens create project dialog", async () => {
    render(<ProjectsListPage />);

    // Wait for loading to complete
    await waitFor(() => {
      expect(
        screen.queryByText("Loading your projects..."),
      ).not.toBeInTheDocument();
    });

    const newProjectButton = screen.getByRole("button", {
      name: /new project/i,
    });
    fireEvent.click(newProjectButton);

    expect(screen.getByText("Create New Project")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Enter project name..."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Create Project" }),
    ).toBeInTheDocument();
  });

  it("handles project creation with API", async () => {
    render(<ProjectsListPage />);

    // Wait for initial load
    await waitFor(() => {
      expect(
        screen.queryByText("Loading your projects..."),
      ).not.toBeInTheDocument();
    });

    // Open create dialog
    const newProjectButton = screen.getByRole("button", {
      name: /new project/i,
    });
    fireEvent.click(newProjectButton);

    // Enter project name
    const nameInput = screen.getByPlaceholderText("Enter project name...");
    fireEvent.change(nameInput, { target: { value: "Test Project" } });

    // Click create button
    const createButton = screen.getByRole("button", { name: "Create Project" });
    expect(createButton).not.toBeDisabled();

    fireEvent.click(createButton);

    // Wait for API call and navigation
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(
        expect.stringMatching(/^\/projects\/project-\d+$/),
      );
    });
  });

  it("disables create button when name is empty", async () => {
    render(<ProjectsListPage />);

    // Wait for loading to complete
    await waitFor(() => {
      expect(
        screen.queryByText("Loading your projects..."),
      ).not.toBeInTheDocument();
    });

    // Open create dialog
    const newProjectButton = screen.getByRole("button", {
      name: /new project/i,
    });
    fireEvent.click(newProjectButton);

    const createButton = screen.getByRole("button", { name: "Create Project" });
    expect(createButton).toBeDisabled();

    // Enter and clear name
    const nameInput = screen.getByPlaceholderText("Enter project name...");
    fireEvent.change(nameInput, { target: { value: "Test" } });
    expect(createButton).not.toBeDisabled();

    fireEvent.change(nameInput, { target: { value: "" } });
    expect(createButton).toBeDisabled();
  });

  it("closes dialog on cancel", async () => {
    render(<ProjectsListPage />);

    // Wait for loading to complete
    await waitFor(() => {
      expect(
        screen.queryByText("Loading your projects..."),
      ).not.toBeInTheDocument();
    });

    // Open dialog
    const newProjectButton = screen.getByRole("button", {
      name: /new project/i,
    });
    fireEvent.click(newProjectButton);
    expect(screen.getByText("Create New Project")).toBeInTheDocument();

    // Cancel
    const cancelButton = screen.getByRole("button", { name: "Cancel" });
    fireEvent.click(cancelButton);

    expect(screen.queryByText("Create New Project")).not.toBeInTheDocument();
  });

  it("closes dialog on escape key", async () => {
    render(<ProjectsListPage />);

    // Wait for loading to complete
    await waitFor(() => {
      expect(
        screen.queryByText("Loading your projects..."),
      ).not.toBeInTheDocument();
    });

    // Open dialog
    const newProjectButton = screen.getByRole("button", {
      name: /new project/i,
    });
    fireEvent.click(newProjectButton);
    expect(screen.getByText("Create New Project")).toBeInTheDocument();

    // Press escape
    const nameInput = screen.getByPlaceholderText("Enter project name...");
    fireEvent.keyDown(nameInput, { key: "Escape" });

    expect(screen.queryByText("Create New Project")).not.toBeInTheDocument();
  });

  it("submits on enter key", async () => {
    render(<ProjectsListPage />);

    // Wait for loading to complete
    await waitFor(() => {
      expect(
        screen.queryByText("Loading your projects..."),
      ).not.toBeInTheDocument();
    });

    // Open dialog and enter name
    const newProjectButton = screen.getByRole("button", {
      name: /new project/i,
    });
    fireEvent.click(newProjectButton);

    const nameInput = screen.getByPlaceholderText("Enter project name...");
    fireEvent.change(nameInput, { target: { value: "Test Project" } });

    // Press enter
    fireEvent.keyDown(nameInput, { key: "Enter" });

    // Wait for API call and navigation
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalled();
    });
  });
});
