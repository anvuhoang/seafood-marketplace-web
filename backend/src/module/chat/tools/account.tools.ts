import { Injectable } from '@nestjs/common';
import { ChatContextService, MAX_NOTE_LENGTH } from '../chat-context.service.js';
import type { ChatTool, ToolContext, ToolOutcome } from '../chat.types.js';
import { loginRequired } from './login-required.js';
import { optString, reqString } from './tool-args.js';

/** Remembers a lasting fact the customer asked the assistant to keep (an allergy, a taste, the size of the family). */
@Injectable()
export class RememberPreferenceTool implements ChatTool {
  readonly statusLabel = 'Đang ghi nhớ...';
  readonly declaration = {
    name: 'remember_preference',
    description:
      'Ghi nhớ lâu dài một thông tin về khách để tư vấn tốt hơn lần sau: dị ứng, món thích hoặc không ăn, số người trong nhà. ' +
      'Chỉ dùng khi khách nói ra điều đó rõ ràng, viết lại thành một câu ngắn.',
    parameters: {
      type: 'object' as const,
      properties: {
        note: { type: 'string', description: `Một câu ngắn (tối đa ${MAX_NOTE_LENGTH} ký tự), ví dụ "Dị ứng tôm" hoặc "Nhà có 4 người".` },
      },
      required: ['note'],
    },
  };

  constructor(private readonly context: ChatContextService) {}

  async execute(args: Record<string, unknown>, context: ToolContext): Promise<ToolOutcome> {
    if (!context.userId) return loginRequired();
    const notes = await this.context.addNote(context.userId, reqString(args, 'note', MAX_NOTE_LENGTH));
    return { data: { saved: true, rememberedCount: notes.length } };
  }
}

/** Shows the "leave a message" form inside the chat. The message itself is sent by the form, not by the model. */
@Injectable()
export class ContactSupportTool implements ChatTool {
  readonly statusLabel = 'Đang mở biểu mẫu liên hệ...';
  readonly declaration = {
    name: 'contact_support',
    description:
      'Mời khách để lại lời nhắn cho nhân viên hỗ trợ. Dùng khi khách muốn gặp người thật, khiếu nại, hoặc bạn không thể giải quyết vấn đề. ' +
      'Công cụ chỉ hiện biểu mẫu; nói khách điền thông tin liên hệ ở biểu mẫu.',
    parameters: {
      type: 'object' as const,
      properties: { reason: { type: 'string', description: 'Lý do ngắn gọn.' } },
    },
  };

  async execute(args: Record<string, unknown>): Promise<ToolOutcome> {
    const reason = optString(args, 'reason', 200) ?? '';
    return {
      data: { formShown: true, note: 'Đã hiện biểu mẫu để khách để lại lời nhắn.' },
      cards: [{ type: 'handoff', reason }],
    };
  }
}
