import { useAuth } from '../context/AuthContext';

/**
 * Enterprise AI API base — completely isolated from public AI chat.
 * All conversations are scoped to hospital_id + user_id + role_id.
 */
export const AI_API_BASE = '/v2/lifelink-ai';

/**
 * Legacy public AI API base — for guest/non-enterprise users.
 */
export const PUBLIC_AI_BASE = '/v2/agents';

/**
 * Hook that returns the appropriate API base URL and session endpoints
 * based on the current user's auth context.
 *
 * - Enterprise users (hospital_id, subRole) → /v2/lifelink-ai/*
 * - Public/guest users → /v2/agents/*
 */
export function useEnterpriseAI() {
  const { user } = useAuth();

  // An enterprise user has hospital context (hospital_id or subRole)
  const isEnterprise = Boolean(
    user?.hospital_id || user?.hospitalId || user?.subRole
  );

  const apiBase = isEnterprise ? AI_API_BASE : PUBLIC_AI_BASE;
  const isEnterpriseUser = isEnterprise;

  return {
    /**
     * Base URL for API calls.
     */
    apiBase,

    /**
     * True if the current user is an enterprise (hospital) user.
     */
    isEnterpriseUser,

    /**
     * Build an endpoint path relative to the correct API base.
     */
    endpoint: (path) => `${apiBase}${path}`,

    /**
     * Normalize a conversation from either backend into a consistent shape.
     */
    normalizeConversation: (item = {}) => ({
      id: item.id || item.conversation_id || '',
      title: item.title || 'New conversation',
      memoryId: item.id || item.conversation_id || null,
      createdAt: item.created_at || item.createdAt || new Date().toISOString(),
      updatedAt: item.updated_at || item.updatedAt || new Date().toISOString(),
      messages: (item.messages || item.messages || []).map(normalizeMessage),
      messageCount: item.message_count || item.messageCount || 0,
      module: item.module || 'general',
      mode: item.mode || 'chat',
      isPinned: item.is_pinned || false,
    }),

    /**
     * Normalize a message from either backend into a consistent shape.
     */
    normalizeMessage: (message = {}) => ({
      id: message.id || crypto.randomUUID?.(),
      role: message.role || 'assistant',
      content: message.content || '',
      createdAt: message.created_at || message.createdAt || new Date().toISOString(),
      attachments: message.attachments || [],
      sourceQuery: message.source_query || message.sourceQuery || message.sourceQuery || '',
      confidence: Number.isFinite(message.confidence) ? message.confidence : null,
      webResults: message.web_results || message.webResults || message.webResults || [],
      report: message.report || null,
      charts: message.charts || [],
      references: message.references || message.references_field || [],
      reasoning: message.reasoning || [],
      clarifying: message.clarifying || message.clarifying_questions || [],
      orchestration: message.orchestration || null,
      metadata: message.metadata || message.extra_data || null,
      followUp: message.follow_up || message.followUp || null,
    }),

    /**
     * Parse the response from either backend into { answer, conversation, context }.
     */
    parseAskResponse: (data = {}) => {
      if (data.conversation) {
        // Enterprise backend response
        return {
          answer: data.answer || '',
          conversation: data.conversation,
          context: data.context || null,
          ragChunks: data.rag_chunks || [],
          latencyMs: data.latency_ms || 0,
          ok: data.ok !== false,
        };
      }
      // Public backend response
      return {
        answer: data.answer || '',
        conversation: data.session
          ? {
              id: data.session.id,
              title: data.session.title,
              messages: (data.session.messages || []).map(normalizeMessage),
            }
          : null,
        context: null,
        ragChunks: [],
        latencyMs: 0,
        ok: true,
      };
    },
  };
}

// Inline helpers for the hook (also exported for direct use)
export const normalizeMessage = (message = {}) => ({
  id: message.id || crypto.randomUUID?.(),
  role: message.role || 'assistant',
  content: message.content || '',
  createdAt: message.created_at || message.createdAt || new Date().toISOString(),
  attachments: message.attachments || [],
  sourceQuery: message.source_query || message.sourceQuery || '',
  confidence: Number.isFinite(message.confidence) ? message.confidence : null,
  webResults: message.web_results || message.webResults || [],
  report: message.report || null,
  charts: message.charts || [],
  references: message.references || message.references_field || [],
  reasoning: message.reasoning || [],
  clarifying: message.clarifying || message.clarifying_questions || [],
  orchestration: message.orchestration || null,
  metadata: message.metadata || message.extra_data || null,
  followUp: message.follow_up || message.followUp || null,
});

export const normalizeConversation = (item = {}) => ({
  id: item.id || '',
  title: item.title || 'New conversation',
  memoryId: item.id || null,
  createdAt: item.created_at || item.createdAt || new Date().toISOString(),
  updatedAt: item.updated_at || item.updatedAt || new Date().toISOString(),
  messages: (item.messages || []).map(normalizeMessage),
  messageCount: item.message_count || item.messageCount || 0,
  module: item.module || 'general',
  mode: item.mode || 'chat',
  isPinned: item.is_pinned || false,
});
