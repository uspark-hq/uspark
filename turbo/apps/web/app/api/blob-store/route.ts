import { NextResponse } from "next/server";
import type { z } from "zod";
import { projectDetailContract } from "@uspark/core";
import { getUserId } from "../../../src/lib/auth/get-user-id";
import { env } from "../../../src/env";

// Extract types from contract
type BlobStoreResponse = z.infer<
  (typeof projectDetailContract.getBlobStore.responses)[200]
>;
type UnauthorizedResponse = z.infer<
  (typeof projectDetailContract.getBlobStore.responses)[401]
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
    const response: UnauthorizedResponse = {
      error: "unauthorized",
      error_description: "Authentication required",
    };
    return NextResponse.json(response, { status: 401 });
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

  // Extract store ID from token format: vercel_blob_rw_[STORE_ID]_[SECRET]
  const parts = readWriteToken.split("_");
  if (parts.length < 4 || !parts[3]) {
    return NextResponse.json(
      {
        error: "invalid_blob_token",
        error_description: "Invalid BLOB_READ_WRITE_TOKEN format",
      },
      { status: 500 },
    );
  }

  const storeId = parts[3];

  const response: BlobStoreResponse = { storeId };
  return NextResponse.json(response);
}
