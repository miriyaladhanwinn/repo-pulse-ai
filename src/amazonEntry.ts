import { createMcpStreamableHttpServer, MCP_PROTOCOL_VERSION } from './mcp/streamableHttpServer.js';
import { DEFAULT_AMAZON_JUDGE_SCENARIO } from './amazon/judgeSimulationMode.js';
import { evaluateRingDeploymentGate, reduceFireTvRemoteInput } from './amazon/multiDeviceOrchestrator.js';

const PORT = Number(process.env.MCP_HTTP_PORT || process.env.PORT || 3001);

export function startAmazonHackathonServer(port = PORT) {
  const server = createMcpStreamableHttpServer();

  server.listen(port, () => {
    console.log(`⚡ RepoPulse AI • Amazon Hackathon MCP Streamable HTTP Server (Spec ${MCP_PROTOCOL_VERSION})`);
    console.log(`   ├─ MCP Streamable HTTP Endpoint : http://localhost:${port}/mcp`);
    console.log(`   ├─ Health & Track Telemetry     : http://localhost:${port}/health`);
    console.log(`   └─ Zero-Auth Judge Simulation   : http://localhost:${port}/judge-scenario?judge=amazon`);
  });

  return server;
}

// Auto-start when executed directly via node or tsx
const isDirectRun =
  import.meta.url === `file://${process.argv[1]}` ||
  (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('src/amazonEntry.ts')) ||
  (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('dist/amazonEntry.js'));

if (isDirectRun) {
  startAmazonHackathonServer();
}
