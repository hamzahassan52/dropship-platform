import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma.service';
import { McpService } from '../mcp/mcp.service';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface ChatMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string | null;
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
      content: string | null;
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
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, ToolParameter>;
      required?: string[];
    };
  };
}

interface ToolParameter {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  enum?: string[];
  default?: unknown;
  items?: { type: string };
}

export interface ChatResult {
  reply: string;
  toolResults?: unknown[];
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// ============================================================================
// CHAT SERVICE - PRODUCTION READY
// ============================================================================

@Injectable()
export class ChatService implements OnModuleInit {
  private readonly logger = new Logger(ChatService.name);

  // API Configuration
  private readonly groqApiKey: string;
  private readonly groqApiUrl = 'https://api.groq.com/openai/v1/chat/completions';
  private readonly modelName: string;

  // Rate Limiting (30 requests per minute per user)
  private readonly rateLimitMap = new Map<string, RateLimitEntry>();
  private readonly RATE_LIMIT_MAX = 30;
  private readonly RATE_LIMIT_WINDOW_MS = 60000; // 1 minute

  // Retry Configuration
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY_MS = 1000;

  // Timeout Configuration
  private readonly API_TIMEOUT_MS = 25000; // 25 seconds (leave buffer for response)

  // Valid tool names (for validation)
  private readonly VALID_TOOL_NAMES = new Set([
    'search_products',
    'get_pending_orders',
    'fulfill_orders',
    'get_business_stats',
    'sync_tracking',
    'import_product',
    'sync_inventory',
    'calculate_profit',
    'process_refund',
    'manage_store',
    'get_all_stores_orders',
    'get_products',
    'update_product_price',
    'get_customers',
    'send_notification',
    'create_coupon',
    'get_shipping_rates',
    'bulk_import_products',
    'analytics_report',
  ]);

  // System prompt for the AI assistant
  private readonly systemPrompt = `You are a helpful AI assistant for a dropshipping automation platform. You help users manage their e-commerce stores (WooCommerce & Shopify), fulfill orders, track inventory, and analyze profits.

⚠️ CRITICAL - NEVER DO THIS:
- NEVER write <function=name> or </function> tags
- NEVER write function_name(args) or function_name={args}
- NEVER write tool names in your text responses
- NEVER say "I will call get_business_stats" or similar
- NEVER include JSON in angle brackets or XML format

✅ INSTEAD DO THIS:
- Just respond naturally to the user
- Say "Let me check your stats" NOT "I'll call get_business_stats"
- Say "Here are your orders" NOT "<function=get_pending_orders>"
- The system AUTOMATICALLY handles all function calls
- You just provide natural responses

RESPONSE GUIDELINES:
- Be concise and helpful
- Respond in Roman Urdu if the user uses it
- Present data with emojis: 📦 for orders, 💰 for money, 🏪 for stores, 📊 for stats
- Use bullet points for lists
- When data is returned, summarize it naturally

EXAMPLE GOOD RESPONSES:
- "Aap ki dukan mein 5 pending orders hain 📦"
- "Is mahine ka revenue: $1,250 💰"
- "Tracking sync ho gaya ✅"

EXAMPLE BAD RESPONSES (NEVER DO THIS):
- "<function=get_orders></function>"
- "I'll call the manage_store function"
- "get_business_stats({period: 'today'})"

CAPABILITIES: Search products, view orders, check stats, manage stores, sync tracking, import products, sync inventory, calculate profit, process refunds, send notifications, create coupons, get shipping rates, generate reports.`;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly mcpService: McpService,
  ) {
    this.groqApiKey = this.configService.get<string>('GROQ_API_KEY', '');
    this.modelName = this.configService.get<string>('GROQ_MODEL', 'llama-3.3-70b-versatile');
  }

  onModuleInit(): void {
    if (!this.groqApiKey) {
      this.logger.error('GROQ_API_KEY is not configured. Chat service will not work.');
    } else {
      this.logger.log(`ChatService initialized with model: ${this.modelName}`);
    }

    // Clean up rate limit map periodically
    setInterval(() => this.cleanupRateLimits(), 60000);
  }

  // ============================================================================
  // MAIN CHAT METHOD
  // ============================================================================

