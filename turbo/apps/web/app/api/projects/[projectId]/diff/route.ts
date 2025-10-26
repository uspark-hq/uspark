import { NextRequest, NextResponse } from "next/server";
import * as Y from "yjs";
import { initServices } from "../../../../../src/lib/init-services";
import { getUserId } from "../../../../../src/lib/auth/get-user-id";
import { PROJECTS_TBL } from "../../../../../src/db/schema/projects";
import { PROJECT_VERSIONS_TBL } from "../../../../../src/db/schema/project-versions";
import { eq, and } from "drizzle-orm";

const POLL_INTERVAL = 1000; // 1 second
const MAX_POLLS = process.env.NODE_ENV === "test" ? 1 : 5; // Test: 1 attempt, Prod: 5 attempts = 5 seconds max

/**
 * GET /api/projects/:projectId/diff?fromVersion={clientVersion}
 * Returns YJS diff between client version and current version
 * Polls for up to 5 seconds if client is current
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ projectId: string }> },
) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  initServices();
  const { projectId } = await context.params;

  // Parse fromVersion from query params
  const { searchParams } = new URL(request.url);
  const fromVersionStr = searchParams.get("fromVersion");

  if (!fromVersionStr) {
    return NextResponse.json(
      { error: "fromVersion parameter required" },
      { status: 400 },
    );
  }

  const fromVersion = parseInt(fromVersionStr, 10);
  if (isNaN(fromVersion) || fromVersion < 0) {
    return NextResponse.json({ error: "invalid fromVersion" }, { status: 400 });
  }

  // Poll for updates (max 5 seconds)
  for (let attempt = 0; attempt < MAX_POLLS; attempt++) {
    // Fetch current project state
    const [project] = await globalThis.services.db
      .select()
      .from(PROJECTS_TBL)
      .where(
        and(eq(PROJECTS_TBL.id, projectId), eq(PROJECTS_TBL.userId, userId)),
      );

    if (!project) {
      return NextResponse.json({ error: "project not found" }, { status: 404 });
    }

    const currentVersion = project.version;

    // Version mismatch - compute and return diff
    if (currentVersion !== fromVersion) {
      return await computeAndReturnDiff(projectId, project, fromVersion);
    }

    // Versions equal - wait and retry (unless last attempt)
    if (attempt < MAX_POLLS - 1) {
      await sleep(POLL_INTERVAL);
      continue;
    }
  }

  // Polling timeout - client is up to date
  return new Response(null, {
    status: 304,
    headers: {
      "X-Version": fromVersion.toString(),
      "Access-Control-Expose-Headers": "X-Version",
    },
  });
}

/**
 * Compute and return YJS diff between fromVersion and current version
 */
async function computeAndReturnDiff(
  projectId: string,
  project: { ydocData: string; version: number },
  fromVersion: number,
): Promise<Response> {
  // Load the full YDoc snapshot from fromVersion
  const [oldVersion] = await globalThis.services.db
    .select()
    .from(PROJECT_VERSIONS_TBL)
    .where(
      and(
        eq(PROJECT_VERSIONS_TBL.projectId, projectId),
        eq(PROJECT_VERSIONS_TBL.version, fromVersion),
      ),
    );

  if (!oldVersion) {
    // Version doesn't exist in history - system error
    // This should NOT happen under normal circumstances
    return NextResponse.json(
      {
        error: "version not found",
        message: `Version ${fromVersion} doesn't exist in history`,
      },
      { status: 404 },
    );
  }

  // Reconstruct old YDoc from snapshot
  const oldDoc = new Y.Doc();
  Y.applyUpdate(oldDoc, new Uint8Array(oldVersion.ydocSnapshot));

  // Load current YDoc
  const currentDoc = new Y.Doc();
  const currentBinary = Buffer.from(project.ydocData, "base64");
  Y.applyUpdate(currentDoc, new Uint8Array(currentBinary));

  // Compute diff: extract state vector from old doc, use it to compute diff
  const oldStateVector = Y.encodeStateVector(oldDoc);
  const diff = Y.encodeStateAsUpdate(currentDoc, oldStateVector);

  // Get current state vector (server's state)
  const currentStateVector = Y.encodeStateVector(currentDoc);

  // Encode response: [length(4 bytes)][stateVector][diff]
  const responseBuffer = new ArrayBuffer(
    4 + currentStateVector.length + diff.length,
  );
  const view = new DataView(responseBuffer);

  // Write state vector length (uint32, big-endian)
  view.setUint32(0, currentStateVector.length, false);

  // Write state vector
  const responseArray = new Uint8Array(responseBuffer);
  responseArray.set(currentStateVector, 4);

  // Write diff
  responseArray.set(diff, 4 + currentStateVector.length);

  return new Response(Buffer.from(responseArray), {
    headers: {
      "Content-Type": "application/octet-stream",
      "X-Version": project.version.toString(),
      "Access-Control-Expose-Headers": "X-Version",
    },
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
