import {
  createAsyncThunk,
  createSlice,
  type PayloadAction,
} from '@reduxjs/toolkit'
import { loadChatState } from './chatPersistence'
import { streamAgentReply, type AgentEvent } from './mockAgent'
import type {
  AgentGeneration,
  AssistantMessage,
  Conversation,
  UserMessage,
} from './chatTypes'

interface ChatsState {
  conversations: Conversation[]
  activeConversationId: string | null
  persistenceWarning: string | null
  generations: Record<string, AgentGeneration | undefined>
}

interface AgentRequestArgs {
  conversationId: string
  userMessageId: string
  assistantMessageId: string
  assistantCreatedAt: string
  userMessage?: UserMessage
}

const loadedState = loadChatState()

const initialState: ChatsState = {
  ...loadedState.state,
  persistenceWarning: loadedState.warning,
  generations: {},
}

export const runAssistant = createAsyncThunk<
  void,
  AgentRequestArgs,
  { state: { chats: ChatsState }; rejectValue: string }
>(
  'chats/runAssistant',
  async (
    { conversationId, userMessageId },
    { dispatch, getState, requestId, rejectWithValue, signal },
  ) => {
    const conversation = getState().chats.conversations.find(
      ({ id }) => id === conversationId,
    )

    if (!conversation) {
      return rejectWithValue('Не удалось найти этот диалог.')
    }

    const userMessageIndex = conversation.messages.findIndex(
      (message) => message.id === userMessageId && message.role === 'user',
    )
    const userMessage = conversation.messages[userMessageIndex]

    if (userMessage?.role !== 'user') {
      return rejectWithValue('Не удалось найти исходное сообщение.')
    }

    const history = conversation.messages.slice(0, userMessageIndex)

    for await (const event of streamAgentReply(
      { prompt: userMessage.content, history },
      signal,
    )) {
      if (event.type === 'error') {
        return rejectWithValue(event.message)
      }

      if (event.type === 'completed') {
        return
      }

      dispatch(agentEventReceived({ conversationId, requestId, event }))
    }
  },
  {
    condition: (args, { getState }) => {
      const { conversations, generations } = getState().chats
      const conversation = conversations.find(
        ({ id }) => id === args.conversationId,
      )

      if (!conversation || generations[args.conversationId]) {
        return false
      }

      if (args.userMessage) {
        return (
          args.userMessage.id === args.userMessageId &&
          !conversation.messages.some(
            (message) => message.id === args.userMessageId,
          )
        )
      }

      return conversation.messages.some(
        (message) =>
          message.role === 'user' && message.id === args.userMessageId,
      ) && conversation.messages.some(
        (message) =>
          message.role === 'assistant' &&
          message.status === 'error' &&
          message.userMessageId === args.userMessageId,
      )
    },
  },
)

export const agentEventReceived = (
  payload: {
    conversationId: string
    requestId: string
    event: Exclude<AgentEvent, { type: 'error' | 'completed' }>
  },
) => ({ type: 'chats/agentEventReceived' as const, payload })

