import { chromium, Page } from "playwright";
import { spawn, ChildProcess } from "child_process";
import * as readline from "readline";

/**
 * 半自动化 CLI 认证助手
 * 可以选择自动登录或手动登录
 */
export async function interactiveCliAuth() {
  let cliProcess: ChildProcess | null = null;
  let browser = null;

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const question = (query: string): Promise<string> =>
    new Promise(resolve => rl.question(query, resolve));

  try {
    console.log("🚀 CLI 认证助手");
    console.log("================");

    // 询问环境
    const env = await question("选择环境 (1=本地localhost:3000, 2=生产uspark.ai): ");
    const isLocal = env === "1";
    const apiUrl = isLocal ? "http://localhost:3000" : "https://www.uspark.ai";

    // 启动 CLI
    console.log(`\n📡 连接到: ${apiUrl}`);
    const cliArgs = isLocal ?
      ["auth", "login", "--api-url", apiUrl] :
      ["auth", "login"];

    cliProcess = spawn("uspark", cliArgs, {
      cwd: process.cwd(),
      stdio: ["pipe", "pipe", "pipe"],
      env: isLocal ? {
        ...process.env,
        USPARK_API_URL: apiUrl
      } : process.env
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

    console.log(`\n✅ 设备码: ${deviceCode}`);
    console.log("================\n");

    // 询问登录方式
    const loginMode = await question("选择登录方式 (1=自动打开浏览器, 2=手动复制代码): ");

    if (loginMode === "2") {
      // 手动模式
      console.log("\n📋 请手动操作:");
      console.log(`1. 打开浏览器访问: ${apiUrl}/cli-auth`);
      console.log(`2. 登录您的账号`);
      console.log(`3. 输入设备码: ${deviceCode}`);
      console.log(`4. 点击验证按钮\n`);

      // 等待 CLI 认证完成
      await new Promise<void>((resolve) => {
        cliProcess!.on("exit", () => resolve());
        cliProcess!.stdout?.on("data", (data) => {
          if (data.toString().includes("Authentication successful")) {
            console.log("✅ 认证成功！");
            resolve();
          }
        });
      });

    } else {
      // 自动模式
      const headless = await question("无头模式运行? (y/n): ");

      browser = await chromium.launch({
        headless: headless.toLowerCase() === 'y',
      });

      const context = await browser.newContext();
      const page = await context.newPage();

      // 导航到认证页面
      await page.goto(`${apiUrl}/cli-auth`);

      // 检查是否需要登录
      const needsLogin = await page.locator('input[type="email"], input[type="password"]').count() > 0;

      if (needsLogin) {
        console.log("\n需要登录...");
        const autoLogin = await question("使用自动登录? (仅本地环境可用) (y/n): ");

        if (autoLogin.toLowerCase() === 'y' && isLocal) {
          // 尝试使用 Clerk 测试登录
          try {
            const { clerkSetup, clerk } = await import("@clerk/testing/playwright");
            await clerkSetup();
            await clerk.signIn({
              page,
              emailAddress: "e2e+clerk_test@uspark.ai",
            });
            console.log("✅ 自动登录成功");
          } catch (error) {
            console.log("⚠️  自动登录失败，请手动登录");
            await manualLogin(page);
          }
        } else {
          await manualLogin(page);
        }
      }

      // 输入设备码
      console.log("\n正在输入设备码...");
      await page.waitForSelector('input[type="text"], input[placeholder*="code"]', { timeout: 10000 });

      const codeInput = page.locator('input[type="text"], input[placeholder*="code"]').first();
      await codeInput.fill(deviceCode);

      // 尝试提交 - 先按 Enter，如果不行再找按钮
      await codeInput.press('Enter');

      // 等待一下看是否提交成功
      await page.waitForTimeout(2000);

      // 检查是否还在同一页面（可能需要点击按钮）
      const stillOnPage = await page.url().includes('cli-auth');
      if (stillOnPage) {
        console.log("尝试点击提交按钮...");
        const buttons = await page.locator('button').all();
        for (const button of buttons) {
          const text = await button.textContent();
          console.log(`找到按钮: ${text}`);
          if (text && /verify|submit|confirm|authorize|验证|确认/i.test(text)) {
            await button.click();
            break;
          }
        }
      }

      console.log("✅ 已提交认证");

      // 等待认证完成
      await new Promise<void>((resolve) => {
        let resolved = false;

        cliProcess!.on("exit", (code) => {
          if (!resolved) {
            console.log(`CLI 退出，代码: ${code}`);
            resolved = true;
            resolve();
          }
        });

        cliProcess!.stdout?.on("data", (data) => {
          if (data.toString().includes("Authentication successful") || data.toString().includes("✓")) {
            if (!resolved) {
              console.log("✅ CLI 认证成功！");
              resolved = true;
              resolve();
            }
          }
        });

        setTimeout(() => {
          if (!resolved) {
            console.log("⏱️  超时，请检查 CLI 状态");
            resolved = true;
            resolve();
          }
        }, 10000);
      });
    }

    console.log("\n🎉 认证流程完成!");

  } catch (error) {
    console.error("❌ 错误:", error);
  } finally {
    rl.close();
    if (browser) await browser.close();
    if (cliProcess && !cliProcess.killed) cliProcess.kill();
  }
}

async function manualLogin(page: Page) {
  console.log("\n请在浏览器中手动登录...");
  console.log("等待登录完成...");

  // 等待登录完成 - 检查 URL 变化或登录表单消失
  await page.waitForFunction(
    () => !window.location.pathname.includes('sign-in') && !window.location.pathname.includes('sign-up'),
    { timeout: 120000 } // 2分钟超时
  );

  console.log("✅ 登录成功");
}

// 运行脚本
if (require.main === module) {
  interactiveCliAuth()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}