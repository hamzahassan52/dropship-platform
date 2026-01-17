import { Controller, Get, Post, Body, Logger, Req } from '@nestjs/common';
import { IsString, IsOptional, IsObject } from 'class-validator';
import { Request } from 'express';
import { McpService } from './mcp.service';

// DTO for tool execution
class ExecuteToolDto {
  @IsString()
  tool!: string;

  @IsOptional()
  @IsObject()
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

  /**
   * Debug endpoint - no validation
   */
  @Post('debug')
  debug(@Req() req: Request) {
    this.logger.log(`Debug - Raw body type: ${typeof req.body}`);
    this.logger.log(`Debug - Raw body: ${JSON.stringify(req.body)}`);
    return {
      receivedBody: req.body,
      bodyType: typeof req.body,
      tool: req.body?.tool,
      toolType: typeof req.body?.tool,
    };
  }

  /**
   * Execute tool - no DTO validation
   */
  @Post('run')
  async runTool(@Req() req: Request) {
    const { tool, params } = req.body || {};
    this.logger.log(`Running tool: ${tool} with params: ${JSON.stringify(params)}`);
    if (!tool) {
      return { success: false, error: 'Tool name required' };
    }
    const result = await this.mcpService.executeTool(tool, params || {});
    return result;
  }
}