const chatsSlice = createSlice({
  name: 'chats',
  initialState,
  reducers: {
    createConversation(state, action: PayloadAction<Conversation>) {
      state.conversations.unshift(action.payload)
      state.activeConversationId = action.payload.id
    },
    selectConversation(state, action: PayloadAction<string>) {
      if (state.conversations.some(({ id }) => id === action.payload)) {
        state.activeConversationId = action.payload
      }
    },
    deleteConversation(state, action: PayloadAction<string>) {
      const deletedIndex = state.conversations.findIndex(
        ({ id }) => id === action.payload,
      )

      if (deletedIndex === -1) {
        return
      }

      state.conversations.splice(deletedIndex, 1)
      delete state.generations[action.payload]

      if (state.activeConversationId === action.payload) {
        state.activeConversationId =
          state.conversations[deletedIndex]?.id ??
          state.conversations[deletedIndex - 1]?.id ??
          null
      }
    },
    setPersistenceWarning(state, action: PayloadAction<string | null>) {
      state.persistenceWarning = action.payload
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(runAssistant.pending, (state, action) => {
        const {
          assistantCreatedAt,
          assistantMessageId,
          conversationId,
          userMessage,
          userMessageId,
        } = action.meta.arg
        const conversation = state.conversations.find(
          ({ id }) => id === conversationId,
        )

        if (!conversation) {
          return
        }

        if (userMessage) {
          conversation.messages.push(userMessage)
          conversation.updatedAt = userMessage.createdAt

          if (conversation.messages.length === 1) {
            conversation.title = createConversationTitle(userMessage.content)
          }
        } else {
          conversation.messages = conversation.messages.filter(
            (message) =>
              !(
                message.role === 'assistant' &&
                message.status === 'error' &&
                message.userMessageId === userMessageId
              ),
          )
        }

        const assistantMessage: AssistantMessage = {
          id: assistantMessageId,
          role: 'assistant',
          userMessageId,
          content: '',
          createdAt: assistantCreatedAt,
          status: 'processing',
        }

        conversation.messages.push(assistantMessage)
        conversation.updatedAt = assistantCreatedAt
        state.generations[conversationId] = {
          requestId: action.meta.requestId,
          assistantMessageId,
          statusText: 'Обрабатываю запрос',
          tool: null,
        }
      })
      .addCase(runAssistant.fulfilled, (state, action) => {
        const { conversationId, assistantMessageId } = action.meta.arg
        const generation = state.generations[conversationId]

        if (generation?.requestId !== action.meta.requestId) {
          return
        }

        const conversation = state.conversations.find(
          ({ id }) => id === conversationId,
        )
        const assistantMessage = conversation?.messages.find(
          (message) =>
            message.id === assistantMessageId && message.role === 'assistant',
        )

        if (assistantMessage?.role === 'assistant') {
          assistantMessage.status = 'complete'
        }

        delete state.generations[conversationId]
      })
      .addCase(runAssistant.rejected, (state, action) => {
        const { conversationId, assistantMessageId } = action.meta.arg
        const generation = state.generations[conversationId]

        if (generation?.requestId !== action.meta.requestId) {
          return
        }

        const conversation = state.conversations.find(
          ({ id }) => id === conversationId,
        )
        const assistantMessage = conversation?.messages.find(
          (message) =>
            message.id === assistantMessageId && message.role === 'assistant',
        )

        if (assistantMessage?.role === 'assistant') {
          assistantMessage.status = 'error'
          assistantMessage.errorMessage =
            action.payload ??
            action.error.message ??
            'Не удалось подготовить ответ. Попробуй ещё раз.'
        }

        delete state.generations[conversationId]
      })
      .addMatcher(
        (action): action is ReturnType<typeof agentEventReceived> =>
          action.type === 'chats/agentEventReceived',
        (state, action) => {
          const { conversationId, requestId, event } = action.payload
          const generation = state.generations[conversationId]

          if (generation?.requestId !== requestId) {
            return
          }

          const conversation = state.conversations.find(
            ({ id }) => id === conversationId,
          )
          const assistantMessage = conversation?.messages.find(
            (message) =>
              message.id === generation.assistantMessageId &&
              message.role === 'assistant',
          )

          if (assistantMessage?.role !== 'assistant') {
            return
          }

          switch (event.type) {
            case 'started':
              generation.statusText = 'Обрабатываю запрос'
              break
            case 'status':
              generation.statusText = event.message
              break
            case 'tool_call':
              generation.tool = { name: event.tool, result: null }
              assistantMessage.toolActivity = {
                name: event.tool,
                result: null,
              }
              break
            case 'tool_result':
              if (generation.tool?.name === event.tool) {
                generation.tool.result = event.result
              }
              if (assistantMessage.toolActivity?.name === event.tool) {
                assistantMessage.toolActivity.result = event.result
              }
              break
            case 'text_delta':
              assistantMessage.content += event.text
              assistantMessage.status = 'streaming'
              generation.statusText = 'Формирую ответ'
              break
          }
        },
      )
  },
})

function createConversationTitle(content: string): string {
  const normalizedContent = content.replace(/\s+/g, ' ').trim()
  const maxLength = 36

  return normalizedContent.length > maxLength
    ? `${normalizedContent.slice(0, maxLength).trimEnd()}…`
    : normalizedContent
}

export const {
  createConversation,
  deleteConversation,
  selectConversation,
  setPersistenceWarning,
} = chatsSlice.actions

export default chatsSlice.reducer
