import { afterEach, describe, expect, it, vi } from 'vitest'
import { loadChatState } from './chatPersistence'

describe('chat persistence', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('marks an interrupted response as retryable after a reload', () => {
    const storedState = {
      activeConversationId: 'conversation-1',
      conversations: [
        {
          id: 'conversation-1',
          title: 'Закон Ома',
          createdAt: '2026-01-01T10:00:00.000Z',
          updatedAt: '2026-01-01T10:01:00.000Z',
          messages: [
            {
              id: 'question-1',
              role: 'user',
              content: 'Объясни закон Ома',
              createdAt: '2026-01-01T10:00:00.000Z',
            },
            {
              id: 'answer-1',
              role: 'assistant',
              userMessageId: 'question-1',
              content: 'Незавершённый ответ',
              createdAt: '2026-01-01T10:01:00.000Z',
              status: 'streaming',
            },
          ],
        },
      ],
    }

    vi.stubGlobal('localStorage', {
      getItem: vi.fn().mockReturnValue(JSON.stringify(storedState)),
    })

    const loaded = loadChatState()
    const assistantMessage = loaded.state.conversations[0].messages[1]

    expect(loaded.warning).toBeNull()
    expect(assistantMessage).toMatchObject({
      status: 'error',
      errorMessage: 'Ответ прервался при перезагрузке. Можно попробовать ещё раз.',
    })
  })
})
