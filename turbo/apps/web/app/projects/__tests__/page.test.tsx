import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { useRouter } from "next/navigation";
import ProjectsListPage from "../page";

// Mock Next.js router
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
}));

describe("Projects List Page", () => {
  const mockPush = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as ReturnType<typeof vi.fn>).mockReturnValue({
      push: mockPush,
    });
  });

  it("renders page header correctly", async () => {
    render(<ProjectsListPage />);

    // Wait for loading to complete
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

  it("shows loading state initially", () => {
    render(<ProjectsListPage />);

    expect(screen.getByText("Loading your projects...")).toBeInTheDocument();
  });

  it("displays mock projects after loading", async () => {
    render(<ProjectsListPage />);

    // Wait for loading to complete
    await waitFor(() => {
      expect(
        screen.queryByText("Loading your projects..."),
      ).not.toBeInTheDocument();
    });

    // Check that mock projects are displayed
    expect(screen.getByText("Demo Project")).toBeInTheDocument();
    expect(screen.getByText("Web Application")).toBeInTheDocument();
    expect(screen.getByText("API Service")).toBeInTheDocument();
  });

  it("shows project metadata", async () => {
    render(<ProjectsListPage />);

    await waitFor(() => {
      expect(
        screen.queryByText("Loading your projects..."),
      ).not.toBeInTheDocument();
    });

    // Check file counts and sizes are displayed
    expect(screen.getByText("7 files")).toBeInTheDocument();
    expect(screen.getByText("23 files")).toBeInTheDocument();
    expect(screen.getByText("12 files")).toBeInTheDocument();

    // Check that size information is displayed
    expect(screen.getAllByText(/KB|MB|B/)).toHaveLength(3);
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

  it("handles project creation", async () => {
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

    // Enter project name
    const nameInput = screen.getByPlaceholderText("Enter project name...");
    fireEvent.change(nameInput, { target: { value: "Test Project" } });

    // Click create button
    const createButton = screen.getByRole("button", { name: "Create Project" });
    expect(createButton).not.toBeDisabled();

    fireEvent.click(createButton);

    // Should show creating state
    expect(screen.getByText("Creating...")).toBeInTheDocument();

    // Wait for creation to complete and navigation
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(
        expect.stringMatching(/^\/projects\/project-\d+$/),
      );
    }, { timeout: 3000 }); // Increase timeout for async operations
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

    // Should start creating
    expect(screen.getByText("Creating...")).toBeInTheDocument();

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalled();
    });
  });
});
