import { describe, it, expect, beforeEach } from "vitest";
import { syncProjectToGitHub, getSyncStatus } from "./sync";
import * as Y from "yjs";
import { initServices } from "../init-services";
import { PROJECTS_TBL } from "../../db/schema/projects";
import { githubRepos } from "../../db/schema/github";
import { SESSIONS_TBL, TURNS_TBL, BLOCKS_TBL } from "../../db/schema/sessions";
import { SHARE_LINKS_TBL } from "../../db/schema/share-links";
import { AGENT_SESSIONS_TBL } from "../../db/schema/agent-sessions";
import "../../test/msw-setup";

// Note: Using real GitHub client with MSW mocking the API endpoints

// Set up test environment variables
process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = "pk_test_mock_instance.clerk.accounts.dev$";
process.env.CLERK_SECRET_KEY = "sk_test_mock_secret_key_for_testing";
process.env.GH_APP_ID = "12345";
process.env.GH_APP_PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDShp+5q/tVHTep
zgJ0c7L/dLvXwDuZvGuAOzeqrE5AngDJxXEOdfZCYLcblWk0cfnxiW/OSzSYQEW4
8AflqvV3BEhAh3Z1kPL17vhJ8cd+lazvhtjCxtBxownhVVJuTpl6q8VR2/TDL8kO
GF+leByDh+EHOb327Ou1HOdzcWiMuCSztYEobtKRKGddcNFyPdBp4Dm2yI+7gLz4
jksui++OC3Mepa5ic4tfy52mUvL+g7VFXk6A4JQ0vl6mwi+Q00dv6bDCBbnFpytS
LVM1iNWNamJJIh34xhflnCOV5pYtTrmq3ydh08TVqbj5+H+XME6y3zgV1pUo3YEs
fOIpMBpxAgMBAAECggEABAUSy/FtHEIRb+Y5fQaACJlupEcdBDmZLmLDFHjTii+S
KYgh+WIWfIw69tV+o6QY/wwOJNjiBVW11xsLNY8S/o2oAQZtJD/LKdfBKS1LDz9V
pOG05hw0evT/YWx3BVjuHI3m18IszWTOUJz1x5OwbLEFopUPS+WYdxX5E+balZQ+
LgELN4buz2dsvwUEw3Upd7ywQka6YwqITfJPw911adPYXh+LTN2vvOHI0+V4iHMo
7cTitpWh2iFz/Bxg7auAELd8umCh/WWea2uKeDYyOX5XlSSKJ7LzEiUgLTgqXKkK
vXa1fvcmEOFh1wNQ8vpE3m7cOg9/C3aemLdJAbzUQQKBgQDjE9Sp6yVIe6c5pvBx
E/0/SXrPNhf/GCiLxuIpmnO3vhAaBgkMoLeiwj9LqvNYE1miZGdaSuAcyL9YAJ6q
sibyAqFtDg2Sr7q7EmMWIUaXJLURAgkxHyrf6sZqTWJ5wDoFNRNMonJOWP+h21jJ
3BJ0OEfQbheZQ6CaEhxBlwe8EQKBgQDtVxstGGHKDAvMbF2XiBPU1gBOQMNADqKP
qSvr8Zc6SRak+W6kyurCur8jyabc4ntKDUR90b2VXSc6FiVaJ6TySp8ktkYSXcis
5c+HaoEcy1nU0pEg98J+NNfBPgNDaF6nUKaawbQn5g6EYlTyC8bdH2F+BXJmdjJh
ZVPFKNxYYQKBgG+n050Ni9KdQrfdd0MS4iaZWfLDlX8QgPdh/tkYIihKI564MwDr
kgBM5VSupWM8eImaNxu1z4c3yqZZ/6rNWMsNMhTuoQvsrrPHscMy74PoP8QyLRTj
T3C0/4VLsc1OEPl4hJndErmll2Ud9wWi2cwd1GoPiDkLgM/hcdVqjxoRAoGAAgcs
hEYhD8jqkOScKB9RjBAIEKMdB/8YBII9jdaSpDzbpK089MuHFgLifzvJ4TlONGPI
ogqYxB33p9domkycbDWXBolIL//9Jv0PuOiAEe7q5ZanBtEXKFzrOwt8m6bYqDVY
NxpQn8aneRod/7N6D4mlG56QS6/W3l4vSRAAUgECgYAaAE1RChryBHRdGsnnc/Gt
GL8bqUgDn6oIiscypydnab8j5pKkpX2YQMxSlUf1+9qiFPUgG1gYoXaB9DNt3+23
emzAUSiA6DjVoP+Wl7lo4Ml0xlOMbD2OE51yY5RU5eH6uSD/xLfofetZzT8uymZt
90I2w/9AOnBG+Taccei8cw==
-----END PRIVATE KEY-----`;
process.env.GH_WEBHOOK_SECRET = "test_github_webhook_secret";

describe("GitHub Sync", () => {
  beforeEach(async () => {
    // Set up environment variables for blob storage
    process.env.BLOB_READ_WRITE_TOKEN = "vercel_blob_rw_test_store_id_secret";

    // Initialize real services (will use test database)
    initServices();

    // Clean up test data in correct order (child tables first)
    const db = globalThis.services.db;
    await db.delete(BLOCKS_TBL);
    await db.delete(TURNS_TBL);
    await db.delete(SESSIONS_TBL);
    await db.delete(SHARE_LINKS_TBL);
    await db.delete(AGENT_SESSIONS_TBL);
    await db.delete(githubRepos);
    await db.delete(PROJECTS_TBL);
  });

  describe("syncProjectToGitHub", () => {
    it("should successfully sync files to GitHub", async () => {
      const projectId = "proj_test123";
      const userId = "user_123";
      const db = globalThis.services.db;

      // Create a YDoc with test files
      const ydoc = new Y.Doc();
      const filesMap = ydoc.getMap("files");
      const blobsMap = ydoc.getMap("blobs");

      filesMap.set("README.md", { hash: "hash123", mtime: Date.now() });
      filesMap.set("package.json", { hash: "hash456", mtime: Date.now() });
      blobsMap.set("hash123", { size: 100 });
      blobsMap.set("hash456", { size: 200 });

      const ydocData = Buffer.from(Y.encodeStateAsUpdate(ydoc)).toString("base64");

      // Insert test project into real database
      await db.insert(PROJECTS_TBL).values({
        id: projectId,
        userId,
        ydocData,
        version: 0,
      });

      // Insert test repository link into real database
      await db.insert(githubRepos).values({
        projectId,
        installationId: 12345,
        repoName: "test-repo",
        repoId: 67890,
      });

      // Execute sync (MSW will handle GitHub API calls)
      const result = await syncProjectToGitHub(projectId, userId);

      // Verify result
      expect(result.success).toBe(true);
      expect(result.commitSha).toBe("new-commit-sha-202");
      expect(result.filesCount).toBe(2);
      expect(result.message).toContain("Successfully synced 2 files");
    });

    it("should return error when project not found", async () => {
      const projectId = "proj_notfound";
      const userId = "user_123";

      const result = await syncProjectToGitHub(projectId, userId);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Project not found");
    });

    it("should return error when user is not authorized", async () => {
      const projectId = "proj_test123";
      const userId = "user_123";
      const otherUserId = "user_456";
      const db = globalThis.services.db;

      // Create empty YDoc
      const ydoc = new Y.Doc();
      const ydocData = Buffer.from(Y.encodeStateAsUpdate(ydoc)).toString("base64");

      // Insert project owned by different user
      await db.insert(PROJECTS_TBL).values({
        id: projectId,
        userId: otherUserId,
        ydocData,
        version: 0,
      });

      const result = await syncProjectToGitHub(projectId, userId);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unauthorized");
    });

    it("should return error when repository not linked", async () => {
      const projectId = "proj_test123";
      const userId = "user_123";
      const db = globalThis.services.db;

      // Create empty YDoc
      const ydoc = new Y.Doc();
      const ydocData = Buffer.from(Y.encodeStateAsUpdate(ydoc)).toString("base64");

      // Insert project without repository link
      await db.insert(PROJECTS_TBL).values({
        id: projectId,
        userId,
        ydocData,
        version: 0,
      });

      const result = await syncProjectToGitHub(projectId, userId);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Repository not linked to project");
    });

    it("should return error when no files to sync", async () => {
      const projectId = "proj_test123";
      const userId = "user_123";
      const db = globalThis.services.db;

      // Create empty YDoc (no files)
      const ydoc = new Y.Doc();
      const ydocData = Buffer.from(Y.encodeStateAsUpdate(ydoc)).toString("base64");

      // Insert test project
      await db.insert(PROJECTS_TBL).values({
        id: projectId,
        userId,
        ydocData,
        version: 0,
      });

      // Insert test repository link
      await db.insert(githubRepos).values({
        projectId,
        installationId: 12345,
        repoName: "test-repo",
        repoId: 67890,
      });

      const result = await syncProjectToGitHub(projectId, userId);

      expect(result.success).toBe(false);
      expect(result.error).toBe("No files to sync");
    });

    it("should handle blob storage configuration error", async () => {
      const projectId = "proj_test123";
      const userId = "user_123";
      const db = globalThis.services.db;

      // Remove blob token to simulate configuration error
      const originalToken = process.env.BLOB_READ_WRITE_TOKEN;
      delete process.env.BLOB_READ_WRITE_TOKEN;

      // Create YDoc with files
      const ydoc = new Y.Doc();
      const filesMap = ydoc.getMap("files");
      const blobsMap = ydoc.getMap("blobs");
      filesMap.set("README.md", { hash: "hash123", mtime: Date.now() });
      blobsMap.set("hash123", { size: 100 });
      const ydocData = Buffer.from(Y.encodeStateAsUpdate(ydoc)).toString("base64");

      // Insert test data
      await db.insert(PROJECTS_TBL).values({
        id: projectId,
        userId,
        ydocData,
        version: 0,
      });

      await db.insert(githubRepos).values({
        projectId,
        installationId: 12345,
        repoName: "test-repo",
        repoId: 67890,
      });

      const result = await syncProjectToGitHub(projectId, userId);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Blob storage not configured");

      // Restore token
      process.env.BLOB_READ_WRITE_TOKEN = originalToken;
    });
  });

  describe("getSyncStatus", () => {
    it("should return linked status when repository exists", async () => {
      const projectId = "proj_test123";
      const db = globalThis.services.db;

      // Insert test repository link
      const insertResult = await db.insert(githubRepos).values({
        projectId,
        installationId: 12345,
        repoName: "test-repo",
        repoId: 67890,
      }).returning();

      const status = await getSyncStatus(projectId);

      expect(status.linked).toBe(true);
      expect(status.repoId).toBe(67890);
      expect(status.repoName).toBe("test-repo");
      expect(status.lastSynced).toEqual(insertResult[0]!.updatedAt);
    });

    it("should return unlinked status when repository does not exist", async () => {
      const projectId = "proj_nonexistent";

      const status = await getSyncStatus(projectId);

      expect(status.linked).toBe(false);
      expect(status.message).toBe("No GitHub repository linked");
    });
  });

  describe("extractFilesFromYDoc", () => {
    it("should extract files correctly from YDoc data", async () => {
      // This tests the YDoc parsing logic directly with real YDoc operations
      const projectId = "proj_test123";
      const userId = "user_123";
      const db = globalThis.services.db;

      // Create complex YDoc with multiple files
      const ydoc = new Y.Doc();
      const filesMap = ydoc.getMap("files");
      const blobsMap = ydoc.getMap("blobs");

      // Add various file types
      const files = [
        { path: "src/index.ts", hash: "hash1", size: 1000 },
        { path: "src/utils/helper.ts", hash: "hash2", size: 500 },
        { path: "README.md", hash: "hash3", size: 300 },
        { path: ".gitignore", hash: "hash4", size: 100 },
      ];

      files.forEach(file => {
        filesMap.set(file.path, { hash: file.hash, mtime: Date.now() });
        blobsMap.set(file.hash, { size: file.size });
      });

      const ydocData = Buffer.from(Y.encodeStateAsUpdate(ydoc)).toString("base64");

      // Insert test project
      await db.insert(PROJECTS_TBL).values({
        id: projectId,
        userId,
        ydocData,
        version: 0,
      });

      await db.insert(githubRepos).values({
        projectId,
        installationId: 12345,
        repoName: "test-repo", 
        repoId: 67890,
      });

      const result = await syncProjectToGitHub(projectId, userId);

      expect(result.success).toBe(true);
      expect(result.filesCount).toBe(4);
      expect(result.message).toContain("Successfully synced 4 files");
    });
  });
});