// Re-export types from the database schema for consistency
export type {
  Session,
  Turn,
  Block,
  ThinkingBlockContent,
  ContentBlockContent,
  ToolUseBlockContent,
  ToolResultBlockContent,
} from "../../db/schema/sessions";

// Type aliases for easier usage
export type ThinkingContent = import("../../db/schema/sessions").ThinkingBlockContent;
export type TextContent = import("../../db/schema/sessions").ContentBlockContent;
export type ToolUseContent = import("../../db/schema/sessions").ToolUseBlockContent;
export type ToolResultContent = import("../../db/schema/sessions").ToolResultBlockContent;

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
  content: import("../../db/schema/sessions").ThinkingBlockContent | import("../../db/schema/sessions").ContentBlockContent | import("../../db/schema/sessions").ToolUseBlockContent | import("../../db/schema/sessions").ToolResultBlockContent;
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
    status: import("../../db/schema/sessions").Turn["status"];
    new_block_ids?: string[];
    block_count: number;
  }[];
  has_active_turns: boolean;
}
