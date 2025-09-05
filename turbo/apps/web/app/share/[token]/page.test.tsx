import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { notFound } from "next/navigation";
import SharePage from "./page";
import { server, http, HttpResponse } from "../../../src/test/msw-setup";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  notFound: vi.fn(),
}));

describe("SharePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should display loading state initially", async () => {
    const params = Promise.resolve({ token: "test-token" });
    render(<SharePage params={params} />);

    expect(screen.getByText("Loading shared content...")).toBeInTheDocument();
  });

  it("should fetch and display markdown file content", async () => {
    const mockMetadata = {
      project_name: "Test Project",
      file_path: "README.md",
      hash: "abc123",
      mtime: Date.now(),
      blob_url:
        "https://test-store.public.blob.vercel-storage.com/projects/test-project/abc123",
    };
    const mockContent = "# Test Markdown Content\n\nThis is a test.";

    // Setup MSW handlers for this test
    server.use(
      http.get("/api/share/test-token", () => {
        return HttpResponse.json(mockMetadata);
      }),
      http.get(
        "https://test-store.public.blob.vercel-storage.com/projects/test-project/abc123",
        () => {
          return HttpResponse.text(mockContent);
        },
      ),
    );

    const params = Promise.resolve({ token: "test-token" });
    render(<SharePage params={params} />);

    await waitFor(() => {
      expect(screen.getByText("Test Project")).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText("README.md")).toBeInTheDocument();
    });

    // Check for markdown content in the pre element
    const preElement = screen.getByText((content, element) => {
      return (
        element?.tagName === "PRE" &&
        content.includes("# Test Markdown Content")
      );
    });
    expect(preElement).toBeInTheDocument();

    expect(screen.getByText("Shared document • Read-only")).toBeInTheDocument();
  });

  it("should display download button for non-markdown files", async () => {
    const mockMetadata = {
      project_name: "Test Project",
      file_path: "data.json",
      hash: "def456",
      mtime: Date.now(),
      blob_url:
        "https://test-store.public.blob.vercel-storage.com/projects/test-project/def456",
    };
    const mockContent = '{"test": "data"}';

    server.use(
      http.get("/api/share/test-token", () => {
        return HttpResponse.json(mockMetadata);
      }),
      http.get(
        "https://test-store.public.blob.vercel-storage.com/projects/test-project/def456",
        () => {
          return HttpResponse.text(mockContent);
        },
      ),
    );

    const params = Promise.resolve({ token: "test-token" });
    render(<SharePage params={params} />);

    await waitFor(() => {
      expect(screen.getByText("Test Project")).toBeInTheDocument();
    });

    await waitFor(() => {
      // There will be multiple instances of "data.json"
      const elements = screen.getAllByText("data.json");
      expect(elements.length).toBeGreaterThan(0);
    });

    expect(screen.getByText("Download File")).toBeInTheDocument();
    expect(
      screen.getByText("This file type cannot be displayed in the browser."),
    ).toBeInTheDocument();
  });

  it("should call notFound() when share metadata fetch returns 404", async () => {
    server.use(
      http.get("/api/share/invalid-token", () => {
        return new HttpResponse(null, { status: 404 });
      }),
    );

    const params = Promise.resolve({ token: "invalid-token" });
    render(<SharePage params={params} />);

    await waitFor(() => {
      expect(notFound).toHaveBeenCalled();
    });
  });

  it("should handle file content fetch failure gracefully", async () => {
    const mockMetadata = {
      project_name: "Test Project",
      file_path: "test.md",
      hash: "missing-hash",
      mtime: Date.now(),
      blob_url:
        "https://test-store.public.blob.vercel-storage.com/projects/test-project/missing-hash",
    };

    server.use(
      http.get("/api/share/test-token", () => {
        return HttpResponse.json(mockMetadata);
      }),
      http.get(
        "https://test-store.public.blob.vercel-storage.com/projects/test-project/missing-hash",
        () => {
          return new HttpResponse(null, { status: 404 });
        },
      ),
    );

    const consoleWarnSpy = vi
      .spyOn(console, "warn")
      .mockImplementation(() => {});

    const params = Promise.resolve({ token: "test-token" });
    render(<SharePage params={params} />);

    await waitFor(() => {
      expect(screen.getByText("Test Project")).toBeInTheDocument();
    });

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      "Could not fetch file content from blob storage",
    );
    expect(
      screen.getByText("File preview is not available yet."),
    ).toBeInTheDocument();

    consoleWarnSpy.mockRestore();
  });

  it("should handle download button click for non-markdown files", async () => {
    const mockMetadata = {
      project_name: "Test Project",
      file_path: "document.txt",
      hash: "xyz789",
      mtime: Date.now(),
      blob_url:
        "https://test-store.public.blob.vercel-storage.com/projects/test-project/xyz789",
    };
    const mockContent = "Plain text content";

    server.use(
      http.get("/api/share/test-token", () => {
        return HttpResponse.json(mockMetadata);
      }),
      http.get(
        "https://test-store.public.blob.vercel-storage.com/projects/test-project/xyz789",
        () => {
          return HttpResponse.text(mockContent);
        },
      ),
    );

    const params = Promise.resolve({ token: "test-token" });
    render(<SharePage params={params} />);

    await waitFor(() => {
      expect(screen.getByText("Test Project")).toBeInTheDocument();
    });

    const downloadButtons = screen.getAllByText("Download");
    expect(downloadButtons[0]).toBeInTheDocument();

    // The download functionality uses native browser APIs which work in jsdom
    // Just verify the button is clickable
    downloadButtons[0]?.click();

    // The download will trigger but jsdom doesn't actually download files
    // We're mainly testing that the button exists and is clickable
  });

  it("should handle API errors gracefully", async () => {
    server.use(
      http.get("/api/share/test-token", () => {
        return new HttpResponse(null, { status: 500 });
      }),
    );

    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const params = Promise.resolve({ token: "test-token" });
    render(<SharePage params={params} />);

    await waitFor(() => {
      expect(notFound).toHaveBeenCalled();
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Failed to fetch share metadata:",
      expect.any(Error),
    );

    consoleErrorSpy.mockRestore();
  });

  it("should handle network errors gracefully", async () => {
    server.use(
      http.get("/api/share/test-token", () => {
        return HttpResponse.error();
      }),
    );

    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const params = Promise.resolve({ token: "test-token" });
    render(<SharePage params={params} />);

    await waitFor(() => {
      expect(notFound).toHaveBeenCalled();
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Failed to fetch share metadata:",
      expect.any(Error),
    );

    consoleErrorSpy.mockRestore();
  });
});
