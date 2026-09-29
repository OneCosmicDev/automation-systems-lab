import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { createClient } from './client.mjs';
import { safeError } from './errors.mjs';

const client = createClient();
const server = new Server({ name: 'automation-systems-lab', version: '0.1.0' }, { capabilities: { tools: {} } });
server.setRequestHandler(ListToolsRequestSchema, async () => {
  const { tools } = await client.list();
  return { tools: tools.map(({ role, readOnly, ...tool }) => ({ ...tool,
    annotations: { readOnlyHint: readOnly, destructiveHint: false, idempotentHint: true, openWorldHint: false } })) };
});
server.setRequestHandler(CallToolRequestSchema, async request => {
  try {
    const result = await client.call(request.params.name, request.params.arguments || {});
    return { content: [{ type: 'text', text: JSON.stringify(result) }], structuredContent: result };
  } catch (error) { return { isError: true, content: [{ type: 'text', text: JSON.stringify(safeError(error)) }] }; }
});
await server.connect(new StdioServerTransport());
