import test, { expect } from "@playwright/test";
import { clerk, clerkSetup } from "@clerk/testing/playwright";
import { spawn } from "child_process";

test.describe("CLI Authentication Automation", () => {
  test.beforeAll(async () => {
    await clerkSetup();
  });

  test("automated CLI login with device code", async ({ page }) => {
    // 启动 CLI auth 进程
    const cliProcess = spawn("uspark", ["auth", "login"], {
      cwd: process.cwd(),
      stdio: ["pipe", "pipe", "pipe"],
    });

    try {
      // 捕获设备码
      const deviceCode = await new Promise<string>((resolve, reject) => {
        let output = "";
        const timeout = setTimeout(() => {
          reject(new Error("Timeout waiting for device code"));
        }, 10000);

        cliProcess.stdout?.on("data", (data) => {
          output += data.toString();

          // 匹配设备码 (格式: XXXX-XXXX)
          const match = output.match(/enter this code:\s*([A-Z0-9]{4}-[A-Z0-9]{4})/i);
          if (match) {
            clearTimeout(timeout);
            resolve(match[1]);
          }
        });

        cliProcess.on("error", (err) => {
          clearTimeout(timeout);
          reject(err);
        });
      });

      console.log(`Device code captured: ${deviceCode}`);

      // 使用 Clerk 登录
      await page.goto("/");
      await clerk.signIn({
        page,
        emailAddress: "e2e+clerk_test@uspark.ai",
      });

      // 访问 CLI 认证页面
      await page.goto("/cli-auth");

      // 输入设备码
      const codeInput = await page.waitForSelector(
        'input[placeholder*="code"], input[name*="code"], input#code',
        { timeout: 5000 }
      );
      await codeInput.fill(deviceCode);

      // 提交认证
      const submitButton = page.locator('button[type="submit"], button:has-text("Verify")').first();
      await submitButton.click();

      // 等待认证成功提示
      await expect(page.locator('text=/success|verified|authenticated/i')).toBeVisible({
        timeout: 10000,
      });

      // 验证 CLI 进程成功完成
      const cliExitCode = await new Promise<number | null>((resolve) => {
        cliProcess.on("exit", (code) => resolve(code));

        // 设置超时
        setTimeout(() => resolve(null), 5000);
      });

      expect(cliExitCode).toBe(0);

    } finally {
      // 确保清理 CLI 进程
      if (!cliProcess.killed) {
        cliProcess.kill();
      }
    }
  });

  test("CLI auth with manual device code input helper", async ({ page }) => {
    // 这个测试可以用于半自动测试，输出设备码供手动测试
    console.log("\n=== 手动测试模式 ===");
    console.log("1. 在终端运行: uspark auth login");
    console.log("2. 复制显示的设备码");
    console.log("3. 此测试会自动登录并导航到认证页面");
    console.log("4. 手动粘贴设备码完成认证\n");

    // 自动登录
    await page.goto("/");
    await clerk.signIn({
      page,
      emailAddress: "e2e+clerk_test@uspark.ai",
    });

    // 导航到 CLI 认证页面
    await page.goto("/cli-auth");

    // 等待页面加载
    await expect(page.locator('input[placeholder*="code"], input#code')).toBeVisible();

    // 保持页面打开 30 秒，供手动测试
    await page.waitForTimeout(30000);
  });
});