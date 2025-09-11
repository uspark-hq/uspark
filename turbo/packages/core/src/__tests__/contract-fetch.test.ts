import { describe, it, expect } from "vitest";
import { initContract } from "@ts-rest/core";
import { z } from "zod";
import { contractFetch, ContractFetchError } from "../contract-fetch";
import { server, http, HttpResponse } from "../test/msw-setup";

// 创建测试合约
const c = initContract();

const TestResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  count: z.number(),
});

const TestErrorSchema = z.object({
  error: z.string(),
  error_description: z.string().optional(),
});

const testContract = c.router({
  // GET endpoint
  getItem: {
    method: "GET",
    path: "/api/items/:id",
    pathParams: z.object({
      id: z.string(),
    }),
    query: z
      .object({
        include: z.string().optional(),
        limit: z.number().optional(),
      })
      .optional(),
    responses: {
      200: TestResponseSchema,
      404: TestErrorSchema,
    },
  },

  // POST endpoint
  createItem: {
    method: "POST",
    path: "/api/items",
    body: z.object({
      name: z.string(),
      count: z.number(),
    }),
    responses: {
      201: TestResponseSchema,
      400: TestErrorSchema,
    },
  },

  // Binary response endpoint
  getBinary: {
    method: "GET",
    path: "/api/binary/:id",
    pathParams: z.object({
      id: z.string(),
    }),
    responses: {
      200: z.any(), // Binary data
    },
  },

  // PATCH with binary body
  updateBinary: {
    method: "PATCH",
    path: "/api/binary/:id",
    pathParams: z.object({
      id: z.string(),
    }),
    body: z.any(), // Binary data
    responses: {
      200: z.object({ success: z.boolean() }),
    },
  },
});

// Base URL for tests
const BASE_URL = "http://localhost";

