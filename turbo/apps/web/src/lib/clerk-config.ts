import { env } from "../env";

/**
 * 获取 Clerk Publishable Key
 * 通过 GitHub Environment 在部署时注入不同环境的值
 */
export function getClerkPublishableKey(): string {
  const environment = env();
  return environment.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
}
