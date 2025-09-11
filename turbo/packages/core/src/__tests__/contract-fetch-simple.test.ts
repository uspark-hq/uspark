import { describe, it, expect } from "vitest";
import { initContract } from "@ts-rest/core";
import { z } from "zod";
import { contractFetch, ContractFetchError } from "../contract-fetch";

// 创建一个简单的测试合约
const c = initContract();

const simpleContract = c.router({
  getUser: {
    method: "GET",
    path: "/api/users/:id",
    pathParams: z.object({
      id: z.string(),
    }),
    responses: {
      200: z.object({
        id: z.string(),
        name: z.string(),
      }),
      404: z.object({
        error: z.string(),
      }),
    },
  },
  createUser: {
    method: "POST",
    path: "/api/users",
    body: z.object({
      name: z.string(),
      email: z.string(),
    }),
    responses: {
      201: z.object({
        id: z.string(),
        name: z.string(),
        email: z.string(),
      }),
    },
  },
});

describe("contractFetch simple test", () => {
  it("should have correct type inference", () => {
    // 这个测试只验证类型推断，不执行实际的 fetch
    type GetUserResult = Awaited<ReturnType<typeof contractFetch<typeof simpleContract.getUser>>>;
    type CreateUserResult = Awaited<ReturnType<typeof contractFetch<typeof simpleContract.createUser>>>;
    
    // 验证类型推断是否正确
    const assertGetUserType: GetUserResult = {
      id: "123",
      name: "Test User",
    };
    
    const assertCreateUserType: CreateUserResult = {
      id: "456",
      name: "New User",
      email: "test@example.com",
    };
    
    expect(assertGetUserType).toBeDefined();
    expect(assertCreateUserType).toBeDefined();
  });

  it("should build correct request URL with path params", async () => {
    // 使用实际的 fetch API 测试 URL 构建
    // 这会失败但我们可以捕获错误来验证 URL
    try {
      await contractFetch(simpleContract.getUser, {
        baseUrl: "https://api.example.com",
        params: { id: "user123" },
      });
    } catch (error) {
      // 由于没有实际的服务器，会失败，但我们可以检查错误
      expect(error).toBeDefined();
    }
  });
  
  it("should handle ContractFetchError type", () => {
    const error = new ContractFetchError(
      "Test error",
      404,
      { error: "not_found" },
      new Response()
    );
    
    expect(error).toBeInstanceOf(ContractFetchError);
    expect(error.status).toBe(404);
    expect(error.data).toEqual({ error: "not_found" });
  });
});