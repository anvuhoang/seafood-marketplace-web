import { Injectable } from '@nestjs/common';
import type { ChatSource, ChatTool, ToolOutcome } from '../chat.types.js';
import { KnowledgeService } from '../knowledge/knowledge.service.js';
import { reqString } from './tool-args.js';

/** Looks in the help documents: policies, delivery, payment, how to keep and cook seafood. */
@Injectable()
export class SearchKnowledgeTool implements ChatTool {
  readonly statusLabel = 'Đang tra cứu thông tin...';
  readonly declaration = {
    name: 'search_knowledge',
    description:
      'Tra cứu tài liệu của sàn: chính sách đổi trả, hoàn tiền, phí và thời gian giao hàng, cách thanh toán, hủy đơn, ' +
      'cách bảo quản và chế biến hải sản. Dùng cho câu hỏi về quy định và cách làm, KHÔNG dùng cho giá hay tồn kho. ' +
      'Chỉ trả lời dựa trên đoạn tài liệu trả về; nếu không có đoạn nào phù hợp, nói rằng bạn chưa có thông tin.',
    parameters: {
      type: 'object' as const,
      properties: {
        question: { type: 'string', description: 'Câu hỏi của khách, viết đầy đủ ý.' },
      },
      required: ['question'],
    },
  };

  constructor(private readonly knowledge: KnowledgeService) {}

  async execute(args: Record<string, unknown>): Promise<ToolOutcome> {
    const passages = await this.knowledge.search(reqString(args, 'question', 300), 4);
    // One source per document: its passages are titled "Document — section", and the customer sees the document.
    const sources: ChatSource[] = [];
    for (const passage of passages) {
      if (!sources.some((item) => item.source === passage.source)) {
        sources.push({ source: passage.source, title: passage.title.split(' — ')[0] });
      }
    }

    return {
      data:
        passages.length === 0
          ? { passages: [], note: 'Không có tài liệu nào liên quan đến câu hỏi này.' }
          : { passages: passages.map(({ source, title, content }) => ({ source, title, content })) },
      sources,
    };
  }
}
