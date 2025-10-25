# Project Diff API Design

## Overview

This document defines a lightweight diff-based sync system for real-time updates in uSpark. The system uses a simple version-based diff API with short server-side polling (5 seconds max).

## Goals

- ✅ Simple and maintainable
- ✅ Lower latency than current 3-second client polling
- ✅ No complex connection management
- ✅ Efficient bandwidth usage (only send diffs)

## Core API

### GET /api/projects/:id/diff

Returns the YJS diff between a client's version and the current server version.

**Endpoint:**

```http
GET /api/projects/:projectId/diff?fromVersion={clientVersion}
```

**Query Parameters:**

- `fromVersion` (required): Client's current version number

**Response Headers:**

- `Content-Type: application/octet-stream`
- `X-From-Version: {fromVersion}`
- `X-To-Version: {currentVersion}`
- configure cors headers as needed

**Response Body:**

- Binary YJS update data (diff from fromVersion to currentVersion)

**Status Codes:**

- `200 OK`: Update available, binary YJS diff in body
- `304 Not Modified`: Client is already at current version (after polling timeout)
- `404 Not Found`: fromVersion doesn't exist in history (system error - should not happen)

## Behavior

### Case 1: Client Behind Server (Normal)

```
Client version: 5
Server version: 8

→ Load YDoc state at version 5
→ Compute diff: Y.encodeStateAsUpdate(currentDoc, stateVectorV5)
→ Return 200 OK with diff (v5 → v8)
```

### Case 2: Client Current (Normal - Server Polling)

```
Client version: 8
Server version: 8

→ Server polls database every 1 second, max 5 times
→ If version changes to 9: compute diff (v8 → v9) and return 200 OK
→ If still 8 after 5 seconds: return 304 Not Modified
```

### Case 3: Client Ahead (Client Error)

```
Client version: 10
Server version: 8

→ Return 404 Not Found
(system error - should not happen)
```

### Case 4: Version Not Found (System Error)

```
Client version: 5
Server version: 8
But version 5 doesn't exist in project_versions table

→ Return 404 Not Found
(This should NOT happen - indicates data corruption or wrong cleanup)
```

## Database Schema

**Requires version history table:**

```sql
-- Existing projects table
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  ydoc_data TEXT NOT NULL,  -- Base64-encoded full YDoc state (current version)
  version INTEGER DEFAULT 0, -- Current version number
  updated_at TIMESTAMP DEFAULT NOW(),
  ...
);

-- New table for version history
CREATE TABLE project_versions (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  ydoc_snapshot BYTEA NOT NULL,  -- Full YDoc state at this version
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(project_id, version)
);

CREATE INDEX idx_project_versions_lookup
ON project_versions(project_id, version DESC);
```

**Storage Strategy:**

- Keep last N versions (e.g., 100)
- Auto-cleanup old versions
- If client's fromVersion is too old (cleaned up) → 404

## Implementation

### Server-Side (Next.js Route Handler)

```typescript
// app/api/projects/[projectId]/diff/route.ts
import { NextRequest, NextResponse } from "next/server";
import * as Y from "yjs";
import { initServices } from "@/src/lib/init-services";
import { getUserId } from "@/src/lib/auth/get-user-id";
import { PROJECTS_TBL } from "@/src/db/schema/projects";
import { eq, and } from "drizzle-orm";

const POLL_INTERVAL = 1000; // 1 second
const MAX_POLLS = 5; // 5 attempts = 5 seconds max

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ projectId: string }> }
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
      { status: 400 }
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
        and(eq(PROJECTS_TBL.id, projectId), eq(PROJECTS_TBL.userId, userId))
      );

    if (!project) {
      return NextResponse.json({ error: "project not found" }, { status: 404 });
    }

    const currentVersion = project.version;

    if (currentVersion !== fromVersion) {
      return await computeAndReturnDiff(
        projectId,
        userId,
        project,
        fromVersion
      );
    }

    if (attempt < MAX_POLLS - 1) {
      await sleep(POLL_INTERVAL);
      continue;
    }
  }

  // Polling timeout - client is up to date
  return new Response(null, {
    status: 304,
    headers: {
      "X-From-Version": fromVersion.toString(),
      "X-To-Version": fromVersion.toString(),
    },
  });
}

/**
 * Compute and return YJS diff between fromVersion and current version
 */
async function computeAndReturnDiff(
  projectId: string,
  userId: string,
  project: { ydocData: string; version: number },
  fromVersion: number
): Promise<Response> {
  // Load the full YDoc snapshot from fromVersion
  const [oldVersion] = await globalThis.services.db
    .select()
    .from(PROJECT_VERSIONS_TBL)
    .where(
      and(
        eq(PROJECT_VERSIONS_TBL.projectId, projectId),
        eq(PROJECT_VERSIONS_TBL.version, fromVersion)
      )
    );

  if (!oldVersion) {
    // Version doesn't exist in history - system error
    // This should NOT happen under normal circumstances
    return NextResponse.json(
      {
        error: "version not found",
        message: `Version ${fromVersion} doesn't exist in history`,
      },
      { status: 404 }
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

  return new Response(diff, {
    headers: {
      "Content-Type": "application/octet-stream",
      "X-From-Version": fromVersion.toString(),
      "X-To-Version": project.version.toString(),
    },
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
```

## Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ Client (Browser)                                            │
├─────────────────────────────────────────────────────────────┤
│ Current Version: 5                                          │
│                                                             │
│ 1. GET /api/projects/123/diff?fromVersion=5                │
│    ↓                                                        │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────┐
│ Server (Next.js API)                                        │
├─────────────────────────────────────────────────────────────┤
│ 2. Check database: version = 5                             │
│    → Same as client, poll...                               │
│                                                             │
│ 3. Wait 1 second, check again: version = 5                │
│    → Still same, poll...                                   │
│                                                             │
│ 4. Wait 1 second, check again: version = 6 ✓              │
│    → Update detected!                                      │
│                                                             │
│ 5. Compute diff (v5 → v6) using YJS                       │
│    const diff = Y.encodeStateAsUpdate(currentDoc)          │
│                                                             │
│ 6. Return 200 OK                                           │
│    Headers: X-From-Version: 5, X-To-Version: 6            │
│    Body: [binary YJS diff]                                 │
│    ↓                                                        │
└─────────────────────────────────────────────────────────────┘
```
