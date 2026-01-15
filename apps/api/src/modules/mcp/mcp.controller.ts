import { Controller, Get, Post, Body, Logger } from '@nestjs/common';
import { McpService } from './mcp.service';

// DTO for tool execution
class ExecuteToolDto {
  tool: string;
  params?: Record<string, unknown>;
}

@Controller('mcp')
export class McpController {
  private readonly logger = new Logger(McpController.name);

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
  async executeTool(@Body() body: ExecuteToolDto) {
    this.logger.log(`Executing tool: ${body.tool} with params: ${JSON.stringify(body.params)}`);
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
