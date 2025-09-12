import { NextRequest, NextResponse } from "next/server";
import { Webhooks } from "@octokit/webhooks";
import { initServices } from "../../../../src/lib/init-services";
import { githubInstallations } from "../../../../src/db/schema/github";
import { eq } from "drizzle-orm";

/**
 * Handles GitHub webhook events
 * POST /api/github/webhook
 */
export async function POST(request: NextRequest) {
  initServices();

  const webhookSecret = globalThis.services.env.GH_WEBHOOK_SECRET;

  const body = await request.text();
  const signature = request.headers.get("x-hub-signature-256");
  const eventType = request.headers.get("x-github-event");

  if (!signature || !eventType) {
    return NextResponse.json(
      { error: "Missing required headers" },
      { status: 400 },
    );
  }

  // Verify webhook signature
  const webhooks = new Webhooks({ secret: webhookSecret });
  const isValid = await webhooks.verify(body, signature);

  if (!isValid) {
    console.error("Invalid webhook signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const payload = JSON.parse(body);

  // Handle different event types
  switch (eventType) {
    case "installation":
      await handleInstallationEvent(payload);
      break;

    case "installation_repositories":
      await handleInstallationRepositoriesEvent(payload);
      break;

    case "push":
      // TODO: Handle push events for future GitHub → Web sync
      console.log("Push event received (not implemented yet)");
      break;

    default:
      console.log(`Unhandled webhook event: ${eventType}`);
  }

  return NextResponse.json({ message: "Webhook processed" });
}

/**
 * Handle installation events (created, deleted, suspend, unsuspend)
 */
async function handleInstallationEvent(payload: {
  action: string;
  installation: { id: number; account: { login: string } };
}) {
  const { action, installation } = payload;
  const installationId = installation.id;
  const accountName = installation.account.login;

  switch (action) {
    case "created":
      console.log(`Installation created: ${installationId} for ${accountName}`);
      // Installation is stored when user completes setup flow
      break;

    case "deleted":
      console.log(`Installation deleted: ${installationId}`);
      // Remove installation from database
      await globalThis.services.db
        .delete(githubInstallations)
        .where(eq(githubInstallations.installationId, installationId));
      break;

    case "suspend":
      console.log(`Installation suspended: ${installationId}`);
      // TODO: Mark installation as suspended (add status field in future)
      break;

    case "unsuspend":
      console.log(`Installation unsuspended: ${installationId}`);
      // TODO: Mark installation as active (add status field in future)
      break;
  }
}

/**
 * Handle installation repositories events (added, removed)
 */
async function handleInstallationRepositoriesEvent(payload: {
  action: string;
  installation: { id: number };
  repositories_added?: { name: string }[];
  repositories_removed?: { name: string }[];
}) {
  const { action, installation, repositories_added, repositories_removed } =
    payload;
  const installationId = installation.id;

  switch (action) {
    case "added":
      console.log(
        `Repositories added to installation ${installationId}:`,
        repositories_added?.map((repo) => repo.name),
      );
      // TODO: Handle repository access added (future feature)
      break;

    case "removed":
      console.log(
        `Repositories removed from installation ${installationId}:`,
        repositories_removed?.map((repo) => repo.name),
      );
      // TODO: Handle repository access removed (future feature)
      break;
  }
}
