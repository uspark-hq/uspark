import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import crypto from "crypto";
import { nanoid } from "nanoid";
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
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  initServices();

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const { project_id, file_path } = body;

  if (!project_id || typeof project_id !== "string") {
    return NextResponse.json(
      { error: "project_id is required and must be a string" },
      { status: 400 },
    );
  }

  if (!file_path || typeof file_path !== "string") {
    return NextResponse.json(
      { error: "file_path is required and must be a string" },
      { status: 400 },
    );
  }

  // Verify that the user owns the project
  const [project] = await globalThis.services.db
    .select()
    .from(PROJECTS_TBL)
    .where(
      and(eq(PROJECTS_TBL.id, project_id), eq(PROJECTS_TBL.userId, userId)),
    );

  if (!project) {
    return NextResponse.json(
      { error: "project_not_found" },
      { status: 404 },
    );
  }

  // Generate unique token and ID
  const token = generateShareToken();
  const id = nanoid();

  // Create share link
  await globalThis.services.db.insert(SHARE_LINKS_TBL).values({
    id,
    token,
    projectId: project_id,
    filePath: file_path,
    userId,
  });

  // Construct the full URL
  const baseUrl = request.headers.get("origin") || "https://uspark.dev";
  const url = `${baseUrl}/share/${token}`;

  return NextResponse.json({
    id,
    url,
    token,
  }, { status: 201 });
}

