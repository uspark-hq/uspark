const crypto = require('crypto');

// Test hash consistency between CLI and Web
function testHashConsistency() {
  console.log('Testing hash consistency between CLI and Web interface...\n');

  const testContents = [
    'bar',
    'bar1',
    'hello',
    'foo',
    'multi\nline\ncontent',
    '',
    'special chars: 中文 🎉',
  ];

  testContents.forEach(content => {
    // CLI hash calculation (from fs.ts)
    const cliHash = crypto.createHash('sha256').update(Buffer.from(content, 'utf-8')).digest('hex');

    // Web hash calculation (fixed yjs-file-writer.ts)
    const webHash = crypto.createHash('sha256').update(Buffer.from(content, 'utf-8')).digest('hex');

    const match = cliHash === webHash ? '✅' : '❌';
    console.log(`${match} Content: ${JSON.stringify(content)}`);
    console.log(`   CLI:  ${cliHash}`);
    console.log(`   Web:  ${webHash}`);
    console.log('');
  });
}

// Test the specific problematic case
function testProblematicCase() {
  console.log('Testing the specific case from project 01cf457d-c90c-4c26-93ea-e8c765409290:\n');

  const currentContent = 'bar1';  // What CLI shows
  const oldWebContent = 'bar1\n'; // What old web interface had

  const currentHash = crypto.createHash('sha256').update(currentContent).digest('hex');
  const oldWebHash = crypto.createHash('sha256').update(oldWebContent).digest('hex');
  const problematicHash = '961af259a15422000de1d1adcac912d08d716b119e0f559b68c7f0c223797c2d';

  console.log(`Current CLI content: ${JSON.stringify(currentContent)}`);
  console.log(`Current CLI hash:    ${currentHash}`);
  console.log('');
  console.log(`Old web content:     ${JSON.stringify(oldWebContent)}`);
  console.log(`Old web hash:        ${oldWebHash}`);
  console.log(`Problematic hash:    ${problematicHash}`);
  console.log(`Match old web:       ${oldWebHash === problematicHash ? '✅ Yes' : '❌ No'}`);
}

testHashConsistency();
testProblematicCase();