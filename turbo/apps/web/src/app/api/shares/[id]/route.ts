import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { initServices } from "@/lib/init-services";
import { SHARE_LINKS_TBL } from "@/db/schema/share-links";
import { eq, and } from "drizzle-orm";
import { type DeleteShareResponse } from "@uspark/core";

/**
 * DELETE /api/shares/:id
 * Delete a share link
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

  // Verify share exists and belongs to user
  const [share] = await globalThis.services.db
    .select()
    .from(SHARE_LINKS_TBL)
    .where(and(eq(SHARE_LINKS_TBL.id, id), eq(SHARE_LINKS_TBL.userId, userId)));

  if (!share) {
    return NextResponse.json({ error: "share_not_found" }, { status: 404 });
  }

  // Delete the share link
  await globalThis.services.db
    .delete(SHARE_LINKS_TBL)
    .where(eq(SHARE_LINKS_TBL.id, id));

  const response: DeleteShareResponse = {
    success: true,
  };

  return NextResponse.json(response);
}
