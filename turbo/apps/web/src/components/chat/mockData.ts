import type { Session, Turn, Block } from "./types";

export const mockSession: Session = {
  id: "session-mock-001",
  project_id: "project-123",
  title: "Mock Development Session",
  created_at: new Date(Date.now() - 3600000).toISOString(),
  updated_at: new Date().toISOString(),
  turn_ids: ["turn-001", "turn-002", "turn-003"],
};

export const mockBlocks: Block[] = [
  {
    id: "block-001",
    turn_id: "turn-001",
    type: "thinking",
    content: {
      text: "I need to analyze the user's request for adding error handling. Let me first check the existing code structure and identify where error handling should be implemented...",
    },
    sequence_number: 0,
    created_at: new Date(Date.now() - 3000000).toISOString(),
  },
  {
    id: "block-002",
    turn_id: "turn-001",
    type: "tool_use",
    content: {
      tool_name: "read_file",
      parameters: {
        path: "/src/auth/login.ts",
      },
      tool_use_id: "tool-use-001",
    },
    sequence_number: 1,
    created_at: new Date(Date.now() - 2950000).toISOString(),
  },
  {
    id: "block-003",
    turn_id: "turn-001",
    type: "tool_result",
    content: {
      tool_use_id: "tool-use-001",
      result:
        "export async function login(username: string, password: string) {\n  const response = await fetch('/api/auth/login', {\n    method: 'POST',\n    body: JSON.stringify({ username, password })\n  });\n  return response.json();\n}",
      error: null,
    },
    sequence_number: 2,
    created_at: new Date(Date.now() - 2900000).toISOString(),
  },
  {
    id: "block-004",
    turn_id: "turn-001",
    type: "content",
    content: {
      text: "I've reviewed your login function and I can see it lacks proper error handling. Let me add comprehensive error handling to make it more robust.",
    },
    sequence_number: 3,
    created_at: new Date(Date.now() - 2850000).toISOString(),
  },
  {
    id: "block-005",
    turn_id: "turn-001",
    type: "tool_use",
    content: {
      tool_name: "edit_file",
      parameters: {
        path: "/src/auth/login.ts",
        content:
          "export async function login(username: string, password: string) {\n  try {\n    const response = await fetch('/api/auth/login', {\n      method: 'POST',\n      headers: { 'Content-Type': 'application/json' },\n      body: JSON.stringify({ username, password })\n    });\n\n    if (!response.ok) {\n      throw new Error(`Login failed: ${response.statusText}`);\n    }\n\n    const data = await response.json();\n    return { success: true, data };\n  } catch (error) {\n    console.error('Login error:', error);\n    return { \n      success: false, \n      error: error instanceof Error ? error.message : 'Unknown error occurred' \n    };\n  }\n}",
      },
      tool_use_id: "tool-use-002",
    },
    sequence_number: 4,
    created_at: new Date(Date.now() - 2800000).toISOString(),
  },
  {
    id: "block-006",
    turn_id: "turn-001",
    type: "tool_result",
    content: {
      tool_use_id: "tool-use-002",
      result: "File successfully updated",
      error: null,
    },
    sequence_number: 5,
    created_at: new Date(Date.now() - 2750000).toISOString(),
  },
  {
    id: "block-007",
    turn_id: "turn-001",
    type: "content",
    content: {
      text: "I've successfully added comprehensive error handling to your login function. The improvements include:\n\n1. Wrapped the entire function in a try-catch block\n2. Added proper headers to the fetch request\n3. Checking if the response is successful before parsing\n4. Returning a consistent result object with success/error status\n5. Proper error logging\n\nThe function now handles network errors, server errors, and JSON parsing errors gracefully.",
    },
    sequence_number: 6,
    created_at: new Date(Date.now() - 2700000).toISOString(),
  },
];

