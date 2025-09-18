import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { initServices } from "../../../../../../../src/lib/init-services";
import {
  SESSIONS_TBL,
  TURNS_TBL,
  BLOCKS_TBL,
} from "../../../../../../../src/db/schema/sessions";
import { PROJECTS_TBL } from "../../../../../../../src/db/schema/projects";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "crypto";
import { writeFileToYjs } from "../../../../../../../src/lib/yjs-file-writer";

interface MockBlock {
  type: "thinking" | "content" | "tool_use" | "tool_result";
  content: Record<string, unknown>;
  delay?: number; // milliseconds to wait before creating this block
}

/**
 * POST /api/projects/:projectId/sessions/:sessionId/mock-execute
 * Mock Claude execution for testing purposes
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ projectId: string; sessionId: string }> },
) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  initServices();
  const { projectId, sessionId } = await context.params;

  // Verify project exists and belongs to user
  const [project] = await globalThis.services.db
    .select()
    .from(PROJECTS_TBL)
    .where(
      and(eq(PROJECTS_TBL.id, projectId), eq(PROJECTS_TBL.userId, userId)),
    );

  if (!project) {
    return NextResponse.json({ error: "project_not_found" }, { status: 404 });
  }

  // Verify session exists
  const [session] = await globalThis.services.db
    .select()
    .from(SESSIONS_TBL)
    .where(
      and(
        eq(SESSIONS_TBL.id, sessionId),
        eq(SESSIONS_TBL.projectId, projectId),
      ),
    );

  if (!session) {
    return NextResponse.json({ error: "session_not_found" }, { status: 404 });
  }

  // Parse request body
  const body = await request.json();
  const { user_message } = body;

  if (!user_message) {
    return NextResponse.json(
      { error: "user_message_required" },
      { status: 400 },
    );
  }

  // Create new turn
  const turnId = `turn_${randomUUID()}`;
  const [newTurn] = await globalThis.services.db
    .insert(TURNS_TBL)
    .values({
      id: turnId,
      sessionId,
      userPrompt: user_message,
      status: "pending",
    })
    .returning();

  if (!newTurn) {
    return NextResponse.json(
      { error: "failed_to_create_turn" },
      { status: 500 },
    );
  }

  // Start async mock execution
  executeMockClaudeAsync(turnId, projectId, userId, user_message).catch((error) => {
    console.error("Mock execution failed:", error);
  });

  return NextResponse.json({
    id: newTurn.id,
    session_id: newTurn.sessionId,
    user_message: newTurn.userPrompt,
    status: "pending",
    created_at: newTurn.createdAt.toISOString(),
    is_mock: true,
  });
}

async function executeMockClaudeAsync(turnId: string, projectId: string, userId: string, userMessage: string) {
  try {
    // Update status to in_progress
    await globalThis.services.db
      .update(TURNS_TBL)
      .set({
        status: "in_progress",
        startedAt: new Date(),
      })
      .where(eq(TURNS_TBL.id, turnId));

    // Generate mock blocks based on the user message
    const mockBlocks = generateMockBlocks(userMessage);

    // Create blocks with delays to simulate real-time execution
    let sequenceNumber = 0;
    let shouldWriteFile = false;

    for (const mockBlock of mockBlocks) {
      // Wait for specified delay
      if (mockBlock.delay) {
        await new Promise((resolve) => setTimeout(resolve, mockBlock.delay));
      }

      // Check if this is a write_file tool use and should actually write to YJS
      if (mockBlock.type === "tool_use" &&
          mockBlock.content.tool_name === "write_file" &&
          (userMessage.toLowerCase().includes("readme") ||
           userMessage.toLowerCase().includes("document") ||
           userMessage.toLowerCase().includes("create file"))) {
        shouldWriteFile = true;
      }

      // Create block
      await globalThis.services.db.insert(BLOCKS_TBL).values({
        id: `block_${randomUUID()}`,
        turnId,
        type: mockBlock.type,
        content: mockBlock.content,
        sequenceNumber: sequenceNumber++,
      });

      // Actually write file to YJS if this is a write_file tool_use
      if (shouldWriteFile && mockBlock.type === "tool_use" &&
          mockBlock.content.tool_name === "write_file") {
        try {
          const params = mockBlock.content.parameters as { path: string; content: string };
          await writeFileToYjs(projectId, userId, params.path, params.content);

          // Update the following tool_result block to reflect successful YJS write
          const nextBlock = mockBlocks[sequenceNumber];
          if (nextBlock && nextBlock.type === "tool_result") {
            nextBlock.content = {
              ...nextBlock.content,
              result: `File '${params.path}' written to YJS filesystem successfully. The file is now visible in the file explorer!`,
            };
          }
        } catch (error) {
          console.error("Failed to write file to YJS:", error);
          // Update the following tool_result block to reflect the error
          const nextBlock = mockBlocks[sequenceNumber];
          if (nextBlock && nextBlock.type === "tool_result") {
            nextBlock.content = {
              ...nextBlock.content,
              error: `Failed to write file to YJS filesystem: ${error instanceof Error ? error.message : "Unknown error"}`,
              result: null,
            };
          }
        }
        shouldWriteFile = false;
      }
    }

    // Mark turn as completed
    await globalThis.services.db
      .update(TURNS_TBL)
      .set({
        status: "completed",
        completedAt: new Date(),
      })
      .where(eq(TURNS_TBL.id, turnId));
  } catch (error) {
    // Mark turn as failed
    await globalThis.services.db
      .update(TURNS_TBL)
      .set({
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "Unknown error",
        completedAt: new Date(),
      })
      .where(eq(TURNS_TBL.id, turnId));

    throw error;
  }
}

function generateMockBlocks(userMessage: string): MockBlock[] {
  const lowerMessage = userMessage.toLowerCase();

  // Different response patterns based on user message
  if (lowerMessage.includes("hello") || lowerMessage.includes("hi")) {
    return [
      {
        type: "thinking",
        content: {
          text: "The user is greeting me. I should respond politely.",
        },
        delay: 500,
      },
      {
        type: "content",
        content: { text: "Hello! How can I help you today?" },
        delay: 1000,
      },
    ];
  }

  if (lowerMessage.includes("file") || lowerMessage.includes("read")) {
    return [
      {
        type: "thinking",
        content: {
          text: "The user wants to work with files. Let me check what files are available.",
        },
        delay: 500,
      },
      {
        type: "tool_use",
        content: {
          tool_name: "list_files",
          parameters: { path: "/workspace" },
          tool_use_id: `tool_${randomUUID()}`,
        },
        delay: 1000,
      },
      {
        type: "tool_result",
        content: {
          tool_use_id: `tool_${randomUUID()}`,
          result:
            "Files found:\n- README.md\n- package.json\n- src/\n  - index.ts\n  - utils.ts",
          error: null,
        },
        delay: 500,
      },
      {
        type: "content",
        content: {
          text: "I found several files in your workspace. Would you like me to read any specific file?",
        },
        delay: 500,
      },
    ];
  }

  if (lowerMessage.includes("readme") || lowerMessage.includes("document") || lowerMessage.includes("create file")) {
    return [
      {
        type: "thinking",
        content: {
          text: "The user wants me to create a README or documentation file. I'll write a README.md file to the YJS filesystem so it appears in the file explorer.",
        },
        delay: 500,
      },
      {
        type: "content",
        content: {
          text: "I'll create a README.md file for your project. This will be written to the YJS filesystem and should appear in your file explorer!",
        },
        delay: 1000,
      },
      {
        type: "tool_use",
        content: {
          tool_name: "write_file",
          parameters: {
            path: "README.md",
            content: `# ${lowerMessage.includes("project") ? "Project" : "My"} README

This is a README file created by Claude Code through the mock execution system!

## Features

- ✅ Created via YJS filesystem integration
- ✅ Appears in the file explorer in real-time
- ✅ Demonstrates the connection between Claude execution and file synchronization

## How it works

1. User sends a message to Claude
2. Mock execution processes the request
3. File is written to YJS document and blob storage
4. Frontend file explorer automatically updates via YJS synchronization

## Generated at

${new Date().toLocaleString()}

---

This demonstrates the full integration between:
- Frontend chat interface
- Mock execution backend
- YJS filesystem
- Real-time file synchronization

Pretty cool! 🚀`,
          },
          tool_use_id: `tool_${randomUUID()}`,
        },
        delay: 1500,
      },
      {
        type: "tool_result",
        content: {
          tool_use_id: `tool_${randomUUID()}`,
          result: "File 'README.md' will be written to YJS filesystem...",
          error: null,
        },
        delay: 500,
      },
      {
        type: "content",
        content: {
          text: "Perfect! I've created a comprehensive README.md file that demonstrates the YJS filesystem integration. The file should now be visible in your project's file explorer on the left. This shows the complete flow from chat interface → mock execution → YJS filesystem → real-time frontend updates!",
        },
        delay: 800,
      },
    ];
  }

  if (lowerMessage.includes("code") || lowerMessage.includes("write")) {
    return [
      {
        type: "thinking",
        content: {
          text: "The user wants me to write code. Let me understand what they need.",
        },
        delay: 500,
      },
      {
        type: "content",
        content: {
          text: "I'll help you write code. Let me create a simple example:",
        },
        delay: 1000,
      },
      {
        type: "tool_use",
        content: {
          tool_name: "write_file",
          parameters: {
            path: "example.ts",
            content: `// Example TypeScript file
function greet(name: string): string {
  return \`Hello, \${name}!\`;
}

export { greet };`,
          },
          tool_use_id: `tool_${randomUUID()}`,
        },
        delay: 1500,
      },
      {
        type: "tool_result",
        content: {
          tool_use_id: `tool_${randomUUID()}`,
          result: "File 'example.ts' created successfully",
          error: null,
        },
        delay: 500,
      },
      {
        type: "content",
        content: {
          text: "I've created an example TypeScript file with a simple greeting function. The file has been saved as `example.ts`.",
        },
        delay: 500,
      },
    ];
  }

  if (lowerMessage.includes("error") || lowerMessage.includes("bug")) {
    return [
      {
        type: "thinking",
        content: {
          text: "The user is reporting an error or bug. I should help them debug.",
        },
        delay: 500,
      },
      {
        type: "content",
        content: {
          text: "I'll help you debug this issue. Let me check for common problems:",
        },
        delay: 1000,
      },
      {
        type: "tool_use",
        content: {
          tool_name: "run_command",
          parameters: { command: "npm test" },
          tool_use_id: `tool_${randomUUID()}`,
        },
        delay: 1500,
      },
      {
        type: "tool_result",
        content: {
          tool_use_id: `tool_${randomUUID()}`,
          result: "Tests completed:\n✓ All tests passed (5/5)",
          error: null,
        },
        delay: 1000,
      },
      {
        type: "content",
        content: {
          text: "Good news! All tests are passing. The error might be in a different part of the code. Can you provide more details about the specific error you're encountering?",
        },
        delay: 500,
      },
    ];
  }

  // Default response for other messages
  return [
    {
      type: "thinking",
      content: {
        text: `Processing the request: "${userMessage}". Let me analyze what needs to be done.`,
      },
      delay: 800,
    },
    {
      type: "content",
      content: {
        text: "I understand your request. Let me help you with that.",
      },
      delay: 1000,
    },
    {
      type: "tool_use",
      content: {
        tool_name: "analyze_request",
        parameters: { query: userMessage },
        tool_use_id: `tool_${randomUUID()}`,
      },
      delay: 1200,
    },
    {
      type: "tool_result",
      content: {
        tool_use_id: `tool_${randomUUID()}`,
        result: "Analysis complete. Ready to proceed with implementation.",
        error: null,
      },
      delay: 500,
    },
    {
      type: "content",
      content: {
        text: `Based on your request "${userMessage}", I've analyzed the requirements. This is a mock response demonstrating the execution flow. In a real scenario, I would perform the actual requested task here.`,
      },
      delay: 800,
    },
    {
      type: "content",
      content: {
        text: "Task completed successfully! Is there anything else you'd like me to help with?",
      },
      delay: 500,
    },
  ];
}
