import { initServices } from "../../../../../../../src/lib/init-services";
import {
  TURNS_TBL,
  BLOCKS_TBL,
} from "../../../../../../../src/db/schema/sessions";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { writeFileToYjs } from "../../../../../../../src/lib/yjs-file-writer";

interface MockExecutionParams {
  turnId: string;
  sessionId: string;
  projectId: string;
  userMessage: string;
  userId: string;
}

interface MockBlock {
  type: "thinking" | "content" | "tool_use" | "tool_result";
  content: Record<string, unknown>;
  delay?: number;
}

/**
 * Triggers mock execution for a turn
 * This simulates Claude's response with realistic blocks
 */
export async function triggerMockExecution(params: MockExecutionParams) {
  const { turnId, projectId, userMessage, userId } = params;

  initServices();
  const db = globalThis.services.db;

  try {
    // Update turn status to in_progress
    await db
      .update(TURNS_TBL)
      .set({
        status: "in_progress",
        startedAt: new Date(),
      })
      .where(eq(TURNS_TBL.id, turnId));

    // Determine mock blocks based on user message
    const mockBlocks = generateMockBlocks(userMessage, projectId);

    // Create blocks with delays to simulate streaming
    let sequenceNumber = 0;
    for (const mockBlock of mockBlocks) {
      if (mockBlock.delay) {
        await new Promise((resolve) => setTimeout(resolve, mockBlock.delay));
      }

      const blockId = `block_${randomUUID()}`;
      await db.insert(BLOCKS_TBL).values({
        id: blockId,
        turnId,
        type: mockBlock.type,
        content: mockBlock.content,
        sequenceNumber: sequenceNumber++,
      });

      // Handle file creation if it's a tool_result for creating files
      if (
        mockBlock.type === "tool_result" &&
        mockBlock.content.tool === "create_file"
      ) {
        const result = mockBlock.content.result as {
          path?: string;
          content?: string;
        };
        if (result.path && result.content) {
          try {
            await writeFileToYjs(
              projectId,
              userId,
              result.path,
              result.content,
            );
          } catch (err) {
            console.error("Failed to write file to YJS:", err);
          }
        }
      }
    }

    // Update turn status to completed
    await db
      .update(TURNS_TBL)
      .set({
        status: "completed",
        completedAt: new Date(),
      })
      .where(eq(TURNS_TBL.id, turnId));
  } catch (error) {
    console.error("Mock execution failed:", error);

    // Update turn status to failed
    await db
      .update(TURNS_TBL)
      .set({
        status: "failed",
        completedAt: new Date(),
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      })
      .where(eq(TURNS_TBL.id, turnId));

    throw error;
  }
}

function generateMockBlocks(
  userMessage: string,
  projectId: string,
): MockBlock[] {
  const message = userMessage.toLowerCase();
  const blocks: MockBlock[] = [];

  // Check if user wants to create a file
  if (
    message.includes("create") &&
    (message.includes("readme") ||
      message.includes("file") ||
      message.includes("document"))
  ) {
    // Generate blocks for file creation
    blocks.push(
      {
        type: "thinking",
        content: {
          text: "I'll help you create a README file for this project. Let me generate comprehensive documentation based on the project context.",
        },
        delay: 500,
      },
      {
        type: "content",
        content: {
          text: "I'll create a comprehensive README file for your project with all the essential sections.",
        },
        delay: 1000,
      },
      {
        type: "tool_use",
        content: {
          tool: "create_file",
          parameters: {
            path: "README.md",
            content: generateReadmeContent(projectId),
          },
        },
        delay: 1500,
      },
      {
        type: "tool_result",
        content: {
          tool: "create_file",
          result: {
            success: true,
            path: "README.md",
            content: generateReadmeContent(projectId),
            message: "File created successfully",
          },
        },
        delay: 2000,
      },
      {
        type: "content",
        content: {
          text: "I've created a README.md file with comprehensive documentation for your project. The file includes sections for project overview, installation, usage, features, and more. You can now see it in the file explorer.",
        },
        delay: 2500,
      },
    );
  } else if (message.includes("analyze") || message.includes("explain")) {
    // Generate blocks for code analysis
    blocks.push(
      {
        type: "thinking",
        content: {
          text: "Let me analyze the project structure and provide insights...",
        },
        delay: 500,
      },
      {
        type: "content",
        content: {
          text: `Based on my analysis of the project:\n\n1. **Architecture**: This appears to be a Next.js application with TypeScript\n2. **Key Features**: Session management, turn-based conversations, and real-time updates\n3. **Database**: Using Drizzle ORM with PostgreSQL\n4. **Authentication**: Clerk for user authentication\n\nThe project follows a clean architecture pattern with clear separation of concerns.`,
        },
        delay: 1500,
      },
    );
  } else {
    // Default response
    blocks.push(
      {
        type: "thinking",
        content: {
          text: "Processing your request...",
        },
        delay: 500,
      },
      {
        type: "content",
        content: {
          text: `I understand you want to: "${userMessage}"\n\nI'm here to help! This is a mock response demonstrating the chat interface. In production, this would connect to Claude for real AI assistance.\n\nYou can try asking me to:\n- Create a README file\n- Analyze the project structure\n- Explain the codebase`,
        },
        delay: 1000,
      },
    );
  }

  return blocks;
}

function generateReadmeContent(projectId: string): string {
  return `# Project ${projectId}

## Overview

This is an AI-powered development environment that integrates with Claude for intelligent code assistance. The project uses modern web technologies to provide a seamless development experience.

## Features

- 🤖 **AI-Powered Assistance**: Integrated with Claude for intelligent code generation and analysis
- 📁 **File Management**: Real-time file synchronization with YJS
- 🔄 **Live Updates**: Automatic polling for real-time updates
- 🔐 **Secure Authentication**: Built-in authentication with Clerk
- 📊 **Session Management**: Track and manage AI conversation sessions

## Installation

\`\`\`bash
# Clone the repository
git clone [repository-url]

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env.local

# Run the development server
pnpm dev
\`\`\`

## Usage

1. Start the development server
2. Navigate to the project dashboard
3. Create or select a project
4. Use the chat interface to interact with Claude
5. View and edit files in real-time

## Project Structure

\`\`\`
├── app/              # Next.js app directory
├── components/       # React components
├── lib/             # Utility functions and libraries
├── api/             # API routes
└── public/          # Static assets
\`\`\`

## Technologies

- **Frontend**: Next.js, React, TypeScript
- **Backend**: Node.js, PostgreSQL
- **ORM**: Drizzle
- **Authentication**: Clerk
- **Real-time Sync**: YJS
- **AI Integration**: Claude API

## Contributing

Contributions are welcome! Please read the contributing guidelines before submitting PRs.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

---

Generated with AI assistance 🤖
`;
}