export const mockTurns: Turn[] = [
  {
    id: "turn-001",
    session_id: "session-mock-001",
    user_prompt: "Add error handling to the login function",
    status: "completed",
    started_at: new Date(Date.now() - 3000000).toISOString(),
    completed_at: new Date(Date.now() - 2700000).toISOString(),
    created_at: new Date(Date.now() - 3000000).toISOString(),
    blocks: mockBlocks,
    block_count: 7,
  },
  {
    id: "turn-002",
    session_id: "session-mock-001",
    user_prompt: "Create a new React component for user profile",
    status: "completed",
    started_at: new Date(Date.now() - 2000000).toISOString(),
    completed_at: new Date(Date.now() - 1800000).toISOString(),
    created_at: new Date(Date.now() - 2000000).toISOString(),
    blocks: [
      {
        id: "block-008",
        turn_id: "turn-002",
        type: "content",
        content: {
          text: "I'll create a new React component for the user profile. This will include the user's avatar, name, bio, and basic information.",
        },
        sequence_number: 0,
        created_at: new Date(Date.now() - 1950000).toISOString(),
      },
      {
        id: "block-009",
        turn_id: "turn-002",
        type: "tool_use",
        content: {
          tool_name: "create_file",
          parameters: {
            path: "/src/components/UserProfile.tsx",
            content:
              "import React from 'react';\n\ninterface UserProfileProps {\n  user: {\n    id: string;\n    name: string;\n    email: string;\n    avatar?: string;\n    bio?: string;\n  };\n}\n\nexport function UserProfile({ user }: UserProfileProps) {\n  return (\n    <div className=\"user-profile\">\n      <img src={user.avatar || '/default-avatar.png'} alt={user.name} />\n      <h2>{user.name}</h2>\n      <p>{user.email}</p>\n      {user.bio && <p>{user.bio}</p>}\n    </div>\n  );\n}",
          },
          tool_use_id: "tool-use-003",
        },
        sequence_number: 1,
        created_at: new Date(Date.now() - 1900000).toISOString(),
      },
      {
        id: "block-010",
        turn_id: "turn-002",
        type: "tool_result",
        content: {
          tool_use_id: "tool-use-003",
          result: "File created successfully",
          error: null,
        },
        sequence_number: 2,
        created_at: new Date(Date.now() - 1850000).toISOString(),
      },
    ],
    block_count: 3,
  },
  {
    id: "turn-003",
    session_id: "session-mock-001",
    user_prompt: "Run tests and fix any issues",
    status: "running",
    started_at: new Date(Date.now() - 30000).toISOString(),
    created_at: new Date(Date.now() - 30000).toISOString(),
    blocks: [
      {
        id: "block-011",
        turn_id: "turn-003",
        type: "thinking",
        content: {
          text: "I need to run the test suite and check for any failures. Let me start by running the tests...",
        },
        sequence_number: 0,
        created_at: new Date(Date.now() - 25000).toISOString(),
      },
      {
        id: "block-012",
        turn_id: "turn-003",
        type: "tool_use",
        content: {
          tool_name: "run_command",
          parameters: {
            command: "npm test",
          },
          tool_use_id: "tool-use-004",
        },
        sequence_number: 1,
        created_at: new Date(Date.now() - 20000).toISOString(),
      },
    ],
    block_count: 2,
  },
  {
    id: "turn-004",
    session_id: "session-mock-001",
    user_prompt: "Deploy to production",
    status: "failed",
    started_at: new Date(Date.now() - 1000000).toISOString(),
    completed_at: new Date(Date.now() - 950000).toISOString(),
    created_at: new Date(Date.now() - 1000000).toISOString(),
    blocks: [
      {
        id: "block-013",
        turn_id: "turn-004",
        type: "tool_use",
        content: {
          tool_name: "run_command",
          parameters: {
            command: "npm run deploy",
          },
          tool_use_id: "tool-use-005",
        },
        sequence_number: 0,
        created_at: new Date(Date.now() - 980000).toISOString(),
      },
      {
        id: "block-014",
        turn_id: "turn-004",
        type: "tool_result",
        content: {
          tool_use_id: "tool-use-005",
          result: "",
          error:
            "Error: Deployment failed - Missing environment variables: API_KEY, DATABASE_URL",
        },
        sequence_number: 1,
        created_at: new Date(Date.now() - 960000).toISOString(),
      },
    ],
    block_count: 2,
  },
  {
    id: "turn-005",
    session_id: "session-mock-001",
    user_prompt: "Check the build status",
    status: "pending",
    created_at: new Date(Date.now() - 5000).toISOString(),
    blocks: [],
    block_count: 0,
  },
];

export function getMockTurnsWithVariableBlocks(turnCount: number = 5): Turn[] {
  const turns: Turn[] = [];
  const statuses: Turn["status"][] = [
    "completed",
    "running",
    "failed",
    "pending",
  ];

  for (let i = 0; i < turnCount; i++) {
    const status: Turn["status"] = statuses[i % statuses.length] || "pending";
    const turnId = `turn-${i + 1}`;
    const blocks: Block[] = [];

    if (status !== "pending") {
      const blockCount = Math.floor(Math.random() * 5) + 1;
      for (let j = 0; j < blockCount; j++) {
        const blockTypes: Block["type"][] = [
          "thinking",
          "content",
          "tool_use",
          "tool_result",
        ];
        const blockType: Block["type"] =
          blockTypes[Math.floor(Math.random() * blockTypes.length)] ||
          "content";

        let content: Block["content"];
        switch (blockType) {
          case "thinking":
            content = {
              text: `Thinking about step ${j + 1} of turn ${i + 1}...`,
            };
            break;
          case "content":
            content = {
              text: `Response content for step ${j + 1} of turn ${i + 1}`,
            };
            break;
          case "tool_use":
            content = {
              tool_name: "example_tool",
              parameters: { param: `value_${j}` },
              tool_use_id: `tool-${i}-${j}`,
            };
            break;
          case "tool_result":
            content = {
              tool_use_id: `tool-${i}-${j}`,
              result: `Result of tool execution ${j}`,
              error: Math.random() > 0.8 ? "Random error occurred" : null,
            };
            break;
          default:
            content = { text: `Unknown block type` };
            break;
        }

        blocks.push({
          id: `block-${i}-${j}`,
          turn_id: turnId,
          type: blockType,
          content,
          sequence_number: j,
          created_at: new Date(
            Date.now() - (1000000 - i * 100000 - j * 10000),
          ).toISOString(),
        });
      }
    }

    const startTime = Date.now() - (1000000 - i * 100000);
    const endTime =
      status === "completed" || status === "failed"
        ? startTime + Math.floor(Math.random() * 60000) + 10000
        : undefined;

    turns.push({
      id: turnId,
      session_id: "session-mock-dynamic",
      user_prompt: `User request number ${i + 1}`,
      status,
      started_at:
        status !== "pending" ? new Date(startTime).toISOString() : undefined,
      completed_at: endTime ? new Date(endTime).toISOString() : undefined,
      created_at: new Date(startTime).toISOString(),
      blocks,
      block_count: blocks.length,
    });
  }

  return turns;
}
