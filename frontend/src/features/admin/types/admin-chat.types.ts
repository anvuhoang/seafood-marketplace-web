export interface AdminChatStats {
  conversations: number;
  conversationsLast7Days: number;
  userMessages: number;
  answers: number;
  thumbsUp: number;
  thumbsDown: number;
  /** Thumbs up out of all votes, 0-100; null while nobody voted. */
  satisfactionRate: number | null;
  openHandoffs: number;
  totalHandoffs: number;
  averageLatencyMs: number | null;
  toolUsage: Array<{ tool: string; count: number }>;
  daily: Array<{ day: string; count: number }>;
  knowledgePassages: number;
}

export type HandoffStatus = "OPEN" | "RESOLVED";

export interface AdminCustomerRef {
  fullName: string;
  email: string;
}

export interface AdminChatConversationItem {
  id: string;
  customer: AdminCustomerRef | null;
  firstMessage: string;
  messageCount: number;
  thumbsDown: number;
  handoffs: number;
  updatedAt: string;
}

export interface AdminChatConversationList {
  items: AdminChatConversationItem[];
  pagination: { page: number; limit: number; totalItems: number; totalPages: number };
}

export interface AdminChatMessage {
  id: string;
  role: "USER" | "ASSISTANT";
  content: string;
  cards: Array<{ type: string }>;
  sources: Array<{ source: string; title: string }>;
  toolsUsed: string[];
  feedback: "UP" | "DOWN" | null;
  latencyMs: number | null;
  createdAt: string;
}

export interface AdminHandoff {
  id: string;
  conversationId: string;
  contactName: string;
  contact: string;
  message: string;
  status: HandoffStatus;
  customer: AdminCustomerRef | null;
  createdAt: string;
}

export interface AdminChatConversationDetail {
  id: string;
  customer: AdminCustomerRef | null;
  createdAt: string;
  messages: AdminChatMessage[];
  handoffs: AdminHandoff[];
}

export interface KnowledgeSyncResult {
  documents: number;
  added: number;
  updated: number;
  removed: number;
  unchanged: number;
}

export interface LatencyStats {
  count: number;
  averageMs: number | null;
  p50Ms: number | null;
  p95Ms: number | null;
  maxMs: number | null;
}

export interface TokenStats {
  input: number;
  output: number;
  answers: number;
  modelCalls: number;
  averagePerAnswer: number | null;
}

export interface IncidentCount {
  kind: string;
  count: number;
}

export interface AdminChatHealth {
  model: {
    enabled: boolean;
    provider: string;
    chatModel: string;
    embedModel: string;
    timeoutMs: number;
    maxOutputTokens: number;
    maxToolRounds: number;
    historyMessages: number;
    maxMessageLength: number;
  };
  latency: {
    last24h: LatencyStats;
    last7d: LatencyStats;
    daily: Array<{ day: string; count: number; averageMs: number | null; p95Ms: number | null }>;
  };
  tokens: { today: TokenStats; last7d: TokenStats };
  quota: {
    dailyBudget: number;
    usedToday: number;
    remainingToday: number;
    usedPercent: number;
    resetsAt: string;
    perPerson: { messages: number; windowMinutes: number };
  };
  incidents: {
    last24h: IncidentCount[];
    last7d: IncidentCount[];
    recent: Array<{ id: string; kind: string; detail: string | null; createdAt: string }>;
  };
  warnings: string[];
}
