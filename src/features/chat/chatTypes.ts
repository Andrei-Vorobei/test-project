export interface UserMessage {
  id: string
  role: 'user'
  content: string
  createdAt: string
}

export interface AssistantMessage {
  id: string
  role: 'assistant'
  content: string
  createdAt: string
  userMessageId: string
  status: 'processing' | 'streaming' | 'complete' | 'error'
  errorMessage?: string
  toolActivity?: AgentToolActivity
}

export type ChatMessage = UserMessage | AssistantMessage

export interface AgentToolActivity {
  name: string
  result: string | null
}

export interface AgentGeneration {
  requestId: string
  assistantMessageId: string
  statusText: string
  tool: AgentToolActivity | null
}

export interface Conversation {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  messages: ChatMessage[]
}

export interface PersistedChatState {
  conversations: Conversation[]
  activeConversationId: string | null
}
