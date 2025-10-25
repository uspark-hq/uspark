import { NextResponse } from "next/server";
import type { z } from "zod";
import { projectDetailContract } from "@uspark/core";
import { getUserId } from "../../../src/lib/auth/get-user-id";
import { env } from "../../../src/env";
import { getStoreIdFromToken } from "../../../src/lib/blob/utils";

// Extract types from contract
type BlobStoreResponse = z.infer<
  (typeof projectDetailContract.getBlobStore.responses)[200]
>;

/**
 * GET /api/blob-store
 * Returns the Vercel Blob store ID for constructing public URLs
 * Requires authentication (Clerk session or CLI token)
 *
 * Contract: projectDetailContract.getBlobStore
 */
export async function GET() {
  const userId = await getUserId();

  if (!userId) {
    return NextResponse.json(
      {
        error: "unauthorized",
        error_description: "Authentication required",
      },
      { status: 401 },
    );
  }

  const readWriteToken = env().BLOB_READ_WRITE_TOKEN;
  if (!readWriteToken) {
    return NextResponse.json(
      {
        error: "blob_storage_not_configured",
        error_description: "Blob storage is not configured",
      },
      { status: 500 },
    );
  }

  try {
    const storeId = getStoreIdFromToken(readWriteToken);
    const response: BlobStoreResponse = { store_id: storeId };
    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      {
        error: "invalid_blob_token",
        error_description:
          error instanceof Error ? error.message : "Invalid token format",
      },
      { status: 500 },
    );
  }
}
