// Import types from the database schema for internal use
import type {
  Turn,
  Block,
  ThinkingBlockContent,
  ContentBlockContent,
  ToolUseBlockContent,
  ToolResultBlockContent,
} from "../../db/schema/sessions";

// Additional types for API responses that include nested data
export interface TurnWithBlocks
  extends Omit<Turn, "createdAt" | "startedAt" | "completedAt"> {
  blocks?: BlockWithParsedContent[];
  blockCount?: number;
  // Convert Date to string for JSON serialization
  createdAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
}

export interface BlockWithParsedContent
  extends Omit<Block, "content" | "createdAt"> {
  content:
    | ThinkingBlockContent
    | ContentBlockContent
    | ToolUseBlockContent
    | ToolResultBlockContent;
  createdAt?: string;
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
    blockCount: number;
  }[];
  has_active_turns: boolean;
}
