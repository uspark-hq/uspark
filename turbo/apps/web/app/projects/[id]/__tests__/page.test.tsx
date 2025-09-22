import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { useParams } from "next/navigation";
import ProjectDetailPage from "../page";
import * as Y from "yjs";
import { server, http, HttpResponse } from "../../../../src/test/msw-setup";
// Mock Next.js navigation
vi.mock("next/navigation", () => ({
  useParams: vi.fn(),
}));

// Mock yjs-filesystem functions
vi.mock("@uspark/core/yjs-filesystem", () => ({
  parseYjsFileSystem: vi.fn(),
  formatFileSize: (size: number) => {
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  },
}));

describe("Project Detail Page", () => {
  const createMockYjsDocument = (): ArrayBuffer => {
    const ydoc = new Y.Doc();
    const filesMap = ydoc.getMap("files");
    const blobsMap = ydoc.getMap("blobs");

    // Add mock files
    const files = [
      { path: "src/test.ts", hash: "hash1", size: 100, mtime: Date.now() },
      {
        path: "src/components/Button.tsx",
        hash: "hash2",
        size: 200,
        mtime: Date.now(),
      },
      { path: "package.json", hash: "hash3", size: 150, mtime: Date.now() },
      { path: "README.md", hash: "hash4", size: 300, mtime: Date.now() },
    ];

    files.forEach((file) => {
      filesMap.set(file.path, { hash: file.hash, mtime: file.mtime });
      blobsMap.set(file.hash, { size: file.size });
    });

    const update = Y.encodeStateAsUpdate(ydoc);
    return new Uint8Array(update).buffer;
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    (useParams as ReturnType<typeof vi.fn>).mockReturnValue({
      id: "test-project-123",
    });

    // Mock yjs-filesystem functions
    const mockYjsModule = await import("@uspark/core/yjs-filesystem");

    vi.mocked(mockYjsModule.parseYjsFileSystem).mockImplementation(() => ({
      files: [
        {
          path: "src",
          type: "directory",
          children: [
            { path: "src/test.ts", type: "file", hash: "hash1", size: 100, mtime: Date.now() },
            {
              path: "src/components",
              type: "directory",
              children: [
                { path: "src/components/Button.tsx", type: "file", hash: "hash2", size: 200, mtime: Date.now() },
              ],
            },
          ],
        },
        { path: "package.json", type: "file", hash: "hash3", size: 150, mtime: Date.now() },
        { path: "README.md", type: "file", hash: "hash4", size: 300, mtime: Date.now() },
      ],
      totalSize: 750,
      fileCount: 4,
    }));

    // Set up MSW handlers for blob storage and API
    const mockYjsData = createMockYjsDocument();

    // Mock blob storage responses
    const setupBlobHandlers = () => {
      const contentMap: Record<string, string> = {
        hash1: `// src/test.ts\nexport function Component() {\n  return <div>Hello from src/test.ts</div>;\n}`,
        hash2: `// src/components/Button.tsx\nexport function Component() {\n  return <div>Hello from src/components/Button.tsx</div>;\n}`,
        hash3: JSON.stringify(
          {
            name: "example-project",
            version: "1.0.0",
            description: "Content for package.json",
          },
          null,
          2,
        ),
        hash4: `# README.md\n\nThis is a markdown file.\n\n## Features\n\n- Feature 1\n- Feature 2\n- Feature 3`,
      };

      // Mock direct blob storage URLs
      Object.entries(contentMap).forEach(([hash, content]) => {
        server.use(
          http.get(`https://test-store.public.blob.vercel-storage.com/${hash}`, () => {
            return new HttpResponse(content, {
              headers: {
                "Content-Type": "text/plain",
              },
            });
          }),
        );
      });
    };

    setupBlobHandlers();

    server.use(
      http.get("*/api/projects/:projectId", () => {
        return HttpResponse.arrayBuffer(mockYjsData, {
          headers: {
            "Content-Type": "application/octet-stream",
          },
        });
      }),
      // Mock blob store endpoint
      http.get("*/api/blob-store", () => {
        return HttpResponse.json({
          storeId: "test-store",
        });
      }),
    );
  });

  it("renders page with correct project ID", async () => {
    render(<ProjectDetailPage />);

    expect(
      screen.getByRole("heading", { name: "Project: test-project-123" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Browse files and collaborate with Claude Code"),
    ).toBeInTheDocument();

    // Wait for YjsFileExplorer to load
    await waitFor(() => {
      expect(
        screen.queryByText("Loading project files..."),
      ).not.toBeInTheDocument();
    });
  });

  it("renders main layout sections", async () => {
    render(<ProjectDetailPage />);

    // File Explorer section
    expect(screen.getByText("📁 Project Files")).toBeInTheDocument();

    // Wait for YjsFileExplorer to load
    await waitFor(() => {
      expect(
        screen.queryByText("Loading project files..."),
      ).not.toBeInTheDocument();
    });

    // Document Viewer section
    expect(screen.getByText("📄 Document Viewer")).toBeInTheDocument();
    expect(
      screen.getByText("Select a file to view its content"),
    ).toBeInTheDocument();

    // Chat Input section
    expect(
      screen.getByPlaceholderText("Ask Claude to help with your code..."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send" })).toBeInTheDocument();
  });

  it("loads and displays project files", async () => {
    render(<ProjectDetailPage />);

    // Initially shows loading
    expect(screen.getByText("Loading project files...")).toBeInTheDocument();

    // Wait for files to load
    await waitFor(() => {
      expect(
        screen.queryByText("Loading project files..."),
      ).not.toBeInTheDocument();
    });

    // Should display the files from our mock data
    expect(screen.getByText("src")).toBeInTheDocument();
    expect(screen.getByText("package.json")).toBeInTheDocument();
    expect(screen.getByText("README.md")).toBeInTheDocument();

    // Should show metadata
    expect(screen.getByText("4 files")).toBeInTheDocument();
    expect(screen.getByText(/750 B/)).toBeInTheDocument(); // Total size: 100+200+150+300
  });

  it("handles file selection and updates document viewer", async () => {
    render(<ProjectDetailPage />);

    // Wait for files to load
    await waitFor(() => {
      expect(
        screen.queryByText("Loading project files..."),
      ).not.toBeInTheDocument();
    });

    // Initially no file selected
    expect(
      screen.getByText("Select a file to view its content"),
    ).toBeInTheDocument();

    // Click on package.json file
    const packageJson = screen.getByText("package.json");
    fireEvent.click(packageJson);

    // Document viewer should show file name
    await waitFor(() => {
      expect(screen.getByText("📄 package.json")).toBeInTheDocument();
    });
    expect(screen.getByText("Read-only preview")).toBeInTheDocument();
  });

  it("loads file content when file is selected", async () => {
    render(<ProjectDetailPage />);

    // Wait for files to load
    await waitFor(() => {
      expect(
        screen.queryByText("Loading project files..."),
      ).not.toBeInTheDocument();
    });

    // Expand src directory
    const srcFolder = screen.getByText("src");
    fireEvent.click(srcFolder);

    // Select test.ts file
    const testFile = screen.getByText("test.ts");
    fireEvent.click(testFile);

    // Content should be loaded
    await waitFor(() => {
      expect(screen.getByText("📄 src/test.ts")).toBeInTheDocument();
    });
  });

  it("displays file content based on file extension", async () => {
    render(<ProjectDetailPage />);

    // Wait for files to load
    await waitFor(() => {
      expect(
        screen.queryByText("Loading project files..."),
      ).not.toBeInTheDocument();
    });

    // Expand src directory and select TypeScript file
    const srcFolder = screen.getByText("src");
    fireEvent.click(srcFolder);

    const testFile = screen.getByText("test.ts");
    fireEvent.click(testFile);

    // Wait for content to load
    await waitFor(() => {
      expect(screen.getByText("📄 src/test.ts")).toBeInTheDocument();
    });

    await waitFor(
      () => {
        expect(
          screen.queryByText("Loading file content..."),
        ).not.toBeInTheDocument();
      },
      { timeout: 2000 },
    );

    // Should show TypeScript content
    expect(screen.getByText(/\/\/ src\/test\.ts/)).toBeInTheDocument();
    expect(screen.getByText(/export function Component/)).toBeInTheDocument();
  });

  it("renders chat input with proper styling and interaction", () => {
    render(<ProjectDetailPage />);

    const textarea = screen.getByPlaceholderText(
      "Ask Claude to help with your code...",
    );
    const sendButton = screen.getByRole("button", { name: "Send" });

    expect(textarea).toBeInTheDocument();
    expect(sendButton).toBeInTheDocument();

    // Test textarea functionality
    fireEvent.change(textarea, { target: { value: "Add a new component" } });
    expect(textarea).toHaveValue("Add a new component");

    // Test chat interface hints and status
    expect(
      screen.getByText("Press Enter to send, Shift+Enter for new line"),
    ).toBeInTheDocument();
    expect(screen.getByText("Mock Mode")).toBeInTheDocument();
  });

  it("renders back to projects navigation link", () => {
    render(<ProjectDetailPage />);

    const backLink = screen.getByText("← Back to Projects");
    expect(backLink).toBeInTheDocument();
    expect(backLink.closest("button")).toBeInTheDocument();
  });

  it("handles different project IDs from params", async () => {
    (useParams as ReturnType<typeof vi.fn>).mockReturnValue({
      id: "another-project-456",
    });

    // Mock handler is already set up in beforeEach with wildcard pattern
    // No need to set up again as the wildcard pattern will match any project ID

    render(<ProjectDetailPage />);

    expect(
      screen.getByRole("heading", { name: "Project: another-project-456" }),
    ).toBeInTheDocument();

    // Wait for files to load
    await waitFor(() => {
      expect(
        screen.queryByText("Loading project files..."),
      ).not.toBeInTheDocument();
    });
  });

  it("shows proper content for JSON files", async () => {
    render(<ProjectDetailPage />);

    // Wait for files to load
    await waitFor(() => {
      expect(
        screen.queryByText("Loading project files..."),
      ).not.toBeInTheDocument();
    });

    // Select package.json file
    const packageJson = screen.getByText("package.json");
    fireEvent.click(packageJson);

    // Wait for the file selection to be processed
    await waitFor(() => {
      expect(screen.getByText("📄 package.json")).toBeInTheDocument();
    });

    await waitFor(
      () => {
        expect(
          screen.queryByText("Loading file content..."),
        ).not.toBeInTheDocument();
      },
      { timeout: 2000 },
    );

    // Should show JSON content
    expect(screen.getByText(/"name":/)).toBeInTheDocument();
    expect(screen.getByText(/"version":/)).toBeInTheDocument();
  });

  it("shows proper content for Markdown files", async () => {
    render(<ProjectDetailPage />);

    // Wait for files to load
    await waitFor(() => {
      expect(
        screen.queryByText("Loading project files..."),
      ).not.toBeInTheDocument();
    });

    // Select README.md file
    const readmeFile = screen.getByText("README.md");
    fireEvent.click(readmeFile);

    // Wait for the file selection to be processed
    await waitFor(() => {
      expect(screen.getByText("📄 README.md")).toBeInTheDocument();
    });

    await waitFor(
      () => {
        expect(
          screen.queryByText("Loading file content..."),
        ).not.toBeInTheDocument();
      },
      { timeout: 2000 },
    );

    // Should show Markdown content (using the default mock content)
    expect(screen.getByText(/# README.md/)).toBeInTheDocument();
    expect(screen.getByText(/This is a markdown file/)).toBeInTheDocument();
  });

  it("expands and navigates directory structure", async () => {
    render(<ProjectDetailPage />);

    await waitFor(() => {
      expect(
        screen.queryByText("Loading project files..."),
      ).not.toBeInTheDocument();
    });

    // Initially, nested files should not be visible
    expect(screen.queryByText("test.ts")).not.toBeInTheDocument();
    expect(screen.queryByText("Button.tsx")).not.toBeInTheDocument();

    // Click to expand src directory
    const srcFolder = screen.getByText("src");
    fireEvent.click(srcFolder);

    // Now nested file should be visible
    expect(screen.getByText("test.ts")).toBeInTheDocument();

    // Expand components directory
    const componentsFolder = screen.getByText("components");
    fireEvent.click(componentsFolder);

    expect(screen.getByText("Button.tsx")).toBeInTheDocument();
  });

  describe("Share functionality", () => {
    beforeEach(() => {
      // Mock clipboard API
      Object.assign(navigator, {
        clipboard: {
          writeText: vi.fn().mockResolvedValue(undefined),
        },
      });
    });

    it("does not show share button when no file is selected", async () => {
      render(<ProjectDetailPage />);

      await waitFor(() => {
        expect(
          screen.queryByText("Loading project files..."),
        ).not.toBeInTheDocument();
      });

      // Share button should not be visible when no file is selected
      expect(screen.queryByText("Share")).not.toBeInTheDocument();
    });

    it("shows share button when a file is selected", async () => {
      render(<ProjectDetailPage />);

      await waitFor(() => {
        expect(
          screen.queryByText("Loading project files..."),
        ).not.toBeInTheDocument();
      });

      // Select a file
      const packageJson = screen.getByText("package.json");
      fireEvent.click(packageJson);

      await waitFor(() => {
        expect(screen.getByText("📄 package.json")).toBeInTheDocument();
      });

      // Share button should now be visible
      expect(screen.getByText("Share")).toBeInTheDocument();
    });

    it("creates share link and copies to clipboard", async () => {
      const mockShareResponse = {
        id: "share-123",
        url: "http://localhost:3000/share/token-abc",
        token: "token-abc",
      };

      // Use MSW to mock the share API
      server.use(
        http.post("*/api/share", () => {
          return HttpResponse.json(mockShareResponse);
        }),
      );

      render(<ProjectDetailPage />);

      await waitFor(() => {
        expect(
          screen.queryByText("Loading project files..."),
        ).not.toBeInTheDocument();
      });

      // Select a file
      const packageJson = screen.getByText("package.json");
      fireEvent.click(packageJson);

      await waitFor(() => {
        expect(screen.getByText("📄 package.json")).toBeInTheDocument();
      });

      // Click share button
      const shareButton = screen.getByText("Share");
      fireEvent.click(shareButton);

      // Should show loading state
      expect(screen.getByText("Sharing...")).toBeInTheDocument();

      // Wait for API call to complete
      await waitFor(() => {
        expect(
          screen.getByText("✓ Link copied to clipboard!"),
        ).toBeInTheDocument();
      });

      // The API call verification is handled by MSW
      // If the endpoint wasn't called, MSW would have returned an error

      // Verify clipboard was updated
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        "http://localhost:3000/share/token-abc",
      );

      // Success message should disappear after 3 seconds
      await waitFor(
        () => {
          expect(
            screen.queryByText("✓ Link copied to clipboard!"),
          ).not.toBeInTheDocument();
          expect(screen.getByText("Share")).toBeInTheDocument();
        },
        { timeout: 4000 },
      );
    });

    it("handles share API errors gracefully", async () => {
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      // Use MSW to mock API error
      server.use(
        http.post("*/api/share", () => {
          return new HttpResponse(null, { status: 500 });
        }),
      );

      render(<ProjectDetailPage />);

      await waitFor(() => {
        expect(
          screen.queryByText("Loading project files..."),
        ).not.toBeInTheDocument();
      });

      // Select a file
      const packageJson = screen.getByText("package.json");
      fireEvent.click(packageJson);

      await waitFor(() => {
        expect(screen.getByText("📄 package.json")).toBeInTheDocument();
      });

      // Click share button
      const shareButton = screen.getByText("Share");
      fireEvent.click(shareButton);

      // Should show loading state
      expect(screen.getByText("Sharing...")).toBeInTheDocument();

      // Wait for API call to complete
      await waitFor(() => {
        expect(screen.getByText("Share")).toBeInTheDocument();
      });

      // Should not show success message
      expect(
        screen.queryByText("✓ Link copied to clipboard!"),
      ).not.toBeInTheDocument();

      // Verify error was logged
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to create share link",
      );

      consoleErrorSpy.mockRestore();
    });

    it("handles network errors during share", async () => {
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      // Use MSW to simulate network error
      server.use(
        http.post("*/api/share", () => {
          return HttpResponse.error();
        }),
      );

      render(<ProjectDetailPage />);

      await waitFor(() => {
        expect(
          screen.queryByText("Loading project files..."),
        ).not.toBeInTheDocument();
      });

      // Select a file
      const readmeFile = screen.getByText("README.md");
      fireEvent.click(readmeFile);

      await waitFor(() => {
        expect(screen.getByText("📄 README.md")).toBeInTheDocument();
      });

      // Click share button
      const shareButton = screen.getByText("Share");
      fireEvent.click(shareButton);

      // Should show loading state
      expect(screen.getByText("Sharing...")).toBeInTheDocument();

      // Wait for API call to fail
      await waitFor(() => {
        expect(screen.getByText("Share")).toBeInTheDocument();
      });

      // Should not show success message
      expect(
        screen.queryByText("✓ Link copied to clipboard!"),
      ).not.toBeInTheDocument();

      // Verify error was logged
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error creating share link:",
        expect.any(Error),
      );

      consoleErrorSpy.mockRestore();
    });

    it("disables share button while creating share", async () => {
      // Create a promise we can control
      let resolveHandler: (() => void) | undefined;
      const delayedResponse = new Promise<void>((resolve) => {
        resolveHandler = resolve;
      });

      // Use MSW with delayed response
      server.use(
        http.post("*/api/share", async () => {
          await delayedResponse;
          return HttpResponse.json({
            id: "share-123",
            url: "http://localhost:3000/share/token-abc",
            token: "token-abc",
          });
        }),
      );

      render(<ProjectDetailPage />);

      await waitFor(() => {
        expect(
          screen.queryByText("Loading project files..."),
        ).not.toBeInTheDocument();
      });

      // Select a file
      const packageJson = screen.getByText("package.json");
      fireEvent.click(packageJson);

      await waitFor(() => {
        expect(screen.getByText("📄 package.json")).toBeInTheDocument();
      });

      // Click share button
      const shareButton = screen.getByText("Share").closest("button");
      fireEvent.click(shareButton!);

      // Button should be disabled during loading
      expect(screen.getByText("Sharing...").closest("button")).toHaveAttribute(
        "disabled",
      );

      // Resolve the delayed response
      resolveHandler!();

      // Wait for button to be enabled again
      await waitFor(() => {
        expect(screen.getByText("Share").closest("button")).not.toHaveAttribute(
          "disabled",
        );
      });
    });
  });
});
