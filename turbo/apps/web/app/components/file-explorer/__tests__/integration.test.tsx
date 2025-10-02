import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { YjsFileExplorer } from "../yjs-file-explorer";
import * as Y from "yjs";
import { server, http, HttpResponse } from "../../../../src/test/msw-setup";

describe("YjsFileExplorer Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createMockYjsDocument = (): ArrayBuffer => {
    const ydoc = new Y.Doc();
    const filesMap = ydoc.getMap("files");
    const blobsMap = ydoc.getMap("blobs");

    // Add mock files
    const files = [
      { path: "src/index.ts", hash: "hash1", size: 100, mtime: Date.now() },
      {
        path: "src/components/Button.tsx",
        hash: "hash2",
        size: 200,
        mtime: Date.now(),
      },
      { path: "package.json", hash: "hash3", size: 150, mtime: Date.now() },
    ];

    files.forEach((file) => {
      filesMap.set(file.path, { hash: file.hash, mtime: file.mtime });
      blobsMap.set(file.hash, { size: file.size });
    });

    const update = Y.encodeStateAsUpdate(ydoc);
    // Convert to ArrayBuffer for type safety
    return new Uint8Array(update).buffer;
  };

  it("loads and displays project files from YJS document", async () => {
    const mockYjsData = createMockYjsDocument();

    server.use(
      http.get("/api/projects/test-project", () => {
        return HttpResponse.arrayBuffer(mockYjsData);
      }),
    );

    const mockOnFileSelect = vi.fn();

    render(
      <YjsFileExplorer
        projectId="test-project"
        onFileSelect={mockOnFileSelect}
        showMetadata={true}
      />,
    );

    // Should show loading initially
    expect(screen.getByText("Loading project files...")).toBeInTheDocument();

    // Wait for files to load
    await waitFor(() => {
      expect(
        screen.queryByText("Loading project files..."),
      ).not.toBeInTheDocument();
    });

    // MSW handles the API endpoint - no need to check fetch calls

    // Should display parsed files
    expect(screen.getByText("src")).toBeInTheDocument();
    expect(screen.getByText("package.json")).toBeInTheDocument();

    // Should show metadata
    expect(screen.getByText("3 files")).toBeInTheDocument();
    expect(screen.getByText(/450 B/)).toBeInTheDocument(); // Total size: 100+200+150
  });

  it("handles file selection correctly", async () => {
    const mockYjsData = createMockYjsDocument();

    server.use(
      http.get("/api/projects/test-project", () => {
        return HttpResponse.arrayBuffer(mockYjsData);
      }),
    );

    const mockOnFileSelect = vi.fn();

    render(
      <YjsFileExplorer
        projectId="test-project"
        onFileSelect={mockOnFileSelect}
        selectedFile="package.json"
      />,
    );

    // Wait for files to load
    await waitFor(() => {
      expect(
        screen.queryByText("Loading project files..."),
      ).not.toBeInTheDocument();
    });

    // Click on package.json file
    const packageJson = screen.getByText("package.json");
    fireEvent.click(packageJson);

    expect(mockOnFileSelect).toHaveBeenCalledWith("package.json");
  });

  it("expands and navigates directory structure", async () => {
    const mockYjsData = createMockYjsDocument();

    server.use(
      http.get("/api/projects/test-project", () => {
        return HttpResponse.arrayBuffer(mockYjsData);
      }),
    );

    render(<YjsFileExplorer projectId="test-project" />);

    await waitFor(() => {
      expect(
        screen.queryByText("Loading project files..."),
      ).not.toBeInTheDocument();
    });

    // Initially, nested files should not be visible
    expect(screen.queryByText("index.ts")).not.toBeInTheDocument();
    expect(screen.queryByText("Button.tsx")).not.toBeInTheDocument();

    // Click to expand src directory
    const srcFolder = screen.getByText("src");
    fireEvent.click(srcFolder);

    // Now nested files should be visible
    expect(screen.getByText("index.ts")).toBeInTheDocument();

    // Expand components directory
    const componentsFolder = screen.getByText("components");
    fireEvent.click(componentsFolder);

    expect(screen.getByText("Button.tsx")).toBeInTheDocument();
  });

  it("updates when projectId changes", async () => {
    const mockYjsData1 = createMockYjsDocument();
    const mockYjsData2 = createMockYjsDocument();

    server.use(
      http.get("/api/projects/project-1", () => {
        return HttpResponse.arrayBuffer(mockYjsData1);
      }),
      http.get("/api/projects/project-2", () => {
        return HttpResponse.arrayBuffer(mockYjsData2);
      }),
    );

    const { rerender } = render(<YjsFileExplorer projectId="project-1" />);

    await waitFor(() => {
      expect(
        screen.queryByText("Loading project files..."),
      ).not.toBeInTheDocument();
    });

    // Change project ID
    rerender(<YjsFileExplorer projectId="project-2" />);

    // Should show loading again
    expect(screen.getByText("Loading project files...")).toBeInTheDocument();

    await waitFor(() => {
      expect(
        screen.queryByText("Loading project files..."),
      ).not.toBeInTheDocument();
    });
  });

  it("displays file metadata correctly", async () => {
    const mockYjsData = createMockYjsDocument();

    server.use(
      http.get("/api/projects/test-project", () => {
        return HttpResponse.arrayBuffer(mockYjsData);
      }),
    );

    render(<YjsFileExplorer projectId="test-project" showMetadata={true} />);

    await waitFor(() => {
      expect(
        screen.queryByText("Loading project files..."),
      ).not.toBeInTheDocument();
    });

    // Should show file count
    expect(screen.getByText("3 files")).toBeInTheDocument();

    // Should show total size (100 + 200 + 150 = 450 bytes)
    expect(screen.getByText("450 B")).toBeInTheDocument();
  });

  it("hides metadata when showMetadata is false", async () => {
    const mockYjsData = createMockYjsDocument();

    server.use(
      http.get("/api/projects/test-project", () => {
        return HttpResponse.arrayBuffer(mockYjsData);
      }),
    );

    render(<YjsFileExplorer projectId="test-project" showMetadata={false} />);

    await waitFor(() => {
      expect(
        screen.queryByText("Loading project files..."),
      ).not.toBeInTheDocument();
    });

    // Should not show metadata section
    expect(screen.queryByText("3 files")).not.toBeInTheDocument();
    expect(screen.queryByText("450 B")).not.toBeInTheDocument();
  });
});
