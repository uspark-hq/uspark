// Import types from the database schema
import type {
  Session,
  Turn,
  Block,
  ThinkingBlockContent,
  ContentBlockContent,
  ToolUseBlockContent,
  ToolResultBlockContent,
} from "../../db/schema/sessions";

// Re-export only the main types that are actually used
export type { Session, Turn, Block } from "../../db/schema/sessions";

// Type aliases for internal use
type ThinkingContent = ThinkingBlockContent;
type TextContent = ContentBlockContent;
type ToolUseContent = ToolUseBlockContent;
type ToolResultContent = ToolResultBlockContent;

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

interface SessionWithTurns extends Omit<Session, "createdAt" | "updatedAt"> {
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
    blockCount: number;
  }[];
  has_active_turns: boolean;
}
