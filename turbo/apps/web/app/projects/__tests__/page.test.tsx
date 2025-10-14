import React from "react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ProjectsListPage from "../page";
import { server, http, HttpResponse } from "../../../src/test/msw-setup";

// Mock window.location
const mockLocation = {
  href: "http://www.uspark.com/projects",
  origin: "http://www.uspark.com",
  protocol: "http:",
  host: "www.uspark.com",
  hostname: "www.uspark.com",
  port: "",
  pathname: "/projects",
  search: "",
  hash: "",
  assign: vi.fn(),
  reload: vi.fn(),
  replace: vi.fn(),
  toString: () => "http://www.uspark.com/projects",
  ancestorOrigins: {} as DOMStringList,
} as Location;

delete (window as { location?: Location }).location;
(window as { location: Location }).location = mockLocation;

// Mock Next.js router
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
  usePathname: vi.fn(() => "/projects"),
}));

describe("Projects List Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Reset location href
    Object.defineProperty(window.location, "href", {
      writable: true,
      value: "http://www.uspark.com/projects",
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
              source_repo_url: null,
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
              source_repo_url: null,
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
              source_repo_url: null,
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
      // Handler for GitHub installation status
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
    );
  });

  afterEach(() => server.resetHandlers());

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

    // Check that all project cards are rendered
    expect(screen.getByText("Demo Project")).toBeInTheDocument();
    expect(screen.getByText("Web Application")).toBeInTheDocument();
    expect(screen.getByText("API Service")).toBeInTheDocument();

    // Check that relative timestamps are displayed (multiple elements expected)
    const timestamps = screen.getAllByText(/\d+[hdw] ago/i);
    expect(timestamps.length).toBeGreaterThan(0);
  });

  it("navigates to workspace when clicking on project card", async () => {
    render(<ProjectsListPage />);

    await waitFor(() => {
      expect(
        screen.queryByText("Loading your projects..."),
      ).not.toBeInTheDocument();
    });

    const demoProject = screen.getByText("Demo Project").closest("div");
    expect(demoProject).toBeInTheDocument();

    fireEvent.click(demoProject!);

    // Should navigate to workspace subdomain
    expect(window.location.href).toBe(
      "http://app.uspark.com/projects/demo-project-123",
    );
  });

  it("navigates to new project page when clicking New Project button", async () => {
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

    // Should navigate to /projects/new (relative URL)
    expect(window.location.href).toBe("/projects/new");
  });
});
