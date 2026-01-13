import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Groq from 'groq-sdk';
import { PrismaService } from '../../common/prisma.service';
import { McpService } from '../mcp/mcp.service';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  tool_call_id?: string;
  tool_calls?: ToolCall[];
}

interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

@Injectable()
export class ChatService {
  private groq: Groq | null = null;
  private systemPrompt = `You are an AI assistant for a dropshipping automation platform. You help users manage their e-commerce stores (WooCommerce & Shopify), fulfill orders, track inventory, and analyze profits.

Available actions you can perform:
- Search products from CJ Dropshipping supplier
- View and fulfill pending orders
- Get business statistics and revenue reports
- Sync tracking numbers and inventory
- Import products to stores
- Calculate profit margins
- Process refunds
- Manage connected stores (add/remove/list)

Always be helpful and proactive. When users ask about orders, products, or stats, use the appropriate tools to get real data. Respond in a friendly, concise manner.

If the user speaks in Roman Urdu (like "orders dikhao"), respond in Roman Urdu too.`;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly mcpService: McpService,
  ) {
    const apiKey = this.configService.get<string>('GROQ_API_KEY');
    if (apiKey) {
      this.groq = new Groq({ apiKey });
    }
  }

  async chat(userId: string, message: string): Promise<{ reply: string; toolResults?: unknown[] }> {
    // Get recent chat history
    const history = await this.getChatHistory(userId, 10);

    // Save user message
    await this.saveMessage(userId, 'user', message);

    // If no Groq API key, return helpful message
    if (!this.groq) {
      const reply = 'AI service not configured. Please add GROQ_API_KEY to your environment variables. Get a free key at https://console.groq.com';
      await this.saveMessage(userId, 'assistant', reply);
      return { reply };
    }

    // Build messages for LLM
    const messages: ChatMessage[] = [
      { role: 'system', content: this.systemPrompt },
      ...history.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      { role: 'user', content: message },
    ];

    // Get tool definitions
    const tools = this.getToolDefinitions();

    try {
      // Call Groq LLM
      const response = await this.groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: messages as Groq.Chat.ChatCompletionMessageParam[],
        tools,
        tool_choice: 'auto',
        max_tokens: 1024,
      });

      const assistantMessage = response.choices[0].message;
      const toolResults: unknown[] = [];

      // Check if LLM wants to call tools
      if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
        // Execute each tool call
        for (const toolCall of assistantMessage.tool_calls) {
          const toolName = toolCall.function.name;
          const toolArgs = JSON.parse(toolCall.function.arguments || '{}');

          // Execute tool using MCP service
          const result = await this.mcpService.executeTool(toolName, toolArgs);
          toolResults.push({ tool: toolName, result });

          // Add tool result to messages
          messages.push({
            role: 'assistant',
            content: '',
            tool_calls: [toolCall],
          });
          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify(result),
          });
        }

        // Get final response from LLM with tool results
        const finalResponse = await this.groq.chat.completions.create({
          model: 'llama-3.3-70b-versatile',
          messages: messages as Groq.Chat.ChatCompletionMessageParam[],
          max_tokens: 1024,
        });

        const reply = finalResponse.choices[0].message.content || 'Done!';
        await this.saveMessage(userId, 'assistant', reply, toolResults);
        return { reply, toolResults };
      }

      // No tool calls, just return the response
      const reply = assistantMessage.content || 'I understand. How can I help you?';
      await this.saveMessage(userId, 'assistant', reply);
      return { reply };

    } catch (error) {
      console.error('Chat error:', error);
      const reply = 'Sorry, I encountered an error. Please try again.';
      await this.saveMessage(userId, 'assistant', reply);
      return { reply };
    }
  }

  async getChatHistory(userId: string, limit = 20) {
    return this.prisma.chatMessage.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    }).then(messages => messages.reverse());
  }

  async clearHistory(userId: string) {
    await this.prisma.chatMessage.deleteMany({
      where: { userId },
    });
    return { success: true };
  }

  private async saveMessage(userId: string, role: string, content: string, toolCalls?: unknown[]) {
    await this.prisma.chatMessage.create({
      data: {
        userId,
        role,
        content,
        toolCalls: toolCalls ? JSON.parse(JSON.stringify(toolCalls)) : undefined,
      },
    });
  }

  private getToolDefinitions(): Groq.Chat.ChatCompletionTool[] {
    return [
      {
        type: 'function',
        function: {
          name: 'search_products',
          description: 'Search for products on CJ Dropshipping supplier',
          parameters: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'Search query for products' },
              limit: { type: 'number', description: 'Max results (default 10)' },
            },
            required: ['query'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'get_pending_orders',
          description: 'Get all pending orders that need to be fulfilled',
          parameters: { type: 'object', properties: {} },
        },
      },
      {
        type: 'function',
        function: {
          name: 'fulfill_orders',
          description: 'Fulfill orders by sending them to the supplier',
          parameters: {
            type: 'object',
            properties: {
              orderId: { type: 'number', description: 'Specific order ID to fulfill' },
              all: { type: 'boolean', description: 'Set true to fulfill all pending orders' },
            },
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'get_business_stats',
          description: 'Get business statistics like revenue, orders, and profit',
          parameters: {
            type: 'object',
            properties: {
              period: { type: 'string', enum: ['today', 'week', 'month'], description: 'Time period' },
            },
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'sync_tracking',
          description: 'Sync tracking numbers from supplier to stores',
          parameters: { type: 'object', properties: {} },
        },
      },
      {
        type: 'function',
        function: {
          name: 'sync_inventory',
          description: 'Sync inventory/stock levels from supplier',
          parameters: {
            type: 'object',
            properties: {
              productId: { type: 'string', description: 'Specific product ID to sync' },
            },
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'calculate_profit',
          description: 'Calculate profit margin for a product',
          parameters: {
            type: 'object',
            properties: {
              cjProductId: { type: 'string', description: 'CJ product ID' },
              sellingPrice: { type: 'number', description: 'Your selling price' },
              quantity: { type: 'number', description: 'Quantity (default 1)' },
            },
            required: ['cjProductId', 'sellingPrice'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'manage_store',
          description: 'Add, remove, or list connected stores',
          parameters: {
            type: 'object',
            properties: {
              action: { type: 'string', enum: ['add', 'remove', 'list', 'toggle', 'stats'] },
              storeId: { type: 'string', description: 'Store ID (for remove/toggle/stats)' },
              platform: { type: 'string', enum: ['WOOCOMMERCE', 'SHOPIFY'] },
              name: { type: 'string', description: 'Store name' },
              storeUrl: { type: 'string', description: 'Store URL' },
            },
            required: ['action'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'get_all_stores_orders',
          description: 'Get orders from all connected stores',
          parameters: {
            type: 'object',
            properties: {
              status: { type: 'string', description: 'Filter by status' },
              limit: { type: 'number', description: 'Max results' },
              stats: { type: 'boolean', description: 'Include statistics' },
            },
          },
        },
      },
    ];
  }
}
