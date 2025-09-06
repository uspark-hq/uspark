export interface Session {
  id: string;
  project_id: string;
  title?: string;
  created_at: string;
  updated_at: string;
  turn_ids?: string[];
}

export interface Turn {
  id: string;
  session_id: string;
  user_prompt: string;
  status: "pending" | "running" | "completed" | "failed";
  started_at?: string;
  completed_at?: string;
  created_at: string;
  blocks?: Block[];
  block_ids?: string[];
  block_count?: number;
}

export interface Block {
  id: string;
  turn_id: string;
  type: "thinking" | "content" | "tool_use" | "tool_result";
  content: ThinkingContent | TextContent | ToolUseContent | ToolResultContent;
  sequence_number: number;
  created_at?: string;
}

export interface ThinkingContent {
  text: string;
}

export interface TextContent {
  text: string;
}

export interface ToolUseContent {
  tool_name: string;
  parameters: Record<string, unknown>;
  tool_use_id: string;
}

export interface ToolResultContent {
  tool_use_id: string;
  result: string;
  error?: string | null;
}

export interface SessionUpdates {
  session: {
    id: string;
    updated_at: string;
  };
  new_turn_ids?: string[];
  updated_turns?: {
    id: string;
    status: Turn["status"];
    new_block_ids?: string[];
    block_count: number;
  }[];
  has_active_turns: boolean;
}
