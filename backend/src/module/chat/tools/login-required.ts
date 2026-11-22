import type { ToolOutcome } from '../chat.types.js';

/** What a tool answers a guest who asks for something that belongs to an account. */
export function loginRequired(): ToolOutcome {
  return {
    data: { error: 'Khách chưa đăng nhập. Hãy mời khách đăng nhập để dùng chức năng này.', requiresLogin: true },
    cards: [{ type: 'login_required' }],
  };
}
