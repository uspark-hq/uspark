import { chromium } from "playwright";
import { clerk, clerkSetup } from "@clerk/testing/playwright";
import { spawn, ChildProcess } from "child_process";
import * as dotenv from "dotenv";

// 加载环境变量
dotenv.config({ path: ".env" });

/**
 * 本地环境 CLI 认证自动化
 * 确保本地开发服务器运行在 localhost:3000
 */
export async function automateLocalCliAuth() {
  let cliProcess: ChildProcess | null = null;
  let browser = null;

  try {
    console.log("🚀 启动本地 CLI 认证流程...");
    console.log("⚠️  请确保本地开发服务器运行在 http://localhost:3000");

    // 修改 CLI 命令使其指向本地环境
    cliProcess = spawn("uspark", ["auth", "login", "--api-url", "http://localhost:3000"], {
      cwd: process.cwd(),
      stdio: ["pipe", "pipe", "pipe"],
      env: {
        ...process.env,
        USPARK_API_URL: "http://localhost:3000", // 强制使用本地 API
      }
    });

    // 捕获设备码
    const deviceCode = await new Promise<string>((resolve, reject) => {
      let output = "";
      const timeout = setTimeout(() => {
        reject(new Error("超时：无法获取设备码"));
      }, 10000);

      cliProcess!.stdout?.on("data", (data) => {
        output += data.toString();
        console.log(data.toString());

        const codeMatch = output.match(/enter this code:\s*([A-Z0-9]{4}-[A-Z0-9]{4})/i);
        if (codeMatch) {
          clearTimeout(timeout);
          resolve(codeMatch[1]);
        }
      });

      cliProcess!.stderr?.on("data", (data) => {
        console.error("CLI 错误:", data.toString());
      });

      cliProcess!.on("error", (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });

    console.log(`✅ 获取到设备码: ${deviceCode}`);

    // 启动浏览器
    browser = await chromium.launch({
      headless: true,
    });

    const context = await browser.newContext();
    const page = await context.newPage();

    // 设置 Clerk 认证
    await clerkSetup();

    // 登录 Clerk (本地环境)
    await page.goto("http://localhost:3000");
    await clerk.signIn({
      page,
      emailAddress: "e2e+clerk_test@uspark.ai",
    });

    console.log("✅ Clerk 登录成功");

    // 访问本地 CLI 认证页面
    await page.goto("http://localhost:3000/cli-auth");
    await page.waitForLoadState("networkidle");

    // 输入设备码
    const codeInput = await page.waitForSelector('input[placeholder*="code"], input[name*="code"], input[type="text"]', {
      timeout: 5000,
    });

    await codeInput.fill(deviceCode);
    console.log(`✅ 已输入设备码: ${deviceCode}`);

    // 提交认证
    const submitButton = await page.locator('button[type="submit"], button:has-text("Verify"), button:has-text("Submit")').first();
    await submitButton.click();

    console.log("✅ 已提交认证请求");

    // 等待认证成功
    await page.waitForSelector('text=/success|verified|completed/i', {
      timeout: 10000,
    }).catch(() => {
      console.log("⚠️  未找到成功提示，检查 CLI 输出...");
    });

    // 等待 CLI 进程完成
    await new Promise<void>((resolve) => {
      if (!cliProcess) {
        resolve();
        return;
      }

      let resolved = false;
      cliProcess.on("exit", (code) => {
        if (!resolved) {
          console.log(`CLI 进程退出，代码: ${code}`);
          resolved = true;
          resolve();
        }
      });

      // 监听成功消息
      cliProcess.stdout?.on("data", (data) => {
        const output = data.toString();
        if (output.includes("Authentication successful") || output.includes("✓")) {
          console.log("✅ CLI 认证成功！");
          if (!resolved) {
            resolved = true;
            resolve();
          }
        }
      });

      // 超时处理
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          resolve();
        }
      }, 5000);
    });

    console.log("🎉 本地 CLI 认证流程完成!");

  } catch (error) {
    console.error("❌ 认证失败:", error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
    if (cliProcess && !cliProcess.killed) {
      cliProcess.kill();
    }
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  automateLocalCliAuth()
    .then(() => {
      console.log("✅ 本地自动化认证成功完成");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ 本地自动化认证失败:", error);
      process.exit(1);
    });
}