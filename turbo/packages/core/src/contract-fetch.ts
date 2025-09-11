import type { AppRoute } from "@ts-rest/core";

// DOM 类型定义（用于 Node.js 环境）
type HeadersInit = Record<string, string> | Headers;
type BodyInit = string | ArrayBuffer | Uint8Array | Blob | FormData | URLSearchParams;

/**
 * 从合约响应中推断成功响应类型
 */
type InferSuccessResponse<T extends AppRoute> = T["responses"] extends {
  200?: infer R200;
  201?: infer R201;
  204?: infer R204;
}
  ? R200 extends object
    ? R200
    : R201 extends object
    ? R201
    : R204 extends object
    ? R204
    : never
  : never;


/**
 * 执行 fetch 并自动反序列化为合约定义的类型
 * 
 * @example
 * ```typescript
 * import { contractFetch } from "@uspark/core/contract-fetch";
 * import { projectsContract } from "@uspark/core/contracts/projects.contract";
 * 
 * // 简单调用 - 返回类型安全的响应
 * const projects = await contractFetch(projectsContract.listProjects);
 * console.log(projects.projects); // 完全类型安全
 * 
 * // 带参数调用
 * const project = await contractFetch(projectsContract.createProject, {
 *   body: { name: "My Project" }
 * });
 * console.log(project.id); // 类型安全的 CreateProjectResponse
 * 
 * // 带错误处理
 * try {
 *   const data = await contractFetch(projectsContract.getProjectSnapshot, {
 *     params: { projectId: "123" }
 *   });
 * } catch (error) {
 *   if (error.status === 404) {
 *     console.log(error.data.error); // 类型安全的错误响应
 *   }
 * }
 * ```
 */
export async function contractFetch<T extends AppRoute>(
  route: T,
  options: {
    baseUrl?: string;
    body?: unknown;
    params?: Record<string, string>;
    query?: Record<string, unknown>;
    headers?: HeadersInit;
    signal?: AbortSignal;
  } = {}
): Promise<InferSuccessResponse<T>> {
  const { baseUrl = "", body, params, query, headers = {}, signal } = options;

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
    signal,
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

  // 执行请求
  const response = await fetch(url, requestInit);

  // 处理响应
  const contentType = response.headers.get("content-type");
  
  // 对于成功响应
  if (response.ok) {
    // 如果是二进制数据
    if (!contentType || !contentType.includes("application/json")) {
      // 对于二进制响应（如 YJS 数据），直接返回 ArrayBuffer
      // 对于二进制响应，返回 ArrayBuffer，类型系统会处理
      return await response.arrayBuffer() as InferSuccessResponse<T>;
    }
    
    // JSON 响应
    const data = await response.json();
    return data as InferSuccessResponse<T>;
  }

  // 对于错误响应，抛出包含类型信息的错误
  let errorData: unknown = { error: "request_failed" };
  
  if (contentType?.includes("application/json")) {
    try {
      errorData = await response.json();
    } catch {
      // 如果解析失败，使用默认错误
    }
  }

  // 创建类型安全的错误对象
  const error = new ContractFetchError(
    `Request failed with status ${response.status}`,
    response.status,
    errorData,
    response
  );
  
  throw error;
}

/**
 * 合约 fetch 错误类
 */
export class ContractFetchError<T = unknown> extends Error {
  constructor(
    message: string,
    public status: number,
    public data: T,
    public response: Response
  ) {
    super(message);
    this.name = "ContractFetchError";
  }
}

