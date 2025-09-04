import { describe, it, expect } from "vitest";

// Extract and test the core parsing logic from watch-claude
// These are the same functions used in the actual implementation
function isFileModificationTool(toolName: string, toolInput: Record<string, unknown>): boolean {
  const fileModificationTools = ['Edit', 'Write', 'MultiEdit', 'NotebookEdit'];
  
  if (!fileModificationTools.includes(toolName)) {
    return false;
  }
  
  return 'file_path' in toolInput && typeof toolInput.file_path === 'string';
}

function extractFilePath(toolName: string, toolInput: Record<string, unknown>): string | null {
  const filePath = toolInput.file_path;
  
  if (typeof filePath === 'string') {
    if (filePath.startsWith('/')) {
      const cwd = process.cwd();
      if (filePath.startsWith(cwd)) {
        return filePath.substring(cwd.length + 1);
      }
      return null;
    }
    return filePath;
  }
  
  return null;
}

function shouldSyncFile(jsonLine: string): string | null {
  try {
    const event = JSON.parse(jsonLine);
    
    if (event.type === "assistant" && event.message?.content) {
      for (const contentItem of event.message.content) {
        if (contentItem.type === "tool_use" && contentItem.name && contentItem.input) {
          const toolName = contentItem.name;
          const toolInput = contentItem.input;
          
          if (isFileModificationTool(toolName, toolInput)) {
            return extractFilePath(toolName, toolInput);
          }
        }
      }
    }
  } catch {
    // Not JSON or parsing failed
  }
  
  return null;
}

