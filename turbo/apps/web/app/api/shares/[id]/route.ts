import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { initServices } from "../../../../src/lib/init-services";
import { SHARE_LINKS_TBL } from "../../../../src/db/schema/share-links";
import { eq, and } from "drizzle-orm";

/**
 * DELETE /api/shares/:id
 * Revoke a share link
 */
export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  initServices();
  const { id } = await context.params;

  // Check if the share exists and belongs to the user
  const [shareLink] = await globalThis.services.db
    .select()
    .from(SHARE_LINKS_TBL)
    .where(and(eq(SHARE_LINKS_TBL.id, id), eq(SHARE_LINKS_TBL.userId, userId)));

  if (!shareLink) {
    return NextResponse.json({ error: "share_not_found" }, { status: 404 });
  }

  // Delete the share link
  await globalThis.services.db
    .delete(SHARE_LINKS_TBL)
    .where(and(eq(SHARE_LINKS_TBL.id, id), eq(SHARE_LINKS_TBL.userId, userId)));

  return NextResponse.json({ success: true });
}
