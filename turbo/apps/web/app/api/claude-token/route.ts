import { NextRequest, NextResponse } from "next/server";
import { initServices } from "../../../src/lib/init-services";
import { CLAUDE_TOKENS_TBL } from "../../../src/db/schema/claude-tokens";
import { eq } from "drizzle-orm";
import {
  encryptClaudeToken,
  getTokenPrefix,
  isValidClaudeToken,
} from "../../../src/lib/claude-token-crypto";
import { withAuth, isErrorResponse } from "../../../src/lib/auth-middleware";

/**
 * GET /api/claude-token
 * Get the user's Claude token (if exists)
 */
export async function GET() {
  const auth = await withAuth();
  if (isErrorResponse(auth)) return auth;

  const { userId } = auth;

  initServices();
  const db = globalThis.services.db;

  // Get the user's token (without the encrypted value)
  const [token] = await db
    .select({
      userId: CLAUDE_TOKENS_TBL.userId,
      tokenPrefix: CLAUDE_TOKENS_TBL.tokenPrefix,
      lastUsedAt: CLAUDE_TOKENS_TBL.lastUsedAt,
      lastErrorAt: CLAUDE_TOKENS_TBL.lastErrorAt,
      lastErrorMessage: CLAUDE_TOKENS_TBL.lastErrorMessage,
      createdAt: CLAUDE_TOKENS_TBL.createdAt,
      updatedAt: CLAUDE_TOKENS_TBL.updatedAt,
    })
    .from(CLAUDE_TOKENS_TBL)
    .where(eq(CLAUDE_TOKENS_TBL.userId, userId))
    .limit(1);

  if (!token) {
    return NextResponse.json({ token: null });
  }

  return NextResponse.json({ token });
}

/**
 * Validates the token from request body
 */
function validateTokenInput(body: { token?: unknown }): string | NextResponse {
  const { token } = body;

  if (!token || typeof token !== "string") {
    return NextResponse.json(
      { error: "invalid_request", error_description: "Token is required" },
      { status: 400 },
    );
  }

  if (!isValidClaudeToken(token)) {
    return NextResponse.json(
      {
        error: "invalid_token",
        error_description: "Invalid Claude OAuth token format",
      },
      { status: 400 },
    );
  }

  return token;
}

/**
 * Upserts a token for the given user
 */
async function upsertToken(userId: string, token: string) {
  const db = globalThis.services.db;
  const encryptedToken = encryptClaudeToken(token);
  const tokenPrefix = getTokenPrefix(token);

  return db
    .insert(CLAUDE_TOKENS_TBL)
    .values({
      userId,
      encryptedToken,
      tokenPrefix,
    })
    .onConflictDoUpdate({
      target: CLAUDE_TOKENS_TBL.userId,
      set: {
        encryptedToken,
        tokenPrefix,
        updatedAt: new Date(),
      },
    })
    .returning({
      userId: CLAUDE_TOKENS_TBL.userId,
      tokenPrefix: CLAUDE_TOKENS_TBL.tokenPrefix,
      updatedAt: CLAUDE_TOKENS_TBL.updatedAt,
    });
}

/**
 * PUT /api/claude-token
 * Set or update the user's Claude token (upsert)
 */
export async function PUT(request: NextRequest) {
  const auth = await withAuth();
  if (isErrorResponse(auth)) return auth;

  const { userId } = auth;
  const body = await request.json();

  const tokenOrError = validateTokenInput(body);
  if (tokenOrError instanceof NextResponse) return tokenOrError;

  initServices();
  const result = await upsertToken(userId, tokenOrError);

  return NextResponse.json({ token: result[0] });
}

/**
 * DELETE /api/claude-token
 * Delete the user's Claude token
 */
export async function DELETE() {
  const auth = await withAuth();
  if (isErrorResponse(auth)) return auth;

  const { userId } = auth;

  initServices();
  const db = globalThis.services.db;

  // Delete the user's token
  const result = await db
    .delete(CLAUDE_TOKENS_TBL)
    .where(eq(CLAUDE_TOKENS_TBL.userId, userId));

  if (result.rowCount === 0) {
    return NextResponse.json(
      { error: "not_found", error_description: "No token found" },
      { status: 404 },
    );
  }

  return NextResponse.json({ success: true });
}
