// Re-export types from the database schema for consistency
export type {
  Session,
  Turn,
  Block,
  ThinkingBlockContent as ThinkingContent,
  ContentBlockContent as TextContent,
  ToolUseBlockContent as ToolUseContent,
  ToolResultBlockContent as ToolResultContent,
} from "../../db/schema/sessions";

// Additional types for API responses that include nested data
export interface TurnWithBlocks extends Omit<import("../../db/schema/sessions").Turn, "createdAt" | "startedAt" | "completedAt"> {
  blocks?: BlockWithParsedContent[];
  block_count?: number;
  // Convert Date to string for JSON serialization
  createdAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
}

export interface BlockWithParsedContent extends Omit<import("../../db/schema/sessions").Block, "content" | "createdAt"> {
  content: ThinkingContent | TextContent | ToolUseContent | ToolResultContent;
  createdAt?: string;
}

export interface SessionWithTurns extends Omit<import("../../db/schema/sessions").Session, "createdAt" | "updatedAt"> {
  turns?: TurnWithBlocks[];
  createdAt: string;
  updatedAt: string;
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
