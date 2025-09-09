import { NextRequest } from "next/server";

/**
 * Helper function to make API calls in tests
 * Simulates HTTP requests to API route handlers
 */
type Handler<TParams = Record<string, unknown>> = (
  request: NextRequest,
  context: { params: Promise<TParams> },
) => Promise<Response>;

export async function apiCall<TParams = Record<string, unknown>>(
  handler: Handler<TParams>,
  method: string,
  params: TParams = {} as TParams,
  body: unknown = null,
) {
  const url = new URL("http://localhost:3000");

  const request =
    body !== null
      ? new NextRequest(url, {
          method,
          body: JSON.stringify(body),
          headers: { "Content-Type": "application/json" },
        })
      : new NextRequest(url, { method });
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
export async function apiCallWithQuery<TParams = Record<string, unknown>>(
  handler: Handler<TParams>,
  params: TParams = {} as TParams,
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
