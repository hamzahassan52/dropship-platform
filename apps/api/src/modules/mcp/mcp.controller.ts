import { Controller, Get, Post, Body } from '@nestjs/common';
import { McpService } from './mcp.service';

@Controller('mcp')
export class McpController {
  constructor(private readonly mcpService: McpService) {}

  /**
   * List all available MCP tools
   */
  @Get('tools')
  getTools() {
    return {
      tools: this.mcpService.getToolDefinitions(),
    };
  }

  /**
   * Execute an MCP tool
   */
  @Post('execute')
  async executeTool(@Body() body: { tool: string; params?: Record<string, unknown> }) {
    const result = await this.mcpService.executeTool(body.tool, body.params || {});
    return result;
  }

  /**
   * Health check
   */
  @Get('health')
  health() {
    return {
      status: 'ok',
      availableTools: this.mcpService.getAvailableTools(),
    };
  }
}
