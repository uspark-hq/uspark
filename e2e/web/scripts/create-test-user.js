#!/usr/bin/env node

/**
 * 使用 Clerk Backend API 创建测试用户
 */

const https = require('https');
require('dotenv').config({ path: '.env.local' });

const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;
const TEST_EMAIL = process.env.E2E_CLERK_USER_USERNAME || 'test@example.com';
const TEST_PASSWORD = process.env.E2E_CLERK_USER_PASSWORD || 'TestPassword123!';

if (!CLERK_SECRET_KEY) {
  console.error('❌ CLERK_SECRET_KEY not found in environment');
  process.exit(1);
}

// 从 Secret Key 提取实例 ID
// sk_test_xxx 格式中，实例信息在 publishable key 中
const instanceId = 'casual-monkfish-39'; // 从你的 publishable key 中提取

async function createTestUser() {
  console.log('🔄 Creating test user:', TEST_EMAIL);
  
  const userData = {
    email_address: [TEST_EMAIL],
    password: TEST_PASSWORD,
    skip_password_checks: true,
    skip_password_requirement: true
  };

  const options = {
    hostname: `api.clerk.com`,
    path: '/v1/users',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${CLERK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        const result = JSON.parse(data);
        
        if (res.statusCode === 200 || res.statusCode === 201) {
          console.log('✅ User created successfully!');
          console.log('User ID:', result.id);
          console.log('Email:', result.email_addresses[0]?.email_address);
          resolve(result);
        } else if (res.statusCode === 422 && data.includes('already exists')) {
          console.log('⚠️  User already exists - that\'s OK!');
          resolve(null);
        } else {
          console.error('❌ Failed to create user:', res.statusCode);
          console.error('Response:', result);
          reject(new Error(`API returned ${res.statusCode}`));
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('❌ Request failed:', error);
      reject(error);
    });
    
    req.write(JSON.stringify(userData));
    req.end();
  });
}

// 主函数
async function main() {
  try {
    console.log('🚀 Clerk Test User Setup');
    console.log('========================');
    console.log('Instance:', instanceId);
    console.log('Email:', TEST_EMAIL);
    console.log('Password:', TEST_PASSWORD);
    console.log('');
    
    await createTestUser();
    
    console.log('\n📝 Next steps:');
    console.log('1. User is ready for testing');
    console.log('2. Run: npm run test:env');
    
  } catch (error) {
    console.error('Setup failed:', error.message);
    console.log('\n📝 Alternative: Create user manually in Clerk Dashboard');
    console.log('1. Go to: https://dashboard.clerk.com');
    console.log('2. Select your test application');
    console.log('3. Go to Users → Create User');
    console.log(`4. Email: ${TEST_EMAIL}`);
    console.log(`5. Password: ${TEST_PASSWORD}`);
  }
}

main();