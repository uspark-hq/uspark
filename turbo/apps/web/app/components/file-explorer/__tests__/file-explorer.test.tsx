import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FileExplorer } from "../file-explorer";
import { buildFileTree } from "../utils";
import { type FileItem } from "../types";

describe("FileExplorer", () => {
  const mockFiles: FileItem[] = [
    {
      path: "src",
      type: "directory",
      children: [
        {
          path: "src/components",
          type: "directory",
          children: [
            {
              path: "src/components/button.tsx",
              type: "file",
              size: 1024,
            },
          ],
        },
        {
          path: "src/index.ts",
          type: "file",
          size: 512,
        },
      ],
    },
    {
      path: "package.json",
      type: "file",
      size: 2048,
    },
  ];

  it("renders without crashing", () => {
    render(<FileExplorer files={mockFiles} />);
    expect(screen.getByText("src")).toBeInTheDocument();
    expect(screen.getByText("package.json")).toBeInTheDocument();
  });

  it("calls onFileSelect when file is clicked", () => {
    const mockOnFileSelect = vi.fn();
    render(<FileExplorer files={mockFiles} onFileSelect={mockOnFileSelect} />);

    fireEvent.click(screen.getByText("package.json"));
    expect(mockOnFileSelect).toHaveBeenCalledWith("package.json");
  });

  it("expands and collapses directories", () => {
    render(<FileExplorer files={mockFiles} />);

    // Initially, nested files should not be visible
    expect(screen.queryByText("index.ts")).not.toBeInTheDocument();

    // Click to expand directory
    fireEvent.click(screen.getByText("src"));
    expect(screen.getByText("index.ts")).toBeInTheDocument();
    expect(screen.getByText("components")).toBeInTheDocument();

    // Click again to collapse
    fireEvent.click(screen.getByText("src"));
    expect(screen.queryByText("index.ts")).not.toBeInTheDocument();
  });
});

describe("buildFileTree utility", () => {
  it("builds correct tree structure from flat file list", () => {
    const flatFiles = [
      { path: "src/index.ts", type: "file" as const, size: 512 },
      { path: "src/components/button.tsx", type: "file" as const, size: 1024 },
      { path: "package.json", type: "file" as const, size: 2048 },
    ];

    const tree = buildFileTree(flatFiles);

    expect(tree).toHaveLength(2); // src directory and package.json
    expect(tree[0]?.path).toBe("src");
    expect(tree[0]?.type).toBe("directory");
    expect(tree[0]?.children).toHaveLength(2); // index.ts and components directory
    expect(tree[1]?.path).toBe("package.json");
    expect(tree[1]?.type).toBe("file");
  });

  it("sorts directories before files", () => {
    const flatFiles = [
      { path: "README.md", type: "file" as const },
      { path: "src/index.ts", type: "file" as const },
      { path: "package.json", type: "file" as const },
    ];

    const tree = buildFileTree(flatFiles);

    expect(tree[0]?.path).toBe("src"); // Directory first
    expect(tree[0]?.type).toBe("directory");
    expect(tree[1]?.path).toBe("package.json"); // Files after directories, alphabetically
    expect(tree[2]?.path).toBe("README.md");
  });
});
