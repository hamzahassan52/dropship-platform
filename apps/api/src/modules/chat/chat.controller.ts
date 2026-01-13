import { Controller, Post, Get, Delete, Body, UseGuards, Request } from '@nestjs/common';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  async chat(
    @Request() req: { user: { userId: string } },
    @Body() body: { message: string },
  ) {
    return this.chatService.chat(req.user.userId, body.message);
  }

  @Get('history')
  async getHistory(@Request() req: { user: { userId: string } }) {
    return this.chatService.getChatHistory(req.user.userId);
  }

  @Delete('history')
  async clearHistory(@Request() req: { user: { userId: string } }) {
    return this.chatService.clearHistory(req.user.userId);
  }
}
