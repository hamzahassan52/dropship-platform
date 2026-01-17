import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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

interface GroqResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    finish_reason: string;
    message: {
      role: string;
      content: string;
      tool_calls?: Array<{
        id: string;
        type: string;
        function: {
          name: string;
          arguments: string;
        };
      }>;
    };
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

@Injectable()
export class ChatService {
  private groqApiKey: string;
  private groqApiUrl = 'https://api.groq.com/openai/v1/chat/completions';
  private modelName = 'llama-3.3-70b-versatile'; // Groq's fast Llama model

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
    // Initialize Groq API
    this.groqApiKey = this.configService.get<string>('GROQ_API_KEY', '');

    if (this.groqApiKey) {
      console.log('[ChatService] Groq API configured successfully');
    } else {
      console.log('[ChatService] Warning: GROQ_API_KEY not set in environment');
    }
  }

  async chat(userId: string, message: string): Promise<{ reply: string; toolResults?: unknown[] }> {
    // Get recent chat history
    const history = await this.getChatHistory(userId, 10);

    // Save user message
    await this.saveMessage(userId, 'user', message);

    // Check if Groq API is configured
    if (!this.groqApiKey) {
      const reply = 'AI service not configured. Please set GROQ_API_KEY in environment variables.';
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
      let assistantMessage: any;
      let toolResults: unknown[] = [];

      // Use Groq API
      assistantMessage = await this.chatWithGroq(messages, tools);

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
        let finalResponse: any;
        finalResponse = await this.chatWithGroq(messages, []);

        const reply = finalResponse.content || 'Done!';
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

  private async chatWithGroq(messages: ChatMessage[], tools: any[]): Promise<{ content: string; tool_calls?: ToolCall[] }> {
    // Convert messages to Groq/OpenAI format
    const groqMessages = messages.map(m => {
      if (m.role === 'tool') {
        return {
          role: 'tool',
          content: m.content,
          tool_call_id: m.tool_call_id,
        };
      }
      if (m.role === 'assistant' && m.tool_calls) {
        return {
          role: 'assistant',
          content: m.content || null,
          tool_calls: m.tool_calls,
        };
      }
      return {
        role: m.role,
        content: m.content,
      };
    });

    // Build request body
    const requestBody: any = {
      model: this.modelName,
      messages: groqMessages,
      temperature: 0.7,
      max_tokens: 1024,
    };

    // Add tools if provided
    if (tools && tools.length > 0) {
      requestBody.tools = tools;
      requestBody.tool_choice = 'auto';
    }

    try {
      const response = await fetch(this.groqApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.groqApiKey}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[ChatService] Groq API error:', response.status, errorText);
        throw new Error(`Groq API error: ${response.status} - ${errorText}`);
      }

      const data: GroqResponse = await response.json();

      if (!data.choices || data.choices.length === 0) {
        throw new Error('No response from Groq API');
      }

      const choice = data.choices[0];
      console.log('[ChatService] Groq response received, tokens used:', data.usage?.total_tokens);

      return {
        content: choice.message.content || '',
        tool_calls: choice.message.tool_calls?.map(tc => ({
          id: tc.id,
          type: 'function' as const,
          function: {
            name: tc.function.name,
            arguments: tc.function.arguments,
          },
        })),
      };
    } catch (error) {
      console.error('[ChatService] Groq API error:', error);
      throw error;
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

  private getToolDefinitions(): any[] {
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
