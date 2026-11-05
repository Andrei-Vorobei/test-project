import type {
  AssistantMessage,
  ChatMessage,
  Conversation,
  PersistedChatState,
  UserMessage,
} from './chatTypes'

const STORAGE_KEY = 'lom-ai-chat-state'

export interface LoadedChatState {
  state: PersistedChatState
  warning: string | null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isUserMessage(value: unknown): value is UserMessage {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    value.role === 'user' &&
    typeof value.content === 'string' &&
    typeof value.createdAt === 'string'
  )
}

function isAssistantMessage(value: unknown): value is AssistantMessage {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    value.role === 'assistant' &&
    typeof value.content === 'string' &&
    typeof value.createdAt === 'string' &&
    typeof value.userMessageId === 'string' &&
    (value.status === 'processing' ||
      value.status === 'streaming' ||
      value.status === 'complete' ||
      value.status === 'error') &&
    (value.errorMessage === undefined ||
      typeof value.errorMessage === 'string') &&
    (value.toolActivity === undefined ||
      (isRecord(value.toolActivity) &&
        typeof value.toolActivity.name === 'string' &&
        (value.toolActivity.result === null ||
          typeof value.toolActivity.result === 'string')))
  )
}

function isChatMessage(value: unknown): value is ChatMessage {
  return isUserMessage(value) || isAssistantMessage(value)
}

function isConversation(value: unknown): value is Conversation {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.title === 'string' &&
    typeof value.createdAt === 'string' &&
    typeof value.updatedAt === 'string' &&
    Array.isArray(value.messages) &&
    value.messages.every(isChatMessage)
  )
}

function isPersistedChatState(value: unknown): value is PersistedChatState {
  return (
    isRecord(value) &&
    Array.isArray(value.conversations) &&
    value.conversations.every(isConversation) &&
    (value.activeConversationId === null ||
      typeof value.activeConversationId === 'string')
  )
}

export function loadChatState(): LoadedChatState {
  const emptyState: PersistedChatState = {
    conversations: [],
    activeConversationId: null,
  }

  if (typeof localStorage === 'undefined') {
    return { state: emptyState, warning: null }
  }

  try {
    const storedValue = localStorage.getItem(STORAGE_KEY)
    if (storedValue === null) {
      return { state: emptyState, warning: null }
    }

    const parsedValue: unknown = JSON.parse(storedValue)
    if (!isPersistedChatState(parsedValue)) {
      throw new Error('Stored chat data does not match the expected format.')
    }

    const hasActiveConversation =
      parsedValue.activeConversationId === null ||
      parsedValue.conversations.some(
        (conversation) => conversation.id === parsedValue.activeConversationId,
      )

    if (!hasActiveConversation) {
      throw new Error('Stored active conversation does not exist.')
    }

    const conversations = parsedValue.conversations.map((conversation) => ({
      ...conversation,
      messages: conversation.messages.map((message) => {
        if (
          message.role === 'assistant' &&
          (message.status === 'processing' || message.status === 'streaming')
        ) {
          return {
            ...message,
            status: 'error' as const,
            errorMessage: 'Ответ прервался при перезагрузке. Можно попробовать ещё раз.',
          }
        }

        return message
      }),
    }))

    return {
      state: { ...parsedValue, conversations },
      warning: null,
    }
  } catch (error) {
    console.error('Unable to load saved conversations.', error)
    return {
      state: emptyState,
      warning: 'Не удалось загрузить сохранённые диалоги.',
    }
  }
}

export function saveChatState(state: PersistedChatState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}
