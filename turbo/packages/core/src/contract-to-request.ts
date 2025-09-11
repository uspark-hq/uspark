import type { AppRoute } from "@ts-rest/core";

// DOM 类型定义（用于 Node.js 环境）
type HeadersInit = Record<string, string> | Headers;
type BodyInit = string | ArrayBuffer | Uint8Array | Blob | FormData | URLSearchParams;

/**
 * 将 ts-rest 合约端点转换为 Request 对象
 * 
 * @example
 * ```typescript
 * import { projectsContract } from "./contracts/projects.contract";
 * 
 * // GET 请求 - 直接使用合约中的路径
 * const request = contractToRequest(projectsContract.listProjects);
 * 
 * // POST 请求带 body
 * const request = contractToRequest(projectsContract.createProject, {
 *   body: { name: "My Project" }
 * });
 * 
 * // 带路径参数
 * const request = contractToRequest(projectsContract.getProjectSnapshot, {
 *   params: { projectId: "123" }
 * });
 * 
 * // 需要时可以添加 baseUrl（比如 CLI 或跨域调用）
 * const request = contractToRequest(projectsContract.listProjects, {
 *   baseUrl: "https://api.example.com"
 * });
 * ```
 */
export function contractToRequest<T extends AppRoute>(
  route: T,
  options: {
    baseUrl?: string;
    body?: unknown;
    params?: Record<string, string>;
    query?: Record<string, unknown>;
    headers?: HeadersInit;
  } = {}
): Request {
  const { baseUrl = "", body, params, query, headers = {} } = options;

  // 构建 URL
  let url = `${baseUrl}${route.path}`;

  // 替换路径参数
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url = url.replace(`:${key}`, encodeURIComponent(value));
    }
  }

  // 添加查询参数
  if (query) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    }
    const queryString = searchParams.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }

  // 构建请求配置
  const requestInit: RequestInit = {
    method: route.method,
    headers: { ...headers },
  };

  // 处理请求体
  if (body !== undefined) {
    if (body instanceof Uint8Array || body instanceof ArrayBuffer) {
      // 二进制数据
      requestInit.body = body as BodyInit;
    } else if (typeof body === "object") {
      // JSON 数据
      requestInit.body = JSON.stringify(body);
      requestInit.headers = {
        "Content-Type": "application/json",
        ...requestInit.headers,
      };
    } else {
      // 字符串或其他数据
      requestInit.body = body as BodyInit;
    }
  }

  return new Request(url, requestInit);
}