// No import needed for fetch in Node 18+
// If running with ts-node, ensure you have a recent Node version.

const TICKER = process.argv[2] || 'AAPL';
const PORT = process.env.PORT || 4000;
const API_URL = `http://localhost:${PORT}/api/ai/stream-report/langgraph`;

async function testLangGraphStream() {
  const logLines: string[] = [];
  const log = (line: string) => {
    console.log(line);
    logLines.push(line);
  };

  log(`🚀 Testing LangGraph Stream for ticker: ${TICKER}`);
  log(`📡 Connecting to: ${API_URL}`);

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ticker: TICKER }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      log(`❌ Server returned ${response.status}: ${errorText}`);
      await writeLog(logLines);
      process.exit(1);
    }

    log('✅ Connection established. Streaming response...\n');

    if (!response.body) {
      log('❌ Response body is empty');
      await writeLog(logLines);
      process.exit(1);
    }

    // Handle Web Stream (Node 18+ fetch)
    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const text = decoder.decode(value, { stream: true });
      // The server sends newline-delimited JSON
      const lines = text.split('\n').filter(line => line.trim() !== '');
      
      for (const line of lines) {
        try {
          const json = JSON.parse(line);
          log('📦 Chunk received:');
          log(JSON.stringify(json, null, 2));
          log('----------------------------------------');
        } catch (e) {
          log(`📄 Raw text (not JSON): ${line}`);
        }
      }
    }

    log('\n🏁 Stream finished.');
    await writeLog(logLines);

  } catch (error) {
    log(`❌ Request failed: ${String(error)}`);
    await writeLog(logLines);
    process.exit(1);
  }
}

async function writeLog(lines: string[]) {
  try {
    const fs = await import('fs/promises');
    const filename = `langgraph-stream-${TICKER}-${Date.now()}.log`;
    await fs.writeFile(filename, lines.join('\n'), 'utf8');
    console.log(`📁 Log saved to ${filename}`);
  } catch (err) {
    console.error('❌ Failed to write log file:', err);
  }
}

testLangGraphStream();
