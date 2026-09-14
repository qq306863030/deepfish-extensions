import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { TOOLS, handleToolCall } from './src/tools.js';

const server = new Server(
  {
    name: 'zip-packer-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args, _meta } = request.params;
  const progressToken = _meta?.progressToken;

  const onProgress = progressToken !== undefined && progressToken !== null
    ? async ({ progress, total }) => {
        try {
          await server.notification({
            method: 'notifications/progress',
            params: {
              progressToken,
              progress,
              total,
            },
          });
        } catch {
          // Ignore notification failures if client disconnected
        }
      }
    : null;

  try {
    return await handleToolCall(name, args, { onProgress });
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : String(error)
          }, null, 2)
        }
      ],
      isError: true
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('zip-packer-mcp running on stdio');
}

main().catch((err) => {
  console.error('Fatal error starting zip-packer-mcp:', err);
  process.exit(1);
});
