import { clerkSetup } from '@clerk/testing/playwright';
import * as dotenv from 'dotenv';
import * as path from 'path';

// 加载 .env.local
dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });

/**
 * Global Setup for Clerk E2E Testing
 * 
 * This runs once before all tests to:
 * 1. Obtain a Testing Token from Clerk using Secret Key
 * 2. Setup authentication state for all tests
 * 3. Bypass bot detection mechanisms
 */
async function globalSetup() {
  // 验证必需的环境变量
  const required = [
    'CLERK_PUBLISHABLE_KEY',
    'CLERK_SECRET_KEY'
  ];
  
  const missing = required.filter(key => !process.env[key]);
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:', missing);
    console.log('Please create .env.local with the required variables');
    console.log('See .env.example.full for reference');
    process.exit(1);
  }
  
  // 可选的用户凭证，用于某些需要真实登录的测试
  if (process.env.E2E_CLERK_USER_USERNAME && process.env.E2E_CLERK_USER_PASSWORD) {
    console.log('📧 Test user credentials provided for UI-based login tests');
  } else {
    console.log('ℹ️ No test user credentials provided - some tests may be skipped');
  }
  
  console.log('🔐 Setting up Clerk testing environment...');
  
  try {
    // clerkSetup 会：
    // 1. 使用 SECRET_KEY 调用 Clerk API
    // 2. 获取临时的 Testing Token
    // 3. 设置 CLERK_TESTING_TOKEN 环境变量
    await clerkSetup();
    
    console.log('✅ Clerk setup completed successfully');
    
    // 如果 auth.json 不存在，创建一个空的
    const fs = require('fs');
    const path = require('path');
    const authPath = path.join(__dirname, '..', 'playwright', '.clerk', 'auth.json');
    if (!fs.existsSync(authPath)) {
      const dir = path.dirname(authPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      // 创建空的 storage state
      fs.writeFileSync(authPath, JSON.stringify({
        cookies: [],
        origins: []
      }));
      console.log('📝 Created empty auth.json');
    }
  } catch (error) {
    console.error('❌ Clerk setup failed:', error);
    throw error;
  }
}

export default globalSetup;