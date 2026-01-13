import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { McpModule } from '../mcp/mcp.module';
import { PrismaService } from '../../common/prisma.service';

@Module({
  imports: [McpModule],
  controllers: [ChatController],
  providers: [ChatService, PrismaService],
  exports: [ChatService],
})
export class ChatModule {}
