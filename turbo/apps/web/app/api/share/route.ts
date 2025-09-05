import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import crypto from "crypto";
import { nanoid } from "nanoid";
import {
  CreateShareRequestSchema,
  type CreateShareResponse,
  type CreateShareError,
} from "@uspark/core";
import { initServices } from "../../../src/lib/init-services";
import { SHARE_LINKS_TBL } from "../../../src/db/schema/share-links";
import { PROJECTS_TBL } from "../../../src/db/schema/projects";
import { eq, and } from "drizzle-orm";

/**
 * Generate a cryptographically secure share token
 */
function generateShareToken(): string {
  const randomBytes = crypto.randomBytes(32);
  return randomBytes.toString("base64url");
}

/**
 * POST /api/share
 * Create a new share link for a project or file
 */
export async function POST(request: NextRequest) {
  const { userId } = await auth();

  if (!userId) {
    const errorResponse: CreateShareError = {
      error: "unauthorized",
    };
    return NextResponse.json(errorResponse, { status: 401 });
  }

  initServices();

  const body = await request.json();

  // Validate request body using schema from core
  const validationResult = CreateShareRequestSchema.safeParse(body);

  if (!validationResult.success) {
    const errors = validationResult.error?.issues || [];
    const firstError = errors[0];
    const errorResponse: CreateShareError = {
      error: "invalid_request",
      error_description: firstError
        ? `${firstError.path?.join(".") || "field"}: ${firstError.message}`
        : "Invalid request format",
    };
    return NextResponse.json(errorResponse, { status: 400 });
  }

  const { project_id, file_path } = validationResult.data;

  // Verify that the user owns the project
  const [project] = await globalThis.services.db
    .select()
    .from(PROJECTS_TBL)
    .where(
      and(eq(PROJECTS_TBL.id, project_id), eq(PROJECTS_TBL.userId, userId)),
    );

  if (!project) {
    const errorResponse: CreateShareError = {
      error: "project_not_found",
    };
    return NextResponse.json(errorResponse, { status: 404 });
  }

  // Generate unique token and ID
  const token = generateShareToken();
  const id = nanoid();

  // Create share link (MVP only supports single files, so filePath is required)
  await globalThis.services.db.insert(SHARE_LINKS_TBL).values({
    id,
    token,
    projectId: project_id,
    filePath: file_path, // Required for MVP, though schema allows NULL for future expansion
    userId,
  });

  // Construct the full URL
  const baseUrl = request.headers.get("origin") || "https://uspark.dev";
  const url = `${baseUrl}/share/${token}`;

  const response: CreateShareResponse = {
    id,
    url,
    token,
  };

  return NextResponse.json(response, { status: 201 });
}
