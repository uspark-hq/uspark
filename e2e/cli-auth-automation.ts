import { chromium } from "playwright";
import { clerk, clerkSetup } from "@clerk/testing/playwright";
import { spawn, ChildProcess } from "child_process";
import * as dotenv from "dotenv";

// 加载环境变量
dotenv.config({ path: ".env" });

/**
 * 自动化 CLI 认证流程
 * 1. 启动 CLI 认证命令
 * 2. 解析设备码
 * 3. 使用 Playwright 自动登录并输入码
 *
 * @param apiHost - API 服务器地址，默认使用环境变量 API_HOST 或 localhost:3000
 */
export async function automateCliAuth(apiHost?: string) {
  let cliProcess: ChildProcess | null = null;
  let browser = null;

  try {
    console.log("🚀 启动 CLI 认证流程...");

    // 步骤 1: 启动 CLI auth 命令
    // 使用提供的 apiHost 或环境变量 API_HOST，默认为 localhost:3000
    const apiUrl = apiHost || process.env.API_HOST || "http://localhost:3000";
    console.log(`📡 连接到 API: ${apiUrl}`);

    // 使用全局安装的 uspark 命令（GitHub Actions 已经通过 pnpm link 安装）
    // 或者使用 tsx 运行源码（本地开发）
    const useGlobalCLI = process.env.USE_GLOBAL_CLI === 'true' || process.env.CI === 'true';

    if (useGlobalCLI) {
      // 在 CI 环境或明确指定时，使用全局安装的 CLI
      cliProcess = spawn("uspark", ["auth", "login"], {
        cwd: process.cwd(),
        stdio: ["pipe", "pipe", "pipe"],
        env: {
          ...process.env,
          API_HOST: apiUrl  // 设置 API_HOST 环境变量
        }
      });
    } else {
      // 本地开发环境，使用 tsx 运行源码
      const path = require("path");
      const cliPath = process.env.CLI_PATH || path.resolve(__dirname, "../turbo/apps/cli/src/index.ts");
      cliProcess = spawn("tsx", [cliPath, "auth", "login"], {
        cwd: process.cwd(),
        stdio: ["pipe", "pipe", "pipe"],
        env: {
          ...process.env,
          API_HOST: apiUrl  // 设置 API_HOST 环境变量
        }
      });
    }

    // 步骤 2: 捕获并解析设备码和 URL
    let cliOutput = "";
    const { deviceCode, authUrl } = await new Promise<{ deviceCode: string; authUrl: string }>((resolve, reject) => {
      let output = "";
      const timeout = setTimeout(() => {
        reject(new Error("超时：无法获取设备码"));
      }, 10000);

      cliProcess!.stdout?.on("data", (data) => {
        output += data.toString();
        console.log(data.toString());

        // 匹配设备码格式: XXXX-XXXX
        const codeMatch = output.match(/enter this code:\s*([A-Z0-9]{4}-[A-Z0-9]{4})/i);
        const urlMatch = output.match(/visit:\s*(https?:\/\/[^\s]+\/cli-auth)/i);

        if (codeMatch) {
          clearTimeout(timeout);
          cliOutput = output;
          resolve({
            deviceCode: codeMatch[1],
            authUrl: urlMatch ? urlMatch[1] : `${apiUrl}/cli-auth`
          });
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

    // 步骤 3: 启动浏览器并完成认证
    browser = await chromium.launch({
      headless: true, // 在无头模式下运行
    });

    const context = await browser.newContext();
    const page = await context.newPage();

    // 步骤 4: 设置 Clerk 认证
    await clerkSetup();

    // 步骤 5: 登录 Clerk
    // 使用配置的 API URL
    const baseUrl = apiUrl;

    await page.goto(baseUrl);
    await clerk.signIn({
      page,
      emailAddress: "e2e+clerk_test@uspark.ai",
    });

    console.log("✅ Clerk 登录成功");
    console.log(`🔗 访问认证页面: ${baseUrl}/cli-auth`);

    // 步骤 6: 访问 CLI 认证页面
    await page.goto(`${baseUrl}/cli-auth`);
    await page.waitForLoadState("networkidle");

    // 步骤 7: 输入设备码
    // 设备码格式: XXXX-XXXX，需要分别输入到多个输入框
    console.log(`📝 正在输入设备码: ${deviceCode}`);

    // 去掉连字符，得到纯字符
    const codeChars = deviceCode.replace('-', '');

    // 查找所有输入框
    const codeInputs = await page.locator('input[type="text"], input[maxlength="1"]').all();
    console.log(`🔍 找到 ${codeInputs.length} 个输入框`);

    // 输入每个字符到对应的输入框
    for (let i = 0; i < codeChars.length && i < codeInputs.length; i++) {
      await codeInputs[i].fill(codeChars[i]);
      // 添加小延迟，模拟真实输入
      await page.waitForTimeout(50);
    }

    console.log(`✅ 已输入设备码: ${deviceCode}`);

    // 调试: 截图看看页面状态
    await page.screenshot({ path: 'debug-before-submit.png' });

    // 查找并点击 Authorize Device 按钮
    const authorizeButton = await page.locator('button:has-text("Authorize Device")');
    const buttonExists = await authorizeButton.count() > 0;

    if (buttonExists) {
      console.log("✅ 找到 Authorize Device 按钮");

      // 点击按钮
      await authorizeButton.first().click();
      console.log("✅ 已点击 Authorize Device 按钮");

      // 等待页面响应
      await page.waitForTimeout(2000);

      // 截图查看点击后的状态
      await page.screenshot({ path: 'debug-after-click.png' });
      console.log("📸 已保存点击后的截图");
    } else {
      console.log("❌ 未找到 Authorize Device 按钮");
      // 尝试按 Enter
      await codeInput.press('Enter');
      console.log("⏳ 尝试按 Enter 提交");
    }

    console.log("⏳ 等待认证响应...");

    // 步骤 9: 等待认证成功
    // 可以通过检查页面提示或 CLI 输出确认
    await page.waitForSelector('text=/success|verified|completed/i', {
      timeout: 10000,
    }).catch(() => {
      console.log("⚠️  未找到成功提示，但可能已经认证成功");
    });

    // 等待 CLI 进程完成认证
    const authSuccess = await new Promise<boolean>((resolve) => {
      if (!cliProcess) {
        resolve(false);
        return;
      }

      let resolved = false;

      // 监听 CLI 输出中的成功消息
      cliProcess.stdout?.on("data", (data) => {
        const output = data.toString();

        // 只打印非空输出
        if (output.trim()) {
          console.log("CLI:", output.trim());
        }

        if (output.includes("Authentication successful") ||
            output.includes("Successfully authenticated") ||
            output.includes("✓ Authentication complete") ||
            output.includes("✓")) {
          if (!resolved) {
            console.log("🎉 检测到认证成功！");
            resolved = true;
            resolve(true);
          }
        }
      });

      cliProcess.stderr?.on("data", (data) => {
        const error = data.toString().trim();
        if (error) {
          console.error("CLI 错误:", error);
        }
      });

      cliProcess.on("exit", (code) => {
        if (!resolved) {
          console.log(`CLI 进程退出，代码: ${code}`);
          resolved = true;
          resolve(code === 0);
        }
      });

      // 增加超时时间
      setTimeout(() => {
        if (!resolved) {
          console.log("⏱️ 超时（15秒），检查认证状态...");
          resolved = true;
          resolve(false);
        }
      }, 15000);
    });

    if (!authSuccess) {
      throw new Error("CLI 认证似乎未成功完成");
    }

    console.log("🎉 CLI 认证流程完成!");

    // 验证认证文件是否创建
    const fs = require("fs");
    const os = require("os");
    const path = require("path");
    const configPath = path.join(os.homedir(), ".uspark", "config.json");

    if (fs.existsSync(configPath)) {
      console.log("✅ 认证文件已创建:", configPath);
      const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      if (config.token) {
        console.log("✅ 认证令牌已保存");
      }
    } else {
      console.log("⚠️  警告: 认证文件未找到，可能需要重试");
    }

  } catch (error) {
    console.error("❌ 认证失败:", error);
    throw error;
  } finally {
    // 清理资源
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
  // 可以通过命令行参数或环境变量指定 API_HOST
  const apiHost = process.argv[2] || process.env.API_HOST;

  automateCliAuth(apiHost)
    .then(() => {
      console.log("✅ 自动化认证成功完成");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ 自动化认证失败:", error);
      process.exit(1);
    });
}