  async chat(userId: string, message: string): Promise<ChatResult> {
    const startTime = Date.now();

    try {
      // Input validation
      if (!userId || typeof userId !== 'string') {
        this.logger.warn('Invalid userId provided');
        return this.createErrorResponse('Authentication required. Please log in.');
      }

      if (!message || typeof message !== 'string') {
        return this.createErrorResponse('Please enter a message.');
      }

      // Sanitize and validate message
      const sanitizedMessage = this.sanitizeInput(message);
      if (sanitizedMessage.length === 0) {
        return this.createErrorResponse('Please enter a valid message.');
      }

      if (sanitizedMessage.length > 4000) {
        return this.createErrorResponse('Message too long. Please keep it under 4000 characters.');
      }

      // Check rate limit
      if (!this.checkRateLimit(userId)) {
        this.logger.warn(`Rate limit exceeded for user: ${userId}`);
        return this.createErrorResponse(
          'You are sending messages too quickly. Please wait a moment and try again. ' +
          '/ Aap bohat jaldi messages bhej rahe hain. Thoda intezaar karein.'
        );
      }

      // Check API key
      if (!this.groqApiKey) {
        this.logger.error('GROQ_API_KEY not configured');
        return this.createErrorResponse(
          'AI service is not configured. Please contact support. ' +
          '/ AI service configure nahi hai. Support se contact karein.'
        );
      }

      // Get chat history
      const history = await this.getChatHistorySafe(userId, 10);

      // Save user message
      await this.saveMessageSafe(userId, 'user', sanitizedMessage);

      // Build messages for LLM
      const messages: ChatMessage[] = [
        { role: 'system', content: this.systemPrompt },
        ...history.map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content || ''
        })),
        { role: 'user', content: sanitizedMessage },
      ];

      // Get relevant tool definitions based on user message
      const tools = this.getRelevantTools(sanitizedMessage);

      // Call Groq API with retry logic
      let response = await this.callGroqWithRetry(messages, tools);

      // Handle tool calls if present
      if (response.tool_calls && response.tool_calls.length > 0) {
        const toolResult = await this.handleToolCalls(userId, messages, response.tool_calls, tools);

        const duration = Date.now() - startTime;
        this.logger.log(`Chat completed with tools in ${duration}ms for user ${userId}`);

        await this.saveMessageSafe(userId, 'assistant', toolResult.reply, toolResult.toolResults);
        return toolResult;
      }

      // No tool calls - regular response
      const reply = response.content || this.getDefaultResponse();

      const duration = Date.now() - startTime;
      this.logger.log(`Chat completed in ${duration}ms for user ${userId}`);

      await this.saveMessageSafe(userId, 'assistant', reply);
      return { reply };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Chat error for user ${userId}: ${errorMessage}`);

      // Save error state but don't expose details to user
      await this.saveMessageSafe(userId, 'assistant', '[Error occurred]');

      return this.createErrorResponse();
    }
  }

  // ============================================================================
  // GROQ API COMMUNICATION
  // ============================================================================

  private async callGroqWithRetry(
    messages: ChatMessage[],
    tools: ToolDefinition[],
    retryCount = 0
  ): Promise<{ content: string; tool_calls?: ToolCall[] }> {
    try {
      return await this.chatWithGroq(messages, tools);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Check if error is retryable
      const isRetryable = this.isRetryableError(errorMessage);

      if (isRetryable && retryCount < this.MAX_RETRIES) {
        this.logger.warn(`Retrying Groq API call (attempt ${retryCount + 1}/${this.MAX_RETRIES})`);
        await this.delay(this.RETRY_DELAY_MS * (retryCount + 1));
        return this.callGroqWithRetry(messages, tools, retryCount + 1);
      }

      throw error;
    }
  }

  private async chatWithGroq(
    messages: ChatMessage[],
    tools: ToolDefinition[]
  ): Promise<{ content: string; tool_calls?: ToolCall[] }> {
    // Format messages for Groq API
    const groqMessages = messages.map(m => {
      if (m.role === 'tool') {
        return {
          role: 'tool' as const,
          content: m.content || '',
          tool_call_id: m.tool_call_id || '',
        };
      }
      if (m.role === 'assistant' && m.tool_calls && m.tool_calls.length > 0) {
        return {
          role: 'assistant' as const,
          content: m.content,
          tool_calls: m.tool_calls,
        };
      }
      return {
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.content || '',
      };
    });

    // Build request body
    const requestBody: Record<string, unknown> = {
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

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.API_TIMEOUT_MS);

    try {
      const response = await fetch(this.groqApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.groqApiKey}`,
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Groq API error: ${response.status} ${errorText}`);

        // Parse and handle specific errors
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.error?.code === 'tool_use_failed') {
            // Tool validation failed - retry without tools
            this.logger.warn(`Tool validation failed: ${errorJson.error.message?.substring(0, 100)}`);

            // Add a hint to the messages to not use XML-style function calls
            const updatedMessages = [...messages];
            const lastUserMsg = updatedMessages.findIndex(m => m.role === 'user');
            if (lastUserMsg !== -1) {
              updatedMessages.splice(lastUserMsg, 0, {
                role: 'system',
                content: 'Note: Respond conversationally. The function calling system will handle any tool usage automatically.',
              });
            }

            return this.chatWithGroq(updatedMessages, []);
          }
          if (response.status === 429) {
            throw new Error('RATE_LIMITED');
          }
        } catch (parseError) {
          if (parseError instanceof Error && parseError.message === 'RATE_LIMITED') {
            throw parseError;
          }
          // Ignore other parse errors
        }

        throw new Error(`Groq API error: ${response.status}`);
      }

      const data = (await response.json()) as GroqResponse;

      if (!data.choices || data.choices.length === 0) {
        throw new Error('Empty response from Groq API');
      }

      const choice = data.choices[0];

      if (data.usage) {
        this.logger.debug(`Groq tokens used: ${data.usage.total_tokens}`);
      }

      // Validate and sanitize tool calls
      const validatedToolCalls = this.validateToolCalls(choice.message.tool_calls);

      return {
        content: choice.message.content || '',
        tool_calls: validatedToolCalls,
      };
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('TIMEOUT');
      }
      throw error;
    }
  }

  // ============================================================================
  // TOOL CALL HANDLING
  // ============================================================================

  private async handleToolCalls(
    userId: string,
    messages: ChatMessage[],
    toolCalls: ToolCall[],
    tools: ToolDefinition[]
  ): Promise<ChatResult> {
    const toolResults: unknown[] = [];
    const updatedMessages = [...messages];

    for (const toolCall of toolCalls) {
      const toolName = toolCall.function.name;

      // Validate tool name
      if (!this.VALID_TOOL_NAMES.has(toolName)) {
        this.logger.warn(`Invalid tool name: ${toolName}`);
        continue;
      }

      try {
        // Parse and validate arguments
        const rawArgs = this.parseToolArguments(toolCall.function.arguments);
        const validatedArgs = this.validateAndCoerceArguments(toolName, rawArgs);

        this.logger.log(`Executing tool: ${toolName} with args: ${JSON.stringify(validatedArgs)}`);

        // Execute tool
        const result = await this.executeToolSafe(toolName, validatedArgs, userId);
        toolResults.push({ tool: toolName, result });

        // Add to messages for context
        updatedMessages.push({
          role: 'assistant',
          content: null,
          tool_calls: [toolCall],
        });
        updatedMessages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(result),
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        this.logger.error(`Tool execution error (${toolName}): ${errorMessage}`);

        // Add error result
        toolResults.push({ tool: toolName, error: 'Tool execution failed' });
        updatedMessages.push({
          role: 'assistant',
          content: null,
          tool_calls: [toolCall],
        });
        updatedMessages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify({ error: 'Tool execution failed', message: errorMessage }),
        });
      }
    }

    // Get final response from LLM with tool results
    try {
      const finalResponse = await this.callGroqWithRetry(updatedMessages, []);
      return {
        reply: finalResponse.content || this.getDefaultResponse(),
        toolResults,
      };
    } catch (error) {
      this.logger.error('Failed to get final response after tool execution');
      return {
        reply: this.formatToolResultsAsResponse(toolResults),
        toolResults,
      };
    }
  }

  private parseToolArguments(argsString: string): Record<string, unknown> {
    if (!argsString || argsString.trim() === '') {
      return {};
    }

    try {
      const parsed = JSON.parse(argsString);
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        return {};
      }
      return parsed;
    } catch (error) {
      this.logger.warn(`Failed to parse tool arguments: ${argsString}`);
      return {};
    }
  }

  /**
   * Clean malformed tool names from Groq
   * Handles cases like:
   * - "get_pending_orders={"status": "PENDING"}" → "get_pending_orders"
   * - "manage_store({"action": "list"})" → "manage_store"
   * - "search_products{query: 'test'}" → "search_products"
   */
  private cleanToolCallName(rawName: string): string {
    if (!rawName || typeof rawName !== 'string') {
      return '';
    }

    // Find the first occurrence of any malformed character
    const malformedChars = ['=', '{', '(', '<', ' '];
    let cleanName = rawName;

    for (const char of malformedChars) {
      const index = cleanName.indexOf(char);
      if (index > 0) {
        cleanName = cleanName.substring(0, index);
      }
    }

    // Remove any trailing special characters
    cleanName = cleanName.replace(/[^a-z0-9_]/gi, '');

    // Log if we had to clean the name
    if (cleanName !== rawName) {
      this.logger.warn(`Cleaned malformed tool name: "${rawName}" → "${cleanName}"`);
    }

    return cleanName;
  }

  private validateToolCalls(toolCalls?: GroqResponse['choices'][0]['message']['tool_calls']): ToolCall[] | undefined {
    if (!toolCalls || !Array.isArray(toolCalls) || toolCalls.length === 0) {
      return undefined;
    }

    const validatedCalls: ToolCall[] = [];

    for (const tc of toolCalls) {
      // Validate structure
      if (!tc.id || !tc.function?.name) {
        this.logger.warn('Invalid tool call structure, skipping');
        continue;
      }

      // CRITICAL: Clean the tool name first (handles malformed names from Groq)
      const cleanedName = this.cleanToolCallName(tc.function.name);

      // Validate cleaned tool name
      if (!cleanedName || !this.VALID_TOOL_NAMES.has(cleanedName)) {
        this.logger.warn(`Unknown or invalid tool after cleaning: "${tc.function.name}" → "${cleanedName}", skipping`);
        continue;
      }

      validatedCalls.push({
        id: tc.id,
        type: 'function',
        function: {
          name: cleanedName, // Use cleaned name
          arguments: tc.function.arguments || '{}',
        },
      });
    }

    return validatedCalls.length > 0 ? validatedCalls : undefined;
  }

  private validateAndCoerceArguments(toolName: string, args: Record<string, unknown>): Record<string, unknown> {
    const coerced: Record<string, unknown> = {};
    const schema = this.getToolSchema(toolName);

    if (!schema) {
      return args;
    }

    for (const [key, value] of Object.entries(args)) {
      const paramSchema = schema.properties[key];

      if (!paramSchema) {
        // Unknown parameter - skip it
        continue;
      }

      coerced[key] = this.coerceValue(value, paramSchema);
    }

    // Add default values for missing optional parameters
    for (const [key, paramSchema] of Object.entries(schema.properties)) {
      if (!(key in coerced) && paramSchema.default !== undefined) {
        coerced[key] = paramSchema.default;
      }
    }

    // Validate required parameters
    if (schema.required) {
      for (const requiredKey of schema.required) {
        if (!(requiredKey in coerced) || coerced[requiredKey] === undefined || coerced[requiredKey] === null) {
          throw new Error(`Missing required parameter: ${requiredKey}`);
        }
      }
    }

    return coerced;
  }

  private coerceValue(value: unknown, schema: ToolParameter): unknown {
    if (value === null || value === undefined) {
      return schema.default;
    }

    switch (schema.type) {
      case 'number':
        if (typeof value === 'number') return value;
        if (typeof value === 'string') {
          const num = Number(value);
          if (!isNaN(num)) return num;
        }
        return schema.default ?? 0;

      case 'boolean':
        if (typeof value === 'boolean') return value;
        if (typeof value === 'string') {
          return value.toLowerCase() === 'true';
        }
        return schema.default ?? false;

      case 'string':
        if (typeof value === 'string') {
          // Validate enum if present
          if (schema.enum && !schema.enum.includes(value)) {
            return schema.default ?? schema.enum[0];
          }
          return this.sanitizeInput(value);
        }
        return String(value);

      case 'array':
        if (Array.isArray(value)) {
          return value.map(v =>
            typeof v === 'string' ? this.sanitizeInput(v) : v
          );
        }
        if (typeof value === 'string') {
          // Try to parse as JSON array
          try {
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed)) return parsed;
          } catch {
            // Split by comma if not valid JSON
            return value.split(',').map(s => s.trim()).filter(s => s);
          }
        }
        return schema.default ?? [];

      case 'object':
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          return value;
        }
        if (typeof value === 'string') {
          try {
            return JSON.parse(value);
          } catch {
            return schema.default ?? {};
          }
        }
        return schema.default ?? {};

      default:
        return value;
    }
  }

  private getToolSchema(toolName: string): { properties: Record<string, ToolParameter>; required?: string[] } | null {
    const schemas: Record<string, { properties: Record<string, ToolParameter>; required?: string[] }> = {
      search_products: {
        properties: {
          query: { type: 'string', description: 'Search query' },
          limit: { type: 'number', description: 'Max results', default: 10 },
        },
        required: ['query'],
      },
      get_pending_orders: {
        properties: {},
      },
      fulfill_orders: {
        properties: {
          orderIds: { type: 'array', description: 'Order IDs to fulfill' },
        },
        required: ['orderIds'],
      },
      get_business_stats: {
        properties: {
          period: { type: 'string', description: 'Time period', enum: ['today', 'week', 'month', 'year'], default: 'today' },
        },
      },
      sync_tracking: {
        properties: {
          orderIds: { type: 'array', description: 'Order IDs' },
        },
      },
      import_product: {
        properties: {
          cjProductId: { type: 'string', description: 'CJ product ID' },
          storeId: { type: 'string', description: 'Target store ID' },
          markup: { type: 'number', description: 'Markup percentage', default: 100 },
        },
        required: ['cjProductId', 'storeId'],
      },
      sync_inventory: {
        properties: {
          storeId: { type: 'string', description: 'Store ID' },
        },
      },
      calculate_profit: {
        properties: {
          orderId: { type: 'string', description: 'Order ID' },
        },
        required: ['orderId'],
      },
      process_refund: {
        properties: {
          orderId: { type: 'string', description: 'Order ID' },
          reason: { type: 'string', description: 'Refund reason' },
        },
        required: ['orderId', 'reason'],
      },
      manage_store: {
        properties: {
          action: { type: 'string', description: 'Action', enum: ['list', 'add', 'remove', 'test'] },
          name: { type: 'string', description: 'Store name' },
          platform: { type: 'string', description: 'Platform', enum: ['WOOCOMMERCE', 'SHOPIFY'] },
          storeUrl: { type: 'string', description: 'Store URL' },
          storeId: { type: 'string', description: 'Store ID' },
        },
        required: ['action'],
      },
      get_all_stores_orders: {
        properties: {
          status: { type: 'string', description: 'Order status', enum: ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'] },
          limit: { type: 'number', description: 'Max results', default: 50 },
        },
      },
      get_products: {
        properties: {
          storeId: { type: 'string', description: 'Store ID' },
          limit: { type: 'number', description: 'Max results', default: 20 },
        },
        required: ['storeId'],
      },
      update_product_price: {
        properties: {
          storeId: { type: 'string', description: 'Store ID' },
          productId: { type: 'string', description: 'Product ID' },
          price: { type: 'number', description: 'New price' },
        },
        required: ['storeId', 'productId', 'price'],
      },
      get_customers: {
        properties: {
          storeId: { type: 'string', description: 'Store ID' },
          limit: { type: 'number', description: 'Max results', default: 20 },
        },
        required: ['storeId'],
      },
      send_notification: {
        properties: {
          email: { type: 'string', description: 'Email address' },
          subject: { type: 'string', description: 'Email subject' },
          message: { type: 'string', description: 'Email message' },
        },
        required: ['email', 'subject', 'message'],
      },
      create_coupon: {
        properties: {
          storeId: { type: 'string', description: 'Store ID' },
          code: { type: 'string', description: 'Coupon code' },
          discount: { type: 'number', description: 'Discount amount' },
          type: { type: 'string', description: 'Discount type', enum: ['percent', 'fixed'] },
        },
        required: ['storeId', 'code', 'discount', 'type'],
      },
      get_shipping_rates: {
        properties: {
          country: { type: 'string', description: 'Country code' },
          weight: { type: 'number', description: 'Weight in kg' },
        },
        required: ['country'],
      },
      bulk_import_products: {
        properties: {
          cjProductIds: { type: 'array', description: 'CJ product IDs' },
          storeId: { type: 'string', description: 'Store ID' },
          markup: { type: 'number', description: 'Markup percentage', default: 100 },
        },
        required: ['cjProductIds', 'storeId'],
      },
      analytics_report: {
        properties: {
          type: { type: 'string', description: 'Report type', enum: ['overview', 'sales', 'profit', 'products'] },
          period: { type: 'string', description: 'Time period', enum: ['today', 'week', 'month', 'year'], default: 'month' },
        },
        required: ['type'],
      },
    };

    return schemas[toolName] || null;
  }

  // ============================================================================
  // TOOL EXECUTION
  // ============================================================================

  private async executeToolSafe(
    toolName: string,
    args: Record<string, unknown>,
    userId: string
  ): Promise<unknown> {
    const startTime = Date.now();
    const timeoutMs = 20000; // 20 second timeout for tool execution

    // DEBUG: Log before execution
    this.logger.log(`[TOOL EXECUTE] Starting: ${toolName}`);
    this.logger.debug(`[TOOL EXECUTE] Args: ${JSON.stringify(args)}`);
    this.logger.debug(`[TOOL EXECUTE] User: ${userId}`);

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Tool execution timeout')), timeoutMs);
    });

    const executionPromise = this.mcpService.executeTool(toolName, args, userId);

    try {
      const result = await Promise.race([executionPromise, timeoutPromise]);
      const duration = Date.now() - startTime;

      // DEBUG: Log successful result
      this.logger.log(`[TOOL EXECUTE] Completed: ${toolName} in ${duration}ms`);

      // Log result summary for debugging empty data issues
      if (result === null || result === undefined) {
        this.logger.warn(`[TOOL EXECUTE] ${toolName} returned null/undefined`);
      } else if (typeof result === 'object') {
        const resultObj = result as Record<string, unknown>;

        // Check for empty arrays/objects
        if (Array.isArray(resultObj)) {
          this.logger.debug(`[TOOL EXECUTE] ${toolName} returned array with ${resultObj.length} items`);
          if (resultObj.length === 0) {
            this.logger.warn(`[TOOL EXECUTE] ${toolName} returned EMPTY ARRAY - possible data issue`);
          }
        } else if (resultObj.orders !== undefined) {
          const orders = resultObj.orders as unknown[];
          this.logger.debug(`[TOOL EXECUTE] ${toolName} returned ${orders?.length ?? 0} orders`);
          if (!orders || orders.length === 0) {
            this.logger.warn(`[TOOL EXECUTE] ${toolName} returned NO ORDERS - check: storeId connected? orders exist in DB?`);
          }
        } else if (resultObj.products !== undefined) {
          const products = resultObj.products as unknown[];
          this.logger.debug(`[TOOL EXECUTE] ${toolName} returned ${products?.length ?? 0} products`);
        } else if (resultObj.stores !== undefined) {
          const stores = resultObj.stores as unknown[];
          this.logger.debug(`[TOOL EXECUTE] ${toolName} returned ${stores?.length ?? 0} stores`);
        } else if (resultObj.success === false) {
          this.logger.warn(`[TOOL EXECUTE] ${toolName} returned success=false: ${JSON.stringify(resultObj).substring(0, 200)}`);
        } else {
          // Log first 300 chars of result for debugging
          this.logger.debug(`[TOOL EXECUTE] ${toolName} result preview: ${JSON.stringify(result).substring(0, 300)}`);
        }
      }

      return result ?? { success: true, message: 'Operation completed' };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // DEBUG: Log error with full context
      this.logger.error(`[TOOL EXECUTE] FAILED: ${toolName} after ${duration}ms`);
      this.logger.error(`[TOOL EXECUTE] Error: ${errorMessage}`);
      this.logger.error(`[TOOL EXECUTE] Args were: ${JSON.stringify(args)}`);

      // Return a structured error that can be processed
      return {
        success: false,
        error: 'Tool execution failed',
        message: this.sanitizeErrorMessage(errorMessage),
        tool: toolName,
        executionTime: duration,
      };
    }
  }

  // ============================================================================
  // TOOL DEFINITIONS (ALL 19 TOOLS)
  // ============================================================================

  private getToolDefinitions(): ToolDefinition[] {
    return [
      // 1. search_products
      {
        type: 'function',
        function: {
          name: 'search_products',
          description: 'Search for products in the CJ Dropshipping catalog. Use this when user wants to find products to sell.',
          parameters: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Search term for finding products (e.g., "wireless earbuds", "beauty products")',
              },
              limit: {
                type: 'number',
                description: 'Maximum number of results to return. Default is 10.',
                default: 10,
              },
            },
            required: ['query'],
          },
        },
      },
      // 2. get_pending_orders
      {
        type: 'function',
        function: {
          name: 'get_pending_orders',
          description: 'Get all orders that are pending and need to be fulfilled. Use this when user asks about pending orders or orders needing fulfillment.',
          parameters: {
            type: 'object',
            properties: {},
          },
        },
      },
      // 3. fulfill_orders
      {
        type: 'function',
        function: {
          name: 'fulfill_orders',
          description: 'Send orders to CJ Dropshipping for fulfillment. Use this when user wants to fulfill specific orders.',
          parameters: {
            type: 'object',
            properties: {
              orderIds: {
                type: 'array',
                description: 'Array of order IDs to fulfill',
                items: { type: 'string' },
              },
            },
            required: ['orderIds'],
          },
        },
      },
      // 4. get_business_stats
      {
        type: 'function',
        function: {
          name: 'get_business_stats',
          description: 'Get business statistics including revenue, profit, and order counts. Use when user asks about business performance, revenue, profit, or stats.',
          parameters: {
            type: 'object',
            properties: {
              period: {
                type: 'string',
                description: 'Time period for statistics',
                enum: ['today', 'week', 'month', 'year'],
                default: 'today',
              },
            },
          },
        },
      },
      // 5. sync_tracking
      {
        type: 'function',
        function: {
          name: 'sync_tracking',
          description: 'Sync tracking numbers from CJ Dropshipping to stores. Use when user wants to update tracking information.',
          parameters: {
            type: 'object',
            properties: {
              orderIds: {
                type: 'array',
                description: 'Specific order IDs to sync tracking for. If empty, syncs all.',
                items: { type: 'string' },
              },
            },
          },
        },
      },
      // 6. import_product
      {
        type: 'function',
        function: {
          name: 'import_product',
          description: 'Import a product from CJ Dropshipping to a store. Use when user wants to add a CJ product to their store.',
          parameters: {
            type: 'object',
            properties: {
              cjProductId: {
                type: 'string',
                description: 'The CJ Dropshipping product ID to import',
              },
              storeId: {
                type: 'string',
                description: 'The target store ID to import the product to',
              },
              markup: {
                type: 'number',
                description: 'Markup percentage over supplier price. Default is 100 (2x the cost).',
                default: 100,
              },
            },
            required: ['cjProductId', 'storeId'],
          },
        },
      },
      // 7. sync_inventory
      {
        type: 'function',
        function: {
          name: 'sync_inventory',
          description: 'Sync inventory/stock levels from CJ Dropshipping. Use when user wants to update stock levels.',
          parameters: {
            type: 'object',
            properties: {
              storeId: {
                type: 'string',
                description: 'Specific store ID to sync. If empty, syncs all stores.',
              },
            },
          },
        },
      },
      // 8. calculate_profit
      {
        type: 'function',
        function: {
          name: 'calculate_profit',
          description: 'Calculate profit margin for a specific order. Use when user wants to know profit on an order.',
          parameters: {
            type: 'object',
            properties: {
              orderId: {
                type: 'string',
                description: 'The order ID to calculate profit for',
              },
            },
            required: ['orderId'],
          },
        },
      },
      // 9. process_refund
      {
        type: 'function',
        function: {
          name: 'process_refund',
          description: 'Process a refund or cancellation for an order. Use when user wants to refund an order.',
          parameters: {
            type: 'object',
            properties: {
              orderId: {
                type: 'string',
                description: 'The order ID to refund',
              },
              reason: {
                type: 'string',
                description: 'Reason for the refund',
              },
            },
            required: ['orderId', 'reason'],
          },
        },
      },
      // 10. manage_store
      {
        type: 'function',
        function: {
          name: 'manage_store',
          description: 'Manage connected stores - list all stores, add new store, remove store, or test connection. Use when user asks about their stores or wants to manage them.',
          parameters: {
            type: 'object',
            properties: {
              action: {
                type: 'string',
                description: 'Action to perform',
                enum: ['list', 'add', 'remove', 'test'],
              },
              name: {
                type: 'string',
                description: 'Store name (for add action)',
              },
              platform: {
                type: 'string',
                description: 'Platform type (for add action)',
                enum: ['WOOCOMMERCE', 'SHOPIFY'],
              },
              storeUrl: {
                type: 'string',
                description: 'Store URL (for add action)',
              },
              storeId: {
                type: 'string',
                description: 'Store ID (for remove/test actions)',
              },
            },
            required: ['action'],
          },
        },
      },
      // 11. get_all_stores_orders
      {
        type: 'function',
        function: {
          name: 'get_all_stores_orders',
          description: 'Get orders from all connected stores. Use when user asks about orders across all stores.',
          parameters: {
            type: 'object',
            properties: {
              status: {
                type: 'string',
                description: 'Filter by order status',
                enum: ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'],
              },
              limit: {
                type: 'number',
                description: 'Maximum number of orders to return. Default is 50.',
                default: 50,
              },
            },
          },
        },
      },
      // 12. get_products
      {
        type: 'function',
        function: {
          name: 'get_products',
          description: 'Get list of products from a specific store. Use when user asks about products in their store.',
          parameters: {
            type: 'object',
            properties: {
              storeId: {
                type: 'string',
                description: 'The store ID to get products from',
              },
              limit: {
                type: 'number',
                description: 'Maximum number of products to return. Default is 20.',
                default: 20,
              },
            },
            required: ['storeId'],
          },
        },
      },
      // 13. update_product_price
      {
        type: 'function',
        function: {
          name: 'update_product_price',
          description: 'Update the price of a product in a store. Use when user wants to change product pricing.',
          parameters: {
            type: 'object',
            properties: {
              storeId: {
                type: 'string',
                description: 'The store ID where the product is',
              },
              productId: {
                type: 'string',
                description: 'The product ID to update',
              },
              price: {
                type: 'number',
                description: 'The new price for the product',
              },
            },
            required: ['storeId', 'productId', 'price'],
          },
        },
      },
      // 14. get_customers
      {
        type: 'function',
        function: {
          name: 'get_customers',
          description: 'Get list of customers from a store. Use when user asks about their customers.',
          parameters: {
            type: 'object',
            properties: {
              storeId: {
                type: 'string',
                description: 'The store ID to get customers from',
              },
              limit: {
                type: 'number',
                description: 'Maximum number of customers to return. Default is 20.',
                default: 20,
              },
            },
            required: ['storeId'],
          },
        },
      },
      // 15. send_notification
      {
        type: 'function',
        function: {
          name: 'send_notification',
          description: 'Send an email notification. Use when user wants to send an email.',
          parameters: {
            type: 'object',
            properties: {
              email: {
                type: 'string',
                description: 'Recipient email address',
              },
              subject: {
                type: 'string',
                description: 'Email subject line',
              },
              message: {
                type: 'string',
                description: 'Email body content',
              },
            },
            required: ['email', 'subject', 'message'],
          },
        },
      },
      // 16. create_coupon
      {
        type: 'function',
        function: {
          name: 'create_coupon',
          description: 'Create a discount coupon code for a store. Use when user wants to create promotional codes.',
          parameters: {
            type: 'object',
            properties: {
              storeId: {
                type: 'string',
                description: 'The store ID to create coupon for',
              },
              code: {
                type: 'string',
                description: 'The coupon code (e.g., SAVE20)',
              },
              discount: {
                type: 'number',
                description: 'Discount amount (percentage or fixed amount)',
              },
              type: {
                type: 'string',
                description: 'Type of discount',
                enum: ['percent', 'fixed'],
              },
            },
            required: ['storeId', 'code', 'discount', 'type'],
          },
        },
      },
      // 17. get_shipping_rates
      {
        type: 'function',
        function: {
          name: 'get_shipping_rates',
          description: 'Get CJ Dropshipping shipping rates for a country. Use when user asks about shipping costs.',
          parameters: {
            type: 'object',
            properties: {
              country: {
                type: 'string',
                description: 'Country code (e.g., US, GB, PK, IN)',
              },
              weight: {
                type: 'number',
                description: 'Package weight in kg (optional)',
              },
            },
            required: ['country'],
          },
        },
      },
      // 18. bulk_import_products
      {
        type: 'function',
        function: {
          name: 'bulk_import_products',
          description: 'Import multiple products from CJ to a store. Use when user wants to import several products at once.',
          parameters: {
            type: 'object',
            properties: {
              cjProductIds: {
                type: 'array',
                description: 'Array of CJ product IDs to import',
                items: { type: 'string' },
              },
              storeId: {
                type: 'string',
                description: 'Target store ID',
              },
              markup: {
                type: 'number',
                description: 'Markup percentage. Default is 100.',
                default: 100,
              },
            },
            required: ['cjProductIds', 'storeId'],
          },
        },
      },
      // 19. analytics_report
      {
        type: 'function',
        function: {
          name: 'analytics_report',
          description: 'Generate analytics reports. Use when user asks for detailed reports or analytics.',
          parameters: {
            type: 'object',
            properties: {
              type: {
                type: 'string',
                description: 'Type of report to generate',
                enum: ['overview', 'sales', 'profit', 'products'],
              },
              period: {
                type: 'string',
                description: 'Time period for the report',
                enum: ['today', 'week', 'month', 'year'],
                default: 'month',
              },
            },
            required: ['type'],
          },
        },
      },
    ];
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private async getChatHistorySafe(userId: string, limit: number): Promise<Array<{ role: string; content: string }>> {
    try {
      const messages = await this.prisma.chatMessage.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: { role: true, content: true },
      });
      return messages.reverse();
    } catch (error) {
      this.logger.error(`Failed to get chat history: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return [];
    }
  }

  async getChatHistory(userId: string, limit = 20): Promise<Array<{ role: string; content: string; createdAt: Date }>> {
    try {
      const messages = await this.prisma.chatMessage.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });
      return messages.reverse();
    } catch (error) {
      this.logger.error(`Failed to get chat history: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return [];
    }
  }

  async clearHistory(userId: string): Promise<{ success: boolean }> {
    try {
      await this.prisma.chatMessage.deleteMany({
        where: { userId },
      });
      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to clear chat history: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { success: false };
    }
  }

  private async saveMessageSafe(
    userId: string,
    role: string,
    content: string,
    toolCalls?: unknown[]
  ): Promise<void> {
    try {
      await this.prisma.chatMessage.create({
        data: {
          userId,
          role,
          content: content.substring(0, 10000), // Limit content length
          toolCalls: toolCalls ? JSON.parse(JSON.stringify(toolCalls)) : undefined,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to save message: ${error instanceof Error ? error.message : 'Unknown error'}`);
      // Don't throw - message saving is not critical
    }
  }

  // ============================================================================
  // RATE LIMITING
  // ============================================================================

  private checkRateLimit(userId: string): boolean {
    const now = Date.now();
    const entry = this.rateLimitMap.get(userId);

    if (!entry || now > entry.resetTime) {
      this.rateLimitMap.set(userId, {
        count: 1,
        resetTime: now + this.RATE_LIMIT_WINDOW_MS,
      });
      return true;
    }

    if (entry.count >= this.RATE_LIMIT_MAX) {
      return false;
    }

    entry.count++;
    return true;
  }

  private cleanupRateLimits(): void {
    const now = Date.now();
    for (const [userId, entry] of this.rateLimitMap.entries()) {
      if (now > entry.resetTime) {
        this.rateLimitMap.delete(userId);
      }
    }
  }

  // ============================================================================
  // INPUT VALIDATION & SANITIZATION
  // ============================================================================

  private sanitizeInput(input: string): string {
    if (typeof input !== 'string') {
      return '';
    }

    return input
      .trim()
      // Remove null bytes
      .replace(/\0/g, '')
      // Remove control characters except newlines and tabs
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      // Limit consecutive whitespace
      .replace(/\s{10,}/g, '          ');
  }

  private sanitizeErrorMessage(message: string): string {
    // Remove sensitive information from error messages
    return message
      .replace(/Bearer [a-zA-Z0-9_-]+/g, 'Bearer [REDACTED]')
      .replace(/api[_-]?key[=:]\s*["']?[a-zA-Z0-9_-]+["']?/gi, 'api_key=[REDACTED]')
      .replace(/password[=:]\s*["']?[^"'\s]+["']?/gi, 'password=[REDACTED]')
      .substring(0, 200);
  }

  // ============================================================================
  // ERROR HANDLING & RESPONSES
  // ============================================================================

  private isRetryableError(errorMessage: string): boolean {
    const retryablePatterns = [
      'TIMEOUT',
      'RATE_LIMITED',
      'ECONNRESET',
      'ENOTFOUND',
      'ETIMEDOUT',
      'socket hang up',
      '502',
      '503',
      '504',
    ];

    return retryablePatterns.some(pattern =>
      errorMessage.toUpperCase().includes(pattern.toUpperCase())
    );
  }

  private createErrorResponse(customMessage?: string): ChatResult {
    const defaultMessage =
      '❌ Maafi chahta hun, abhi request process karne mein masla aa raha hai. Thodi der baad dobara try karein. ' +
      '/ I apologize, having trouble processing your request. Please try again.';

    return {
      reply: customMessage || defaultMessage,
    };
  }

  /**
   * Create contextual error responses based on error type
   */
  private createContextualErrorResponse(errorType: string, context?: Record<string, unknown>): ChatResult {
    const errorMessages: Record<string, string> = {
      // Rate limiting
      'RATE_LIMITED':
        '⏳ Aap bohat jaldi messages bhej rahe hain. 30 seconds intezaar karein.\n' +
        '/ You\'re sending messages too quickly. Please wait 30 seconds.',

      // Timeout
      'TIMEOUT':
        '⏰ Request mein bohat waqt lag gaya. Please dobara try karein.\n' +
        '/ Request took too long. Please try again.',

      // No stores connected
      'NO_STORES':
        '🏪 Aap ki koi dukan connect nahi hai. Pehle store add karein:\n' +
        '1. Settings > Stores > Add Store\n' +
        '2. WooCommerce ya Shopify credentials daalein\n' +
        '/ No stores connected. Please add a store first.',

      // No orders found
      'NO_ORDERS':
        '📦 Koi order nahi mila. Possible reasons:\n' +
        '• Store mein orders nahi hain\n' +
        '• Store sync nahi hua\n' +
        '• Filter/status galat hai\n' +
        '/ No orders found. Check if store is synced.',

      // Tool execution failed
      'TOOL_FAILED':
        '❌ Operation fail ho gaya. Please dobara try karein.\n' +
        '/ Operation failed. Please try again.',

      // AI service error
      'AI_SERVICE_ERROR':
        '🤖 AI service mein temporarily masla hai. 1 minute baad try karein.\n' +
        '/ AI service is temporarily unavailable. Try again in 1 minute.',

      // Invalid request
      'INVALID_REQUEST':
        '❓ Samajh nahi aaya. Kripya doosre tareeqe se poochein.\n' +
        'Example: "Meri stats dikhao" ya "Pending orders kitne hain?"\n' +
        '/ I didn\'t understand. Please rephrase your question.',

      // Database error
      'DATABASE_ERROR':
        '💾 Data access mein masla aa raha hai. Please thodi der baad try karein.\n' +
        '/ Database temporarily unavailable. Please try again later.',

      // Store not found
      'STORE_NOT_FOUND':
        '🏪 Store nahi mila. Pehle store add karein ya store ID check karein.\n' +
        '/ Store not found. Please add a store or check the store ID.',

      // Product not found
      'PRODUCT_NOT_FOUND':
        '🛍️ Product nahi mila. Product ID check karein.\n' +
        '/ Product not found. Please check the product ID.',

      // Order not found
      'ORDER_NOT_FOUND':
        '📦 Order nahi mila. Order ID check karein.\n' +
        '/ Order not found. Please check the order ID.',

      // Permission denied
      'PERMISSION_DENIED':
        '🔒 Is action ke liye permission nahi hai.\n' +
        '/ You don\'t have permission for this action.',

      // API error
      'EXTERNAL_API_ERROR':
        '🌐 External service (WooCommerce/Shopify/CJ) se connect nahi ho paya.\n' +
        'Check karein: Store credentials sahi hain? Store online hai?\n' +
        '/ Could not connect to external service. Check credentials.',
    };

    const message = errorMessages[errorType] || errorMessages['TOOL_FAILED'];

    // Add context if provided
    let finalMessage = message;
    if (context) {
      if (context.storeId) {
        finalMessage += `\n\n📍 Store ID: ${context.storeId}`;
      }
      if (context.orderId) {
        finalMessage += `\n\n📍 Order ID: ${context.orderId}`;
      }
    }

    return { reply: finalMessage };
  }

  // ============================================================================
  // SMART TOOL SELECTION
  // ============================================================================

  private getRelevantTools(message: string): ToolDefinition[] {
    const lowerMessage = message.toLowerCase();
    const allTools = this.getToolDefinitions();

    // Keywords for each tool category
    const toolKeywords: Record<string, string[]> = {
      // Orders related
      'get_pending_orders': ['pending', 'unfulfilled', 'awaiting', 'fulfill karna', 'pending order'],
      'get_all_stores_orders': ['orders', 'order', 'kitne order', 'total order', 'failed', 'shipped', 'delivered', 'cancelled', 'all order', 'sab order'],
      'fulfill_orders': ['fulfill', 'ship karo', 'send order', 'process order', 'bhejo'],

      // Stats related - EXPANDED for vague queries
      'get_business_stats': [
        'stats', 'statistics', 'revenue', 'profit', 'earning', 'income', 'money', 'sales',
        'kitna', 'kmai', 'kamai', 'paisa', 'dollar', 'paise',
        'overview', 'summary', 'dashboard', 'status', 'haal', 'kya haal', 'kaisay',
        'how is', 'how are', 'tell me', 'batao', 'dikhao', 'show me',
        'business', 'performance', 'aj', 'today', 'week', 'month', 'is mahine'
      ],
      'analytics_report': ['report', 'analytics', 'analysis', 'trend', 'detailed report', 'full report'],

      // Store related
      'manage_store': ['store', 'stores', 'shop', 'dukan', 'my store', 'list store', 'show store', 'meri dukan', 'connected'],

      // Products related
      'search_products': ['search', 'find product', 'look for', 'dhundo', 'product search', 'cj product', 'cj se'],
      'get_products': ['products', 'my products', 'store products', 'meri products'],
      'import_product': ['import', 'add product', 'import product', 'laao'],
      'bulk_import_products': ['bulk', 'multiple products', 'import all', 'saari'],
      'update_product_price': ['price', 'update price', 'change price', 'pricing', 'qeemat'],

      // Tracking & Inventory
      'sync_tracking': ['tracking', 'track', 'shipment', 'delivery status', 'tracking number', 'sync tracking'],
      'sync_inventory': ['inventory', 'stock', 'sync stock', 'update stock', 'stock level'],

      // Customers
      'get_customers': ['customer', 'customers', 'buyer', 'grahak', 'client'],

      // Financial
      'calculate_profit': ['profit margin', 'margin', 'calculate profit', 'margin kitna'],
      'process_refund': ['refund', 'cancel order', 'return', 'wapas', 'cancel karo'],

      // Communication
      'send_notification': ['email', 'notify', 'send email', 'message bhejo'],
      'create_coupon': ['coupon', 'discount', 'code', 'promo', 'discount code'],

      // Shipping
      'get_shipping_rates': ['shipping', 'delivery cost', 'shipping rate', 'delivery charge', 'kitna shipping'],
    };

    // Find matching tools
    const matchedTools = new Set<string>();

    for (const [toolName, keywords] of Object.entries(toolKeywords)) {
      for (const keyword of keywords) {
        if (lowerMessage.includes(keyword)) {
          matchedTools.add(toolName);
          break;
        }
      }
    }

    // Handle common vague queries that need multiple tools
    const vagueQueries: Record<string, string[]> = {
      // "overview" type queries - show stats + stores + orders
      'overview': ['get_business_stats', 'manage_store', 'get_all_stores_orders'],
      'summary': ['get_business_stats', 'manage_store', 'get_all_stores_orders'],
      'dashboard': ['get_business_stats', 'get_all_stores_orders'],
      'sab kuch': ['get_business_stats', 'manage_store', 'get_all_stores_orders'],
      'everything': ['get_business_stats', 'manage_store', 'get_all_stores_orders'],
      'all info': ['get_business_stats', 'manage_store', 'get_all_stores_orders'],
      'kya haal': ['get_business_stats', 'get_all_stores_orders'],
      'how is business': ['get_business_stats', 'get_all_stores_orders'],
      'what is happening': ['get_business_stats', 'get_all_stores_orders'],
      'status': ['get_business_stats', 'get_all_stores_orders', 'manage_store'],
    };

    // Check vague queries
    for (const [query, tools] of Object.entries(vagueQueries)) {
      if (lowerMessage.includes(query)) {
        tools.forEach(t => matchedTools.add(t));
      }
    }

    // If no specific tools matched, check for general queries
    if (matchedTools.size === 0) {
      // Check if it's a greeting - no tools needed
      const greetings = ['hello', 'hi', 'hey', 'salam', 'assalam', 'thanks', 'thank', 'shukriya', 'ok', 'okay', 'theek', 'acha', 'good', 'nice'];
      const isGreeting = greetings.some(g => lowerMessage.split(/\s+/).includes(g) || lowerMessage === g);

      // Check if it's a question about capabilities
      const helpQueries = ['what can you', 'kya kar sakte', 'help', 'madad', 'capabilities', 'features'];
      const isHelpQuery = helpQueries.some(q => lowerMessage.includes(q));

      if (isGreeting || isHelpQuery) {
        return []; // No tools for greetings or help queries
      }

      // For truly ambiguous queries, provide overview tools
      this.logger.debug(`No specific match found for: "${message.substring(0, 50)}", providing overview tools`);
      matchedTools.add('get_business_stats');
      matchedTools.add('manage_store');
      matchedTools.add('get_all_stores_orders');
    }

    // Always add closely related tools
    if (matchedTools.has('get_pending_orders') || matchedTools.has('get_all_stores_orders')) {
      matchedTools.add('get_pending_orders');
      matchedTools.add('get_all_stores_orders');
    }

    if (matchedTools.has('get_business_stats') || matchedTools.has('analytics_report')) {
      matchedTools.add('get_business_stats');
    }

    // Filter and return only matched tools
    const selectedTools = allTools.filter(tool =>
      matchedTools.has(tool.function.name)
    );

    // Prioritize tools based on likely relevance
    const priorityOrder = [
      'get_business_stats',
      'get_all_stores_orders',
      'get_pending_orders',
      'manage_store',
      'analytics_report',
      'get_products',
      'search_products',
    ];

    selectedTools.sort((a, b) => {
      const aIndex = priorityOrder.indexOf(a.function.name);
      const bIndex = priorityOrder.indexOf(b.function.name);
      const aPriority = aIndex === -1 ? 100 : aIndex;
      const bPriority = bIndex === -1 ? 100 : bIndex;
      return aPriority - bPriority;
    });

    // Limit to 5 most relevant tools
    const limitedTools = selectedTools.slice(0, 5);

    this.logger.log(`[TOOLS] Selected ${limitedTools.length} tools: ${limitedTools.map(t => t.function.name).join(', ')}`);

    return limitedTools;
  }

  private getDefaultResponse(): string {
    const responses = [
      'I understand. How else can I help you? / Samajh gaya. Aur kaise madad kar sakta hun?',
      'Is there anything specific you\'d like me to do? / Kuch khaas karna chahte ho?',
      'I\'m here to help with your store management. / Main store management mein madad ke liye hun.',
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }

  private formatToolResultsAsResponse(toolResults: unknown[]): string {
    if (!toolResults || toolResults.length === 0) {
      return '✅ Kaam ho gaya / Operation completed.';
    }

    const formattedParts: string[] = [];

    for (const tr of toolResults) {
      const toolResult = tr as { tool: string; result?: Record<string, unknown>; error?: string };

      if (toolResult.error) {
        formattedParts.push(`❌ ${this.getToolDisplayName(toolResult.tool)}: Error`);
        continue;
      }

      const result = toolResult.result;
      if (!result) {
        formattedParts.push(`✅ ${this.getToolDisplayName(toolResult.tool)}: Done`);
        continue;
      }

      // Format based on tool type
      switch (toolResult.tool) {
        case 'get_business_stats':
          formattedParts.push(this.formatBusinessStats(result));
          break;

        case 'get_pending_orders':
        case 'get_all_stores_orders':
          formattedParts.push(this.formatOrdersResult(result));
          break;

        case 'manage_store':
          formattedParts.push(this.formatStoresResult(result));
          break;

        case 'get_products':
          formattedParts.push(this.formatProductsResult(result));
          break;

        case 'get_customers':
          formattedParts.push(this.formatCustomersResult(result));
          break;

        case 'analytics_report':
          formattedParts.push(this.formatAnalyticsResult(result));
          break;

        case 'search_products':
          formattedParts.push(this.formatSearchResult(result));
          break;

        default:
          // Generic success format
          if (result.success === true) {
            formattedParts.push(`✅ ${this.getToolDisplayName(toolResult.tool)}: ${result.message || 'Completed'}`);
          } else if (result.success === false) {
            formattedParts.push(`❌ ${this.getToolDisplayName(toolResult.tool)}: ${result.message || 'Failed'}`);
          } else {
            formattedParts.push(`✅ ${this.getToolDisplayName(toolResult.tool)}: Done`);
          }
      }
    }

    return formattedParts.join('\n\n');
  }

  private getToolDisplayName(toolName: string): string {
    const displayNames: Record<string, string> = {
      'get_business_stats': '📊 Business Stats',
      'get_pending_orders': '📦 Pending Orders',
      'get_all_stores_orders': '📦 All Orders',
      'manage_store': '🏪 Stores',
      'get_products': '🛍️ Products',
      'get_customers': '👥 Customers',
      'search_products': '🔍 Search Results',
      'analytics_report': '📈 Analytics',
      'fulfill_orders': '🚀 Fulfillment',
      'sync_tracking': '📍 Tracking Sync',
      'sync_inventory': '📊 Inventory Sync',
      'import_product': '📥 Import',
      'send_notification': '📧 Email',
      'create_coupon': '🎟️ Coupon',
    };
    return displayNames[toolName] || `🔧 ${toolName}`;
  }

  private formatBusinessStats(result: Record<string, unknown>): string {
    const stats = result as {
      revenue?: number;
      profit?: number;
      orders?: number;
      pendingOrders?: number;
      shippedOrders?: number;
      totalRevenue?: number;
      totalProfit?: number;
      totalOrders?: number;
    };

    const lines: string[] = ['📊 **Business Stats**'];

    const revenue = stats.revenue ?? stats.totalRevenue ?? 0;
    const profit = stats.profit ?? stats.totalProfit ?? 0;
    const orders = stats.orders ?? stats.totalOrders ?? 0;

    lines.push(`💰 Revenue: $${Number(revenue).toFixed(2)}`);
    lines.push(`💵 Profit: $${Number(profit).toFixed(2)}`);
    lines.push(`📦 Total Orders: ${orders}`);

    if (stats.pendingOrders !== undefined) {
      lines.push(`⏳ Pending: ${stats.pendingOrders}`);
    }
    if (stats.shippedOrders !== undefined) {
      lines.push(`🚚 Shipped: ${stats.shippedOrders}`);
    }

    return lines.join('\n');
  }

  private formatOrdersResult(result: Record<string, unknown>): string {
    const data = result as {
      orders?: Array<{ id: string; status?: string; total?: number; customerName?: string }>;
      totalOrders?: number;
      pendingCount?: number;
      shippedCount?: number;
    };

    const orders = data.orders || [];
    const lines: string[] = [];

    if (orders.length === 0) {
      return '📦 No orders found / Koi order nahi mila';
    }

    lines.push(`📦 **Orders** (${orders.length} found)`);

    // Show summary by status
    const statusCounts: Record<string, number> = {};
    for (const order of orders) {
      const status = order.status || 'UNKNOWN';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    }

    for (const [status, count] of Object.entries(statusCounts)) {
      const emoji = this.getStatusEmoji(status);
      lines.push(`${emoji} ${status}: ${count}`);
    }

    // Show first few orders
    if (orders.length > 0) {
      lines.push('\n**Recent:**');
      orders.slice(0, 3).forEach((order, i) => {
        lines.push(`${i + 1}. #${order.id} - ${order.customerName || 'Customer'} - $${order.total || 0}`);
      });
    }

    return lines.join('\n');
  }

  private formatStoresResult(result: Record<string, unknown>): string {
    const data = result as {
      stores?: Array<{ id: string; name: string; platform?: string; isActive?: boolean }>;
      success?: boolean;
      message?: string;
    };

    if (data.message) {
      return `🏪 ${data.message}`;
    }

    const stores = data.stores || [];
    if (stores.length === 0) {
      return '🏪 No stores connected / Koi dukan connect nahi hai';
    }

    const lines: string[] = [`🏪 **Your Stores** (${stores.length})`];

    stores.forEach((store, i) => {
      const status = store.isActive ? '🟢' : '🔴';
      lines.push(`${i + 1}. ${status} ${store.name} (${store.platform || 'Unknown'})`);
    });

    return lines.join('\n');
  }

  private formatProductsResult(result: Record<string, unknown>): string {
    const data = result as {
      products?: Array<{ id: string; name: string; price?: number; stock?: number }>;
      total?: number;
    };

    const products = data.products || [];
    if (products.length === 0) {
      return '🛍️ No products found / Koi product nahi mila';
    }

    const lines: string[] = [`🛍️ **Products** (${products.length})`];

    products.slice(0, 5).forEach((product, i) => {
      lines.push(`${i + 1}. ${product.name} - $${product.price || 0} (Stock: ${product.stock || 0})`);
    });

    if (products.length > 5) {
      lines.push(`... and ${products.length - 5} more`);
    }

    return lines.join('\n');
  }

  private formatCustomersResult(result: Record<string, unknown>): string {
    const data = result as {
      customers?: Array<{ id: string; name?: string; email?: string; totalSpent?: number }>;
      total?: number;
    };

    const customers = data.customers || [];
    if (customers.length === 0) {
      return '👥 No customers found / Koi customer nahi mila';
    }

    const lines: string[] = [`👥 **Customers** (${customers.length})`];

    customers.slice(0, 5).forEach((customer, i) => {
      lines.push(`${i + 1}. ${customer.name || customer.email || 'Unknown'} - $${customer.totalSpent || 0} spent`);
    });

    return lines.join('\n');
  }

  private formatAnalyticsResult(result: Record<string, unknown>): string {
    const lines: string[] = ['📈 **Analytics Report**'];

    // Try to extract common analytics fields
    for (const [key, value] of Object.entries(result)) {
      if (typeof value === 'number') {
        const displayKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
        if (key.includes('revenue') || key.includes('profit') || key.includes('spent')) {
          lines.push(`💰 ${displayKey}: $${value.toFixed(2)}`);
        } else if (key.includes('order') || key.includes('count')) {
          lines.push(`📦 ${displayKey}: ${value}`);
        } else {
          lines.push(`📊 ${displayKey}: ${value}`);
        }
      }
    }

    return lines.length > 1 ? lines.join('\n') : '📈 Analytics report generated';
  }

  private formatSearchResult(result: Record<string, unknown>): string {
    const data = result as {
      products?: Array<{ name: string; price?: number; id?: string }>;
      total?: number;
    };

    const products = data.products || [];
    if (products.length === 0) {
      return '🔍 No products found matching your search / Kuch nahi mila';
    }

    const lines: string[] = [`🔍 **Search Results** (${products.length} found)`];

    products.slice(0, 5).forEach((product, i) => {
      lines.push(`${i + 1}. ${product.name} - $${product.price || 'N/A'}`);
    });

    return lines.join('\n');
  }

  private getStatusEmoji(status: string): string {
    const emojis: Record<string, string> = {
      'PENDING': '⏳',
      'PROCESSING': '⚙️',
      'SHIPPED': '🚚',
      'DELIVERED': '✅',
      'CANCELLED': '❌',
      'REFUNDED': '💸',
      'FAILED': '❌',
      'RETRY_1': '🔄',
      'RETRY_2': '🔄',
      'RETRY_3': '🔄',
      'FULFILLED': '✅',
    };
    return emojis[status.toUpperCase()] || '📦';
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
