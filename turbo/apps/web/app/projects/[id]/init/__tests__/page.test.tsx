import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { server, http, HttpResponse } from "../../../../../src/test/msw-setup";
import ProjectInitPage from "../page";

// Mock useParams
vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "project-123" }),
}));

describe("ProjectInitPage", () => {
  beforeEach(() => {
    // Set up default handlers for this test suite
    server.use(
      // Projects endpoint - GET (list)
      http.get("*/api/projects", () => {
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
      }),
    );
  });

  afterEach(() => server.resetHandlers());

  it("should display loading state initially", async () => {
    render(<ProjectInitPage />);

    expect(screen.getByText("Loading project...")).toBeInTheDocument();
  });

  it("should display scan progress for running scan", async () => {
    render(<ProjectInitPage />);

    await waitFor(() => {
      expect(screen.getByText("Scanning test-repo")).toBeInTheDocument();
      expect(screen.getByText("Cloning repository")).toBeInTheDocument();
    });
  });

  it("should display error when project not found", async () => {
    server.use(
      http.get("*/api/projects", () => {
        return HttpResponse.json({
          projects: [],
        });
      }),
    );

    render(<ProjectInitPage />);

    await waitFor(() => {
      expect(screen.getByText("Project not found")).toBeInTheDocument();
    });
  });

  it("should display error when fetch fails", async () => {
    server.use(
      http.get("*/api/projects", () => {
        return HttpResponse.error();
      }),
    );

    render(<ProjectInitPage />);

    await waitFor(() => {
      expect(screen.getByText("Failed to load project")).toBeInTheDocument();
    });
  });

  it("should auto-redirect when scan completes successfully", async () => {
    // Mock window.location.href
    Object.defineProperty(window, "location", {
      value: { href: "https://www.example.com" },
      writable: true,
    });

    let pollCount = 0;

    server.use(
      http.get("*/api/projects", () => {
        pollCount++;
        if (pollCount === 1) {
          // First fetch: get project with running scan
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

    render(<ProjectInitPage />);

    // Wait for initial scan progress
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
    Object.defineProperty(window, "location", {
      value: { href: "https://www.example.com" },
      writable: true,
    });

    let pollCount = 0;

    server.use(
      http.get("*/api/projects", () => {
        pollCount++;
        if (pollCount === 1) {
          // First fetch: get project with running scan
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
                id: "project-123",
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

    render(<ProjectInitPage />);

    // Wait for initial scan progress
    await waitFor(() => {
      expect(screen.getByText("Analyzing code")).toBeInTheDocument();
    });

    // Should auto-redirect even when scan fails
    await waitFor(
      () => {
        expect(window.location.href).toBe(
          "https://app.example.com/projects/project-123",
        );
      },
      { timeout: 5000 },
    );
  });

  it("should redirect immediately if scan is already completed on mount", async () => {
    // Mock window.location.href
    Object.defineProperty(window, "location", {
      value: { href: "https://www.example.com" },
      writable: true,
    });

    server.use(
      http.get("*/api/projects", () => {
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
      }),
    );

    render(<ProjectInitPage />);

    // Should redirect immediately without showing scan progress
    await waitFor(() => {
      expect(window.location.href).toBe(
        "https://app.example.com/projects/project-123",
      );
    });
  });
});
