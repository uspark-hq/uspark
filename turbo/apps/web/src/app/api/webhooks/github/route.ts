import { NextRequest, NextResponse } from "next/server";
import { env } from "@/env";
import { initServices } from "@/lib/init-services";
import { GITHUB_REPOS_TBL, GITHUB_SYNC_LOG_TBL } from "@/db/schema/github-tokens";
import { eq } from "drizzle-orm";
import crypto from "crypto";

interface PushEvent {
  ref: string;
  before: string;
  after: string;
  repository: {
    id: number;
    full_name: string;
    default_branch: string;
  };
  commits: Array<{
    id: string;
    message: string;
    author: {
      name: string;
      email: string;
    };
    added: string[];
    removed: string[];
    modified: string[];
  }>;
  pusher: {
    name: string;
    email: string;
  };
}

/**
 * Verifies GitHub webhook signature
 */
function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const hmac = crypto.createHmac("sha256", secret);
  const digest = "sha256=" + hmac.update(payload).digest("hex");
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(digest)
  );
}

export async function POST(request: NextRequest) {
  const signature = request.headers.get("x-hub-signature-256");
  const event = request.headers.get("x-github-event");
  
  if (!signature || !event) {
    return NextResponse.json(
      { error: "Missing webhook headers" },
      { status: 400 }
    );
  }
  
  const payload = await request.text();
  
  try {
    const data = JSON.parse(payload) as PushEvent;
    
    initServices();
    const { db } = globalThis.services;
    
    const repo = await db
      .select()
      .from(GITHUB_REPOS_TBL)
      .where(eq(GITHUB_REPOS_TBL.repoId, data.repository.id.toString()))
      .limit(1);
    
    if (!repo.length) {
      return NextResponse.json(
        { error: "Repository not found" },
        { status: 404 }
      );
    }
    
    const repoRecord = repo[0];
    
    if (!repoRecord.webhookSecret) {
      return NextResponse.json(
        { error: "Webhook secret not configured" },
        { status: 500 }
      );
    }
    
    const isValid = verifyWebhookSignature(
      payload,
      signature,
      repoRecord.webhookSecret
    );
    
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }
    
    if (event === "push") {
      await handlePushEvent(data, repoRecord.id);
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

async function handlePushEvent(event: PushEvent, repoId: string) {
  initServices();
  const { db } = globalThis.services;
  
  const branch = event.ref.replace("refs/heads/", "");
  
  const allFiles = event.commits.flatMap(commit => [
    ...commit.added,
    ...commit.modified,
    ...commit.removed,
  ]);
  
  const uniqueFiles = [...new Set(allFiles)];
  
  await db.insert(GITHUB_SYNC_LOG_TBL).values({
    repoId,
    direction: "pull",
    status: "pending",
    commitSha: event.after,
    filesChanged: JSON.stringify(uniqueFiles),
    createdAt: new Date(),
  });
  
  try {
    await syncFilesFromGitHub(repoId, event.after, uniqueFiles);
    
    await db
      .update(GITHUB_SYNC_LOG_TBL)
      .set({ status: "success" })
      .where(eq(GITHUB_SYNC_LOG_TBL.commitSha, event.after));
    
    await db
      .update(GITHUB_REPOS_TBL)
      .set({
        lastPushedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(GITHUB_REPOS_TBL.id, repoId));
  } catch (error) {
    await db
      .update(GITHUB_SYNC_LOG_TBL)
      .set({
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
      })
      .where(eq(GITHUB_SYNC_LOG_TBL.commitSha, event.after));
    
    throw error;
  }
}

async function syncFilesFromGitHub(
  repoId: string,
  commitSha: string,
  files: string[]
) {
  console.log(`Syncing ${files.length} files from GitHub commit ${commitSha}`);
}