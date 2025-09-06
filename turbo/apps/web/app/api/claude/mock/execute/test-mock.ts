#!/usr/bin/env tsx

async function testMockExecutor() {
  const baseUrl = "http://localhost:3000";

  console.log("Testing mock executor...\n");

  const projectId = "proj_test_123";
  const sessionId = "session_test_456";
  const message = "Please help me create a new React component";

  console.log("1. Starting mock execution...");
  const executeResponse = await fetch(`${baseUrl}/api/claude/mock/execute`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectId, sessionId, message }),
  });

  const executeResult = await executeResponse.json();
  console.log("   Response:", executeResult);

  if (!executeResponse.ok) {
    console.error("Failed to start execution:", executeResult);
    return;
  }

  const { turnId } = executeResult;

  console.log("\n2. Waiting for execution to complete...");
  await new Promise((resolve) => setTimeout(resolve, 4000));

  console.log("\n3. Fetching turn status...");
  const statusResponse = await fetch(
    `${baseUrl}/api/claude/mock/execute?sessionId=${sessionId}&turnId=${turnId}`,
  );

  const turnStatus = await statusResponse.json();
  console.log("   Turn status:", turnStatus.status);
  console.log("   Blocks generated:", turnStatus.blocks?.length || 0);

  if (turnStatus.blocks) {
    console.log("\n4. Blocks detail:");
    turnStatus.blocks.forEach(
      (block: { type: string; content: string }, index: number) => {
        console.log(`   Block ${index + 1}: ${block.type}`);
        if (block.type === "text" || block.type === "thinking") {
          console.log(`     Content: ${block.content.substring(0, 50)}...`);
        }
      },
    );
  }

  console.log("\n5. Fetching all session turns...");
  const allTurnsResponse = await fetch(
    `${baseUrl}/api/claude/mock/execute?sessionId=${sessionId}`,
  );

  const sessionData = await allTurnsResponse.json();
  console.log("   Total turns in session:", sessionData.turns?.length || 0);

  console.log("\n✅ Test completed successfully!");
}

if (require.main === module) {
  testMockExecutor().catch(console.error);
}