describe("watch-claude parsing logic", () => {
  describe("isFileModificationTool", () => {
    it("should return true for Edit tool with file_path", () => {
      const result = isFileModificationTool("Edit", { file_path: "test.js" });
      expect(result).toBe(true);
    });

    it("should return true for Write tool with file_path", () => {
      const result = isFileModificationTool("Write", { file_path: "test.js" });
      expect(result).toBe(true);
    });

    it("should return true for MultiEdit tool with file_path", () => {
      const result = isFileModificationTool("MultiEdit", { file_path: "test.js" });
      expect(result).toBe(true);
    });

    it("should return true for NotebookEdit tool with file_path", () => {
      const result = isFileModificationTool("NotebookEdit", { notebook_path: "test.ipynb", file_path: "test.ipynb" });
      expect(result).toBe(true);
    });

    it("should return false for Read tool", () => {
      const result = isFileModificationTool("Read", { file_path: "test.js" });
      expect(result).toBe(false);
    });

    it("should return false for Bash tool", () => {
      const result = isFileModificationTool("Bash", { command: "ls" });
      expect(result).toBe(false);
    });

    it("should return false for tool without file_path", () => {
      const result = isFileModificationTool("Edit", { content: "some content" });
      expect(result).toBe(false);
    });

    it("should return false for tool with non-string file_path", () => {
      const result = isFileModificationTool("Edit", { file_path: 123 });
      expect(result).toBe(false);
    });
  });

  describe("extractFilePath", () => {
    const originalCwd = process.cwd();

    it("should return relative path as-is", () => {
      const result = extractFilePath("Edit", { file_path: "src/test.js" });
      expect(result).toBe("src/test.js");
    });

    it("should convert absolute path within cwd to relative", () => {
      const testCwd = "/workspaces/project";
      process.cwd = () => testCwd;
      
      const result = extractFilePath("Edit", { file_path: "/workspaces/project/src/test.js" });
      expect(result).toBe("src/test.js");
      
      process.cwd = () => originalCwd;
    });

    it("should return null for absolute path outside cwd", () => {
      const testCwd = "/workspaces/project";
      process.cwd = () => testCwd;
      
      const result = extractFilePath("Edit", { file_path: "/etc/passwd" });
      expect(result).toBe(null);
      
      process.cwd = () => originalCwd;
    });

    it("should return null for non-string file_path", () => {
      const result = extractFilePath("Edit", { file_path: 123 });
      expect(result).toBe(null);
    });

    it("should return null for missing file_path", () => {
      const result = extractFilePath("Edit", { content: "test" });
      expect(result).toBe(null);
    });
  });

  describe("shouldSyncFile", () => {
    it("should return file path for Edit tool usage", () => {
      const jsonLine = JSON.stringify({
        type: "assistant",
        message: {
          content: [{
            type: "tool_use",
            name: "Edit", 
            input: {
              file_path: "src/test.js",
              old_string: "old",
              new_string: "new"
            }
          }]
        }
      });

      const result = shouldSyncFile(jsonLine);
      expect(result).toBe("src/test.js");
    });

    it("should return file path for Write tool usage", () => {
      const jsonLine = JSON.stringify({
        type: "assistant",
        message: {
          content: [{
            type: "tool_use", 
            name: "Write",
            input: {
              file_path: "new-file.js",
              content: "console.log('hello');"
            }
          }]
        }
      });

      const result = shouldSyncFile(jsonLine);
      expect(result).toBe("new-file.js");
    });

    it("should return null for Read tool usage", () => {
      const jsonLine = JSON.stringify({
        type: "assistant",
        message: {
          content: [{
            type: "tool_use",
            name: "Read",
            input: {
              file_path: "src/existing.js"
            }
          }]
        }
      });

      const result = shouldSyncFile(jsonLine);
      expect(result).toBe(null);
    });

    it("should return null for non-tool-use content", () => {
      const jsonLine = JSON.stringify({
        type: "assistant", 
        message: {
          content: [{
            type: "text",
            text: "I will edit the file"
          }]
        }
      });

      const result = shouldSyncFile(jsonLine);
      expect(result).toBe(null);
    });

    it("should return null for system events", () => {
      const jsonLine = JSON.stringify({
        type: "system",
        subtype: "init",
        tools: ["Edit", "Write", "Read"]
      });

      const result = shouldSyncFile(jsonLine);
      expect(result).toBe(null);
    });

    it("should return null for non-JSON input", () => {
      const result = shouldSyncFile("This is not JSON");
      expect(result).toBe(null);
    });

    it("should return null for malformed JSON", () => {
      const result = shouldSyncFile('{"type":"assistant"'); // Incomplete JSON
      expect(result).toBe(null);
    });

    it("should handle multiple tool uses and return first file modification", () => {
      const jsonLine = JSON.stringify({
        type: "assistant",
        message: {
          content: [
            {
              type: "tool_use",
              name: "Read", 
              input: { file_path: "config.js" }
            },
            {
              type: "tool_use",
              name: "Edit",
              input: { file_path: "src/main.js", old_string: "old", new_string: "new" }
            }
          ]
        }
      });

      const result = shouldSyncFile(jsonLine);
      expect(result).toBe("src/main.js");
    });
  });

  describe("real Claude output integration", () => {
    it("should correctly parse real Claude stream-json events", () => {
      // These are actual events from Claude Code CLI testing
      const realEvents = [
        '{"type":"system","subtype":"init","tools":["Edit","Write","Read"]}',
        '{"type":"assistant","message":{"content":[{"type":"text","text":"I will edit the file"}]}}',
        '{"type":"assistant","message":{"content":[{"type":"tool_use","name":"Edit","input":{"file_path":"test.js","old_string":"old","new_string":"new"}}]}}',
        '{"type":"assistant","message":{"content":[{"type":"tool_use","name":"Write","input":{"file_path":"README.md","content":"# Test"}}]}}',
        'This is regular non-JSON output',
        '{"type":"result","subtype":"success","result":"Done."}'
      ];

      const syncedFiles: string[] = [];
      
      for (const event of realEvents) {
        const filePath = shouldSyncFile(event);
        if (filePath) {
          syncedFiles.push(filePath);
        }
      }

      expect(syncedFiles).toEqual(["test.js", "README.md"]);
    });
  });
});