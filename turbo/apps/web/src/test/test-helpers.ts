import { eq } from "drizzle-orm";
import { setupTestDb } from "./db-setup";
import { deviceCodes } from "../db/schema/device-codes";

export interface TestDeviceCode {
  code: string;
  status: "pending" | "authenticated" | "expired" | "denied";
  userId?: string | null;
  expiresAt?: Date;
}

export async function createTestDeviceCode(data: TestDeviceCode) {
  const db = await setupTestDb();
  
  const expiresAt = data.expiresAt || new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now
  
  await db.insert(deviceCodes).values({
    code: data.code,
    status: data.status,
    userId: data.userId || null,
    expiresAt,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  
  return data.code;
}

export async function cleanupDeviceCodes() {
  const db = await setupTestDb();
  await db.delete(deviceCodes);
}

export async function getDeviceCodeFromDb(code: string) {
  const db = await setupTestDb();
  const result = await db.select().from(deviceCodes).where(eq(deviceCodes.code, code));
  return result[0];
}