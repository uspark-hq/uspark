import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { initServices } from "../../../src/lib/init-services";
import { SHARE_LINKS_TBL } from "../../../src/db/schema/share-links";
import { eq, desc } from "drizzle-orm";

interface ShareListItem {
  id: string;
  url: string;
  token: string;
  project_id: string;
  file_path: string | null;
  created_at: string;
  accessed_count: number;
  last_accessed_at: string | null;
}

interface ListSharesResponse {
  shares: ShareListItem[];
}

interface ShareError {
  error: string;
  error_description?: string;
}

/**
 * GET /api/shares
 * List all share links created by the current user
 */
export async function GET(request: NextRequest) {
  const { userId } = await auth();

  if (!userId) {
    const errorResponse: ShareError = {
      error: "unauthorized",
    };
    return NextResponse.json(errorResponse, { status: 401 });
  }

  initServices();

  // Get all shares for the current user
  const shares = await globalThis.services.db
    .select()
    .from(SHARE_LINKS_TBL)
    .where(eq(SHARE_LINKS_TBL.userId, userId))
    .orderBy(desc(SHARE_LINKS_TBL.createdAt));

  // Construct the base URL
  const baseUrl = request.headers.get("origin") || "https://uspark.dev";

  const shareList: ShareListItem[] = shares.map((share) => ({
    id: share.id,
    url: `${baseUrl}/share/${share.token}`,
    token: share.token,
    project_id: share.projectId,
    file_path: share.filePath,
    created_at: share.createdAt.toISOString(),
    accessed_count: share.accessedCount,
    last_accessed_at: share.lastAccessedAt
      ? share.lastAccessedAt.toISOString()
      : null,
  }));

  const response: ListSharesResponse = {
    shares: shareList,
  };

  return NextResponse.json(response);
}

