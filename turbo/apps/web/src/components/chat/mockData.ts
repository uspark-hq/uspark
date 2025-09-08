import type {
  SessionWithTurns,
  TurnWithBlocks,
  BlockWithParsedContent,
} from "./types";

export const mockSession: SessionWithTurns = {
  id: "sess_mock-001",
  projectId: "proj_123",
  title: "Mock Development Session",
  createdAt: new Date(Date.now() - 3600000).toISOString(),
  updatedAt: new Date().toISOString(),
};

export const mockBlocks: BlockWithParsedContent[] = [
  {
    id: "block_001",
    turnId: "turn_001",
    type: "thinking",
    content: {
      text: "I need to analyze the user's request for adding error handling. Let me first check the existing code structure and identify where error handling should be implemented...",
    },
    sequenceNumber: 0,
    createdAt: new Date(Date.now() - 3000000).toISOString(),
  },
  {
    id: "block_002",
    turnId: "turn_001",
    type: "tool_use",
    content: {
      tool_name: "read_file",
      parameters: {
        path: "/src/auth/login.ts",
      },
      tool_use_id: "tool-use-001",
    },
    sequenceNumber: 1,
    createdAt: new Date(Date.now() - 2950000).toISOString(),
  },
  {
    id: "block_003",
    turnId: "turn_001",
    type: "tool_result",
    content: {
      tool_use_id: "tool-use-001",
      result:
        "export async function login(username: string, password: string) {\n  const response = await fetch('/api/auth/login', {\n    method: 'POST',\n    body: JSON.stringify({ username, password })\n  });\n  return response.json();\n}",
      error: null,
    },
    sequenceNumber: 2,
    createdAt: new Date(Date.now() - 2900000).toISOString(),
  },
  {
    id: "block_004",
    turnId: "turn_001",
    type: "content",
    content: {
      text: "I've reviewed your login function and I can see it lacks proper error handling. Let me add comprehensive error handling to make it more robust.",
    },
    sequenceNumber: 3,
    createdAt: new Date(Date.now() - 2850000).toISOString(),
  },
  {
    id: "block_005",
    turnId: "turn_001",
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
    sequenceNumber: 4,
    createdAt: new Date(Date.now() - 2800000).toISOString(),
  },
  {
    id: "block_006",
    turnId: "turn_001",
    type: "tool_result",
    content: {
      tool_use_id: "tool-use-002",
      result: "File successfully updated",
      error: null,
    },
    sequenceNumber: 5,
    createdAt: new Date(Date.now() - 2750000).toISOString(),
  },
  {
    id: "block_007",
    turnId: "turn_001",
    type: "content",
    content: {
      text: "I've successfully added comprehensive error handling to your login function. The improvements include:\n\n1. Wrapped the entire function in a try-catch block\n2. Added proper headers to the fetch request\n3. Checking if the response is successful before parsing\n4. Returning a consistent result object with success/error status\n5. Proper error logging\n\nThe function now handles network errors, server errors, and JSON parsing errors gracefully.",
    },
    sequenceNumber: 6,
    createdAt: new Date(Date.now() - 2700000).toISOString(),
  },
];

