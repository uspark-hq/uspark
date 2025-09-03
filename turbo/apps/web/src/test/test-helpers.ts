import { setupTestDb } from "./db-setup";
import { DEVICE_CODES_TBL } from "../db/schema/device-codes";

export async function cleanupDeviceCodes() {
  const db = await setupTestDb();
  await db.delete(DEVICE_CODES_TBL);
}
