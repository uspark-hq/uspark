import { NextResponse } from "next/server";
import { initServices } from "../../../lib/init-services";
import { USERS_TBL } from "../../../db/schema/user";

/**
 * Example API route
 * Always call initServices() at the entry point
 */
export async function GET() {
  // Initialize services at serverless function entry
  initServices();

  // No ! needed - getter ensures services exists
  const allUsers = await globalThis.services.db.select().from(USERS_TBL);

  return NextResponse.json({
    success: true,
    users: allUsers,
  });
}
