#!/usr/bin/env node

/**
 * 安全检查脚本
 * 运行测试前验证环境配置
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// 加载 .env.local
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

console.log('🔍 Checking E2E test environment...\n');

// 1. 检查是否在 CI 环境
const isCI = process.env.CI === 'true';
const isProduction = process.env.NODE_ENV === 'production';

if (isProduction) {
  console.error('❌ ERROR: Cannot run E2E tests in production environment!');
  process.exit(1);
}

// 2. 检查 .env.local 文件
const envPath = path.join(__dirname, '..', '.env.local');
const envExists = fs.existsSync(envPath);

if (!envExists && !isCI) {
  console.error('❌ .env.local file not found');
  console.log('Please create .env.local from .env.example.full');
  process.exit(1);
}

// 3. 验证环境变量
const requiredVars = [
  'CLERK_PUBLISHABLE_KEY',
  'E2E_CLERK_USER_USERNAME', 
  'E2E_CLERK_USER_PASSWORD'
];

const secretKeyRequired = [
  'CLERK_SECRET_KEY'
];

const missing = [];
const warnings = [];

// 检查必需变量
requiredVars.forEach(key => {
  if (!process.env[key]) {
    missing.push(key);
  }
});

// 检查 Secret Key（警告）
secretKeyRequired.forEach(key => {
  if (!process.env[key]) {
    warnings.push(`⚠️  ${key} not set - some tests may be skipped`);
  } else {
    // 验证密钥格式
    const value = process.env[key];
    if (key === 'CLERK_SECRET_KEY' && !value.startsWith('sk_test_')) {
      console.error(`❌ ${key} should be a test key (sk_test_*), not production!`);
      process.exit(1);
    }
  }
});

// 4. 检查密钥安全性
if (process.env.CLERK_SECRET_KEY) {
  const secretKey = process.env.CLERK_SECRET_KEY;
  
  // 确保使用测试密钥
  if (!secretKey.startsWith('sk_test_')) {
    console.error('❌ SECURITY ERROR: Using production secret key in tests!');
    console.error('Only use test keys (sk_test_*) for E2E testing');
    process.exit(1);
  }
  
  // CI 环境检查
  if (isCI) {
    console.log('✅ Running in CI environment - ensure secrets are properly configured');
  } else {
    console.log('⚠️  Running locally with Secret Key - ensure .env.local is in .gitignore');
  }
}

// 5. 报告结果
if (missing.length > 0) {
  console.error('❌ Missing required environment variables:');
  missing.forEach(key => console.error(`   - ${key}`));
  console.log('\nPlease set these in .env.local or environment');
  process.exit(1);
}

warnings.forEach(warning => console.log(warning));

// 6. 显示配置摘要
console.log('\n📋 Configuration Summary:');
console.log(`Environment: ${isCI ? 'CI' : 'Local'}`);
console.log(`Base URL: ${process.env.BASE_URL || 'https://app.uspark.ai'}`);
console.log(`Test User: ${process.env.E2E_CLERK_USER_USERNAME || 'Not set'}`);
console.log(`Secret Key: ${process.env.CLERK_SECRET_KEY ? '✅ Set (test key)' : '❌ Not set'}`);

console.log('\n✅ Environment check passed\n');