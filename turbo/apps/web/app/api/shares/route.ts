import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { initServices } from "../../../src/lib/init-services";
import { SHARE_LINKS_TBL } from "../../../src/db/schema/share-links";
import { eq, desc } from "drizzle-orm";

/**
 * GET /api/shares
 * List all share links for the authenticated user
 */
export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  initServices();

  // Get all shares for the current user
  const shares = await globalThis.services.db
    .select({
      id: SHARE_LINKS_TBL.id,
      token: SHARE_LINKS_TBL.token,
      projectId: SHARE_LINKS_TBL.projectId,
      filePath: SHARE_LINKS_TBL.filePath,
      createdAt: SHARE_LINKS_TBL.createdAt,
      accessedCount: SHARE_LINKS_TBL.accessedCount,
      lastAccessedAt: SHARE_LINKS_TBL.lastAccessedAt,
    })
    .from(SHARE_LINKS_TBL)
    .where(eq(SHARE_LINKS_TBL.userId, userId))
    .orderBy(desc(SHARE_LINKS_TBL.createdAt));

  // Transform to include full URLs
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://uspark.dev";
  const sharesWithUrls = shares.map((share) => ({
    ...share,
    url: `${baseUrl}/share/${share.token}`,
  }));

  return NextResponse.json({ shares: sharesWithUrls });
}
