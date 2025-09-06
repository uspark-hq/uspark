import { Page, BrowserContext } from '@playwright/test';

/**
 * Clerk authentication helper for E2E tests
 * 
 * Methods for authenticating with Clerk:
 * 1. Using test credentials (email/password)
 * 2. Using pre-generated session token
 * 3. Using Clerk's testing tokens
 */

export interface ClerkTestCredentials {
  email?: string;
  password?: string;
  sessionToken?: string;
  testToken?: string;
}

/**
 * Authenticate with Clerk using test credentials
 */
export async function authenticateWithClerk(
  page: Page,
  credentials: ClerkTestCredentials
): Promise<void> {
  if (credentials.sessionToken) {
    // Method 1: Use pre-generated session token
    await page.evaluate((token) => {
      localStorage.setItem('__clerk_db_jwt', token);
    }, credentials.sessionToken);
    
    await page.reload();
    return;
  }
  
  if (credentials.testToken) {
    // Method 2: Use Clerk testing token
    await page.goto(`/sign-in#__clerk_testing_token=${credentials.testToken}`);
    await page.waitForURL(/^((?!sign-in).)*$/); // Wait for redirect away from sign-in
    return;
  }
  
  if (credentials.email && credentials.password) {
    // Method 3: Regular sign-in flow
    await page.goto('/sign-in');
    
    // Fill in email
    await page.fill('input[name="identifier"]', credentials.email);
    await page.click('button:has-text("Continue")');
    
    // Fill in password
    await page.fill('input[name="password"]', credentials.password);
    await page.click('button:has-text("Continue")');
    
    // Wait for redirect
    await page.waitForURL(/^((?!sign-in).)*$/);
    return;
  }
  
  throw new Error('No valid authentication credentials provided');
}

/**
 * Create an authenticated browser context
 */
export async function createAuthenticatedContext(
  browser: any,
  credentials: ClerkTestCredentials
): Promise<BrowserContext> {
  const context = await browser.newContext();
  const page = await context.newPage();
  
  await authenticateWithClerk(page, credentials);
  
  // Save auth state
  const storageState = await context.storageState();
  await page.close();
  
  // Create new context with saved auth
  return await browser.newContext({ storageState });
}

/**
 * Get test credentials from environment variables
 */
export function getTestCredentials(): ClerkTestCredentials {
  return {
    email: process.env.CLERK_TEST_EMAIL,
    password: process.env.CLERK_TEST_PASSWORD,
    sessionToken: process.env.CLERK_TEST_SESSION_TOKEN,
    testToken: process.env.CLERK_TEST_TOKEN,
  };
}