export const mockTurns: TurnWithBlocks[] = [
  {
    id: "turn_001",
    sessionId: "sess_mock-001",
    userPrompt: "Add error handling to the login function",
    status: "completed",
    startedAt: new Date(Date.now() - 3000000).toISOString(),
    completedAt: new Date(Date.now() - 2700000).toISOString(),
    errorMessage: null,
    createdAt: new Date(Date.now() - 3000000).toISOString(),
    blocks: mockBlocks,
    block_count: 7,
  },
  {
    id: "turn_002",
    sessionId: "sess_mock-001",
    userPrompt: "Create a new React component for user profile",
    status: "completed",
    startedAt: new Date(Date.now() - 2000000).toISOString(),
    completedAt: new Date(Date.now() - 1800000).toISOString(),
    errorMessage: null,
    createdAt: new Date(Date.now() - 2000000).toISOString(),
    blocks: [
      {
        id: "block_008",
        turnId: "turn_002",
        type: "content",
        content: {
          text: "I'll create a new React component for the user profile. This will include the user's avatar, name, bio, and basic information.",
        },
        sequenceNumber: 0,
        createdAt: new Date(Date.now() - 1950000).toISOString(),
      },
      {
        id: "block_009",
        turnId: "turn_002",
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
        sequenceNumber: 1,
        createdAt: new Date(Date.now() - 1900000).toISOString(),
      },
      {
        id: "block_010",
        turnId: "turn_002",
        type: "tool_result",
        content: {
          tool_use_id: "tool-use-003",
          result: "File created successfully",
          error: null,
        },
        sequenceNumber: 2,
        createdAt: new Date(Date.now() - 1850000).toISOString(),
      },
    ],
    block_count: 3,
  },
  {
    id: "turn_003",
    sessionId: "sess_mock-001",
    userPrompt: "Run tests and fix any issues",
    status: "running",
    startedAt: new Date(Date.now() - 30000).toISOString(),
    completedAt: null,
    errorMessage: null,
    createdAt: new Date(Date.now() - 30000).toISOString(),
    blocks: [
      {
        id: "block_011",
        turnId: "turn_003",
        type: "thinking",
        content: {
          text: "I need to run the test suite and check for any failures. Let me start by running the tests...",
        },
        sequenceNumber: 0,
        createdAt: new Date(Date.now() - 25000).toISOString(),
      },
      {
        id: "block_012",
        turnId: "turn_003",
        type: "tool_use",
        content: {
          tool_name: "run_command",
          parameters: {
            command: "npm test",
          },
          tool_use_id: "tool-use-004",
        },
        sequenceNumber: 1,
        createdAt: new Date(Date.now() - 20000).toISOString(),
      },
    ],
    block_count: 2,
  },
  {
    id: "turn_004",
    sessionId: "sess_mock-001",
    userPrompt: "Deploy to production",
    status: "failed",
    startedAt: new Date(Date.now() - 1000000).toISOString(),
    completedAt: new Date(Date.now() - 950000).toISOString(),
    errorMessage: "Deployment failed - Missing environment variables",
    createdAt: new Date(Date.now() - 1000000).toISOString(),
    blocks: [
      {
        id: "block_013",
        turnId: "turn_004",
        type: "tool_use",
        content: {
          tool_name: "run_command",
          parameters: {
            command: "npm run deploy",
          },
          tool_use_id: "tool-use-005",
        },
        sequenceNumber: 0,
        createdAt: new Date(Date.now() - 980000).toISOString(),
      },
      {
        id: "block_014",
        turnId: "turn_004",
        type: "tool_result",
        content: {
          tool_use_id: "tool-use-005",
          result: "",
          error:
            "Error: Deployment failed - Missing environment variables: API_KEY, DATABASE_URL",
        },
        sequenceNumber: 1,
        createdAt: new Date(Date.now() - 960000).toISOString(),
      },
    ],
    block_count: 2,
  },
  {
    id: "turn_005",
    sessionId: "sess_mock-001",
    userPrompt: "Check the build status",
    status: "pending",
    startedAt: null,
    completedAt: null,
    errorMessage: null,
    createdAt: new Date(Date.now() - 5000).toISOString(),
    blocks: [],
    block_count: 0,
  },
];

export function getMockTurnsWithVariableBlocks(
  turnCount: number = 5,
): TurnWithBlocks[] {
  const turns: TurnWithBlocks[] = [];
  const statuses: Array<TurnWithBlocks["status"]> = [
    "completed",
    "running",
    "failed",
    "pending",
  ];

  for (let i = 0; i < turnCount; i++) {
    const status: TurnWithBlocks["status"] =
      statuses[i % statuses.length] || "pending";
    const turnId = `turn_${i + 1}`;
    const blocks: BlockWithParsedContent[] = [];

    if (status !== "pending") {
      const blockCount = Math.floor(Math.random() * 5) + 1;
      for (let j = 0; j < blockCount; j++) {
        const blockTypes: Array<BlockWithParsedContent["type"]> = [
          "thinking",
          "content",
          "tool_use",
          "tool_result",
        ];
        const blockType: BlockWithParsedContent["type"] =
          blockTypes[Math.floor(Math.random() * blockTypes.length)] ||
          "content";

        let content: BlockWithParsedContent["content"];
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
          id: `block_${i}_${j}`,
          turnId: turnId,
          type: blockType,
          content,
          sequenceNumber: j,
          createdAt: new Date(
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
      sessionId: "sess_mock-dynamic",
      userPrompt: `User request number ${i + 1}`,
      status,
      startedAt:
        status !== "pending" ? new Date(startTime).toISOString() : null,
      completedAt: endTime ? new Date(endTime).toISOString() : null,
      errorMessage: status === "failed" ? "Simulated error" : null,
      createdAt: new Date(startTime).toISOString(),
      blocks,
      block_count: blocks.length,
    });
  }

  return turns;
}
