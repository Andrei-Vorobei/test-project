import { describe, expect, it } from 'vitest'
import {
  agentEventReceived,
  createConversation,
  deleteConversation,
  runAssistant,
  selectConversation,
} from './chatsSlice'
import type { Conversation, UserMessage } from './chatTypes'
import chatsReducer from './chatsSlice'

function createTestConversation(id = 'conversation-1'): Conversation {
  return {
    id,
    title: 'Новый диалог',
    createdAt: '2026-01-01T10:00:00.000Z',
    updatedAt: '2026-01-01T10:00:00.000Z',
    messages: [],
  }
}

function createUserMessage(id = 'question-1'): UserMessage {
  return {
    id,
    role: 'user',
    content: 'Объясни закон Ома',
    createdAt: '2026-01-01T10:01:00.000Z',
  }
}

function createRequest(
  userMessage = createUserMessage(),
  assistantMessageId = 'answer-1',
) {
  return {
    conversationId: 'conversation-1',
    userMessageId: userMessage.id,
    assistantMessageId,
    assistantCreatedAt: '2026-01-01T10:01:01.000Z',
    userMessage,
  }
}

describe('chat agent lifecycle', () => {
  it('keeps streaming updates in their conversation and ignores stale events', () => {
    const request = createRequest()
    let state = chatsReducer(undefined, { type: 'test/init' })
    state = chatsReducer(state, createConversation(createTestConversation()))
    state = chatsReducer(
      state,
      createConversation(createTestConversation('conversation-2')),
    )
    state = chatsReducer(state, selectConversation('conversation-1'))
    state = chatsReducer(state, runAssistant.pending('request-1', request))
    state = chatsReducer(state, selectConversation('conversation-2'))
    state = chatsReducer(
      state,
      agentEventReceived({
        conversationId: request.conversationId,
        requestId: 'request-1',
        event: { type: 'tool_call', tool: 'Калькулятор' },
      }),
    )
    state = chatsReducer(
      state,
      agentEventReceived({
        conversationId: request.conversationId,
        requestId: 'request-1',
        event: {
          type: 'tool_result',
          tool: 'Калькулятор',
          result: '17 × 24 = 408',
        },
      }),
    )
    state = chatsReducer(
      state,
      agentEventReceived({
        conversationId: request.conversationId,
        requestId: 'request-1',
        event: { type: 'text_delta', text: 'Часть ответа.' },
      }),
    )
    state = chatsReducer(
      state,
      agentEventReceived({
        conversationId: request.conversationId,
        requestId: 'outdated-request',
        event: { type: 'text_delta', text: 'Не должно добавиться.' },
      }),
    )

    const firstConversation = state.conversations.find(
      ({ id }) => id === request.conversationId,
    )
    const assistantMessage = firstConversation?.messages.find(
      (message) => message.role === 'assistant',
    )

    expect(state.generations[request.conversationId]?.requestId).toBe('request-1')
    expect(state.activeConversationId).toBe('conversation-2')
    expect(assistantMessage?.content).toBe('Часть ответа.')
    expect(assistantMessage?.status).toBe('streaming')
    expect(assistantMessage?.toolActivity).toEqual({
      name: 'Калькулятор',
      result: '17 × 24 = 408',
    })
    expect(
      state.conversations.find(({ id }) => id === 'conversation-2')?.messages,
    ).toHaveLength(0)

    state = chatsReducer(
      state,
      runAssistant.fulfilled(undefined, 'request-1', request),
    )
    state = chatsReducer(
      state,
      agentEventReceived({
        conversationId: request.conversationId,
        requestId: 'request-1',
        event: { type: 'text_delta', text: ' Поздний фрагмент.' },
      }),
    )

    expect(state.generations[request.conversationId]).toBeUndefined()
    expect(
      state.conversations.find(({ id }) => id === request.conversationId)?.messages.find(
        (message) => message.role === 'assistant',
      ),
    )
      .toMatchObject({
        content: 'Часть ответа.',
        status: 'complete',
        toolActivity: {
          name: 'Калькулятор',
          result: '17 × 24 = 408',
        },
      })
  })

  it('replaces a failed answer on retry without duplicating the user message', () => {
    const request = createRequest()
    let state = chatsReducer(undefined, { type: 'test/init' })
    state = chatsReducer(state, createConversation(createTestConversation()))
    state = chatsReducer(state, runAssistant.pending('request-1', request))
    state = chatsReducer(
      state,
      runAssistant.rejected(
        new Error('Mock failure'),
        'request-1',
        request,
        'Не удалось подготовить ответ.',
      ),
    )

    const retry = {
      ...request,
      userMessage: undefined,
      assistantMessageId: 'answer-2',
      assistantCreatedAt: '2026-01-01T10:02:00.000Z',
    }

    state = chatsReducer(state, runAssistant.pending('request-2', retry))
    state = chatsReducer(
      state,
      agentEventReceived({
        conversationId: retry.conversationId,
        requestId: 'request-1',
        event: { type: 'text_delta', text: 'Устаревший фрагмент.' },
      }),
    )

    const messages = state.conversations[0].messages

    expect(messages.filter((message) => message.role === 'user')).toHaveLength(1)
    expect(messages.filter((message) => message.role === 'assistant')).toHaveLength(1)
    expect(messages[1]).toMatchObject({
      id: 'answer-2',
      status: 'processing',
      content: '',
    })
    expect(state.generations[retry.conversationId]?.requestId).toBe('request-2')
  })

  it('deletes a conversation, selects the next available one, and ignores its events', () => {
    const request = createRequest()
    let state = chatsReducer(undefined, { type: 'test/init' })
    state = chatsReducer(state, createConversation(createTestConversation()))
    state = chatsReducer(
      state,
      createConversation(createTestConversation('conversation-2')),
    )
    state = chatsReducer(state, runAssistant.pending('request-1', request))
    state = chatsReducer(state, deleteConversation('conversation-2'))

    expect(state.activeConversationId).toBe('conversation-1')
    expect(state.conversations.map(({ id }) => id)).toEqual(['conversation-1'])
    expect(state.generations['conversation-2']).toBeUndefined()

    state = chatsReducer(
      state,
      agentEventReceived({
        conversationId: 'conversation-2',
        requestId: 'request-1',
        event: { type: 'text_delta', text: 'Не должен восстановиться.' },
      }),
    )
    state = chatsReducer(
      state,
      runAssistant.fulfilled(undefined, 'request-1', request),
    )

    expect(state.conversations.map(({ id }) => id)).toEqual(['conversation-1'])
    expect(state.generations['conversation-2']).toBeUndefined()

    state = chatsReducer(state, deleteConversation('conversation-1'))

    expect(state.conversations).toEqual([])
    expect(state.activeConversationId).toBeNull()
  })
})
