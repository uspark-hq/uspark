import { NextRequest } from "next/server";

/**
 * Helper function to make API calls in tests
 * Simulates HTTP requests to API route handlers
 */
type Handler = (...args: unknown[]) => Promise<Response>;

export async function apiCall(
  handler: Handler,
  method: string,
  params: Record<string, unknown> = {},
  body: unknown = null,
) {
  const url = new URL("http://localhost:3000");
  const options: RequestInit = { method };

  if (body !== null) {
    options.body = JSON.stringify(body);
    options.headers = { "Content-Type": "application/json" };
  }

  const request = new NextRequest(url, options);
  const context = { params: Promise.resolve(params) };
  const response = await handler(request, context);

  if (response.headers.get("content-type")?.includes("application/json")) {
    return {
      status: response.status,
      data: await response.json(),
    };
  }

  return {
    status: response.status,
    data: null,
  };
}

/**
 * Helper to make GET requests with query parameters
 */
export async function apiCallWithQuery(
  handler: Handler,
  params: Record<string, unknown> = {},
  queryParams: Record<string, string> = {},
) {
  const url = new URL("http://localhost:3000");

  // Add query parameters to URL
  Object.entries(queryParams).forEach(([key, value]) => {
    url.searchParams.append(key, value);
  });

  const request = new NextRequest(url, { method: "GET" });
  const context = { params: Promise.resolve(params) };
  const response = await handler(request, context);

  if (response.headers.get("content-type")?.includes("application/json")) {
    return {
      status: response.status,
      data: await response.json(),
    };
  }

  return {
    status: response.status,
    data: null,
  };
}
