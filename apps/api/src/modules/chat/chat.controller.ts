import { Controller, Post, Get, Delete, Body, UseGuards, Request } from '@nestjs/common';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async chat(
    @Request() req: { user: { userId: string } },
    @Body() body: { message: string },
  ) {
    return this.chatService.chat(req.user.userId, body.message);
  }

  @Get('history')
  @UseGuards(JwtAuthGuard)
  async getHistory(@Request() req: { user: { userId: string } }) {
    return this.chatService.getChatHistory(req.user.userId);
  }

  @Delete('history')
  @UseGuards(JwtAuthGuard)
  async clearHistory(@Request() req: { user: { userId: string } }) {
    return this.chatService.clearHistory(req.user.userId);
  }

  /**
   * Test chat endpoint without auth (for development only)
   */
  @Post('test')
  async testChat(@Body() body: { message: string; userId?: string }) {
    const userId = body.userId || 'default-user';
    return this.chatService.chat(userId, body.message);
  }
}
