import { describe, expect, it } from "vitest";
import { USERS_TBL } from "../schema/user";
import { getTableName } from "drizzle-orm";

describe("Database Schema", () => {
  it("should have users table defined", () => {
    expect(USERS_TBL).toBeDefined();
    expect(getTableName(USERS_TBL)).toBe("users");
  });

  it("should have correct user table columns", () => {
    expect(USERS_TBL.id).toBeDefined();
    expect(USERS_TBL.createdAt).toBeDefined();
    expect(USERS_TBL.updatedAt).toBeDefined();
  });
});
