import { NextRequest } from "next/server";

/**
 * Helper function to make API calls in tests
 * Simulates HTTP requests to API route handlers
 */
export async function apiCall(
  handler: Function,
  method: string,
  params: any = {},
  body: any = null
) {
  const url = new URL("http://localhost:3000");
  const options: any = { method };
  
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
      data: await response.json()
    };
  }
  
  return {
    status: response.status,
    data: null
  };
}

/**
 * Helper to make GET requests with query parameters
 */
export async function apiCallWithQuery(
  handler: Function,
  params: any = {},
  queryParams: Record<string, string> = {}
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
      data: await response.json()
    };
  }
  
  return {
    status: response.status,
    data: null
  };
}