describe("contractFetch with MSW", () => {
  describe("GET requests", () => {
    it("should make GET request and return typed response", async () => {
      const mockResponse = { id: "123", name: "Test Item", count: 5 };

      // 设置 MSW handler
      server.use(
        http.get(`${BASE_URL}/api/items/123`, () => {
          return HttpResponse.json(mockResponse);
        }),
      );

      const result = await contractFetch(testContract.getItem, {
        baseUrl: BASE_URL,
        params: { id: "123" },
      });

      // 验证返回值和类型
      expect(result).toEqual(mockResponse);
      expect(result.id).toBe("123");
      expect(result.name).toBe("Test Item");
      expect(result.count).toBe(5);
    });

    it("should handle query parameters", async () => {
      const mockResponse = { id: "1", name: "Test", count: 10 };

      server.use(
        http.get(`${BASE_URL}/api/items/1`, ({ request }) => {
          const url = new URL(request.url);
          const include = url.searchParams.get("include");
          const limit = url.searchParams.get("limit");

          // 验证查询参数
          expect(include).toBe("details");
          expect(limit).toBe("10");

          return HttpResponse.json(mockResponse);
        }),
      );

      const result = await contractFetch(testContract.getItem, {
        baseUrl: BASE_URL,
        params: { id: "1" },
        query: { include: "details", limit: 10 },
      });

      expect(result).toEqual(mockResponse);
    });

    it("should work with different baseUrl", async () => {
      const mockResponse = { id: "1", name: "Test", count: 1 };

      server.use(
        http.get("https://api.example.com/api/items/1", () => {
          return HttpResponse.json(mockResponse);
        }),
      );

      const result = await contractFetch(testContract.getItem, {
        baseUrl: "https://api.example.com",
        params: { id: "1" },
      });

      expect(result).toEqual(mockResponse);
    });
  });

  describe("POST requests", () => {
    it("should make POST request with JSON body", async () => {
      const requestBody = { name: "New Item", count: 42 };
      const mockResponse = { id: "456", name: "New Item", count: 42 };

      server.use(
        http.post(`${BASE_URL}/api/items`, async ({ request }) => {
          const body = await request.json();

          // 验证请求体
          expect(body).toEqual(requestBody);

          return HttpResponse.json(mockResponse, { status: 201 });
        }),
      );

      const result = await contractFetch(testContract.createItem, {
        baseUrl: BASE_URL,
        body: requestBody,
      });

      expect(result).toEqual(mockResponse);
      expect(result.name).toBe("New Item");
      expect(result.count).toBe(42);
    });

    it("should include custom headers", async () => {
      const mockResponse = { id: "1", name: "Test", count: 1 };

      server.use(
        http.post(`${BASE_URL}/api/items`, async ({ request }) => {
          const authHeader = request.headers.get("Authorization");
          const customHeader = request.headers.get("X-Custom-Header");

          // 验证自定义 headers
          expect(authHeader).toBe("Bearer token123");
          expect(customHeader).toBe("custom-value");

          return HttpResponse.json(mockResponse, { status: 201 });
        }),
      );

      const result = await contractFetch(testContract.createItem, {
        baseUrl: BASE_URL,
        body: { name: "Test", count: 1 },
        headers: {
          Authorization: "Bearer token123",
          "X-Custom-Header": "custom-value",
        },
      });

      expect(result).toEqual(mockResponse);
    });
  });

  describe("Path parameters", () => {
    it("should replace path parameters correctly", async () => {
      const mockResponse = { id: "abc", name: "Test", count: 1 };

      server.use(
        http.get(`${BASE_URL}/api/items/abc`, () => {
          return HttpResponse.json(mockResponse);
        }),
      );

      const result = await contractFetch(testContract.getItem, {
        baseUrl: BASE_URL,
        params: { id: "abc" },
      });

      expect(result.id).toBe("abc");
    });

    it("should encode special characters in path parameters", async () => {
      const mockResponse = { id: "test/123", name: "Test", count: 1 };

      server.use(
        // MSW 会自动解码，所以我们匹配解码后的路径
        http.get(`${BASE_URL}/api/items/test%2F123`, () => {
          return HttpResponse.json(mockResponse);
        }),
      );

      const result = await contractFetch(testContract.getItem, {
        baseUrl: BASE_URL,
        params: { id: "test/123" },
      });

      expect(result.id).toBe("test/123");
    });
  });

  describe("Error handling", () => {
    it("should throw ContractFetchError for 404 response", async () => {
      const errorResponse = {
        error: "not_found",
        error_description: "Item not found",
      };

      server.use(
        http.get(`${BASE_URL}/api/items/999`, () => {
          return HttpResponse.json(errorResponse, { status: 404 });
        }),
      );

      await expect(
        contractFetch(testContract.getItem, {
          baseUrl: BASE_URL,
          params: { id: "999" },
        }),
      ).rejects.toThrow(ContractFetchError);

      try {
        await contractFetch(testContract.getItem, {
          baseUrl: BASE_URL,
          params: { id: "999" },
        });
      } catch (error) {
        expect(error).toBeInstanceOf(ContractFetchError);
        if (error instanceof ContractFetchError) {
          expect(error.status).toBe(404);
          expect(error.data).toEqual(errorResponse);
          expect(error.message).toContain("404");
        }
      }
    });

    it("should throw ContractFetchError for 400 response", async () => {
      const errorResponse = {
        error: "validation_error",
        error_description: "Invalid request body",
      };

      server.use(
        http.post(`${BASE_URL}/api/items`, () => {
          return HttpResponse.json(errorResponse, { status: 400 });
        }),
      );

      await expect(
        contractFetch(testContract.createItem, {
          baseUrl: BASE_URL,
          body: { name: "", count: -1 },
        }),
      ).rejects.toThrow(ContractFetchError);
    });

    it("should handle non-JSON error responses", async () => {
      server.use(
        http.get(`${BASE_URL}/api/items/500`, () => {
          return new HttpResponse("Internal Server Error", {
            status: 500,
            headers: { "Content-Type": "text/plain" },
          });
        }),
      );

      try {
        await contractFetch(testContract.getItem, {
          baseUrl: BASE_URL,
          params: { id: "500" },
        });
      } catch (error) {
        expect(error).toBeInstanceOf(ContractFetchError);
        if (error instanceof ContractFetchError) {
          expect(error.status).toBe(500);
          expect(error.data).toEqual({ error: "request_failed" });
        }
      }
    });
  });

  describe("Binary data", () => {
    it("should handle binary response", async () => {
      const binaryData = new Uint8Array([1, 2, 3, 4, 5]);

      server.use(
        http.get(`${BASE_URL}/api/binary/binary123`, () => {
          return new HttpResponse(binaryData, {
            headers: { "Content-Type": "application/octet-stream" },
          });
        }),
      );

      const result = await contractFetch(testContract.getBinary, {
        baseUrl: BASE_URL,
        params: { id: "binary123" },
      });

      // 返回值应该是 ArrayBuffer
      expect(result).toBeInstanceOf(ArrayBuffer);
      const view = new Uint8Array(result as ArrayBuffer);
      expect(view).toEqual(binaryData);
    });

    it("should handle binary request body", async () => {
      const binaryData = new Uint8Array([10, 20, 30]);

      server.use(
        http.patch(`${BASE_URL}/api/binary/bin456`, async ({ request }) => {
          const body = await request.arrayBuffer();
          const view = new Uint8Array(body);

          // 验证二进制请求体
          expect(view).toEqual(binaryData);

          return HttpResponse.json({ success: true });
        }),
      );

      const result = await contractFetch(testContract.updateBinary, {
        baseUrl: BASE_URL,
        params: { id: "bin456" },
        body: binaryData,
      });

      expect(result).toEqual({ success: true });
    });
  });

  describe("Abort signal", () => {
    it("should handle request cancellation", async () => {
      const controller = new AbortController();

      server.use(
        http.get(`${BASE_URL}/api/items/slow`, async () => {
          // 模拟慢速响应
          await new Promise((resolve) => setTimeout(resolve, 100));
          return HttpResponse.json({ id: "slow", name: "Slow", count: 1 });
        }),
      );

      // 立即取消请求
      controller.abort();

      await expect(
        contractFetch(testContract.getItem, {
          baseUrl: BASE_URL,
          params: { id: "slow" },
          signal: controller.signal,
        }),
      ).rejects.toThrow();
    });
  });

  describe("Type inference", () => {
    it("should infer correct response type for success", async () => {
      server.use(
        http.get(`${BASE_URL}/api/items/1`, () => {
          return HttpResponse.json({ id: "1", name: "Test", count: 5 });
        }),
      );

      const result = await contractFetch(testContract.getItem, {
        baseUrl: BASE_URL,
        params: { id: "1" },
      });

      // TypeScript 编译时验证
      // 这些属性应该存在并且类型正确
      expect(typeof result.id).toBe("string");
      expect(typeof result.name).toBe("string");
      expect(typeof result.count).toBe("number");

      // 验证值
      expect(result.id).toBe("1");
      expect(result.name).toBe("Test");
      expect(result.count).toBe(5);
    });
  });

  describe("Real-world scenarios", () => {
    it("should handle project contract endpoints", async () => {
      // 模拟实际的项目合约响应
      const projectResponse = {
        id: "proj_123",
        name: "My Project",
        created_at: new Date().toISOString(),
      };

      server.use(
        http.post(`${BASE_URL}/api/projects`, async ({ request }) => {
          const body = (await request.json()) as { name: string };
          return HttpResponse.json(
            {
              ...projectResponse,
              name: body.name,
            },
            { status: 201 },
          );
        }),
      );

      // 创建一个简化的项目合约用于测试
      const projectContract = c.router({
        createProject: {
          method: "POST",
          path: "/api/projects",
          body: z.object({
            name: z.string(),
          }),
          responses: {
            201: z.object({
              id: z.string(),
              name: z.string(),
              created_at: z.string(),
            }),
          },
        },
      });

      const result = await contractFetch(projectContract.createProject, {
        baseUrl: BASE_URL,
        body: { name: "Test Project" },
      });

      expect(result.id).toBe("proj_123");
      expect(result.name).toBe("Test Project");
      expect(result.created_at).toBeDefined();
    });
  });
});
