"use server";

import { auth } from "@clerk/nextjs/server";
import { initServices } from "../../../src/lib/init-services";
import { SHARE_LINKS_TBL } from "../../../src/db/schema/share-links";
import { eq, and, desc } from "drizzle-orm";

export async function getShares() {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }

  initServices();

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

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || "https://uspark-web.vercel.app";

  return shares.map((share) => ({
    ...share,
    url: `${baseUrl}/share/${share.token}`,
  }));
}

export async function deleteShare(shareId: string) {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }

  initServices();

  // Check if share exists and belongs to user
  const [share] = await globalThis.services.db
    .select()
    .from(SHARE_LINKS_TBL)
    .where(
      and(eq(SHARE_LINKS_TBL.id, shareId), eq(SHARE_LINKS_TBL.userId, userId)),
    );

  if (!share) {
    throw new Error("Share not found");
  }

  // Delete the share
  await globalThis.services.db
    .delete(SHARE_LINKS_TBL)
    .where(eq(SHARE_LINKS_TBL.id, shareId));

  return { success: true };
}