import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { initServices } from "../../../../src/lib/init-services";
import { SHARE_LINKS_TBL } from "../../../../src/db/schema/share-links";
import { eq, and } from "drizzle-orm";

interface ShareError {
  error: string;
  error_description?: string;
}

interface DeleteShareResponse {
  success: boolean;
  message: string;
}

/**
 * DELETE /api/shares/[id]
 * Revoke a share link by its ID
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const { userId } = await auth();

  if (!userId) {
    const errorResponse: ShareError = {
      error: "unauthorized",
    };
    return NextResponse.json(errorResponse, { status: 401 });
  }

  const shareId = params.id;

  if (!shareId) {
    const errorResponse: ShareError = {
      error: "invalid_request",
      error_description: "Share ID is required",
    };
    return NextResponse.json(errorResponse, { status: 400 });
  }

  initServices();

  // First, check if the share exists and belongs to the user
  const [existingShare] = await globalThis.services.db
    .select()
    .from(SHARE_LINKS_TBL)
    .where(
      and(eq(SHARE_LINKS_TBL.id, shareId), eq(SHARE_LINKS_TBL.userId, userId)),
    );

  if (!existingShare) {
    const errorResponse: ShareError = {
      error: "share_not_found",
      error_description:
        "Share not found or you don't have permission to delete it",
    };
    return NextResponse.json(errorResponse, { status: 404 });
  }

  // Delete the share link
  await globalThis.services.db
    .delete(SHARE_LINKS_TBL)
    .where(
      and(eq(SHARE_LINKS_TBL.id, shareId), eq(SHARE_LINKS_TBL.userId, userId)),
    );

  const response: DeleteShareResponse = {
    success: true,
    message: "Share link revoked successfully",
  };

  return NextResponse.json(response);
}

