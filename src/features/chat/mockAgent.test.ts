import { afterEach, describe, expect, it, vi } from 'vitest'
import { streamAgentReply, type AgentEvent } from './mockAgent'
import type { ChatMessage } from './chatTypes'

async function collectEvents(
  generator: AsyncGenerator<AgentEvent>,
): Promise<AgentEvent[]> {
  const events: AgentEvent[] = []
  let next = await generator.next()

  while (!next.done) {
    events.push(next.value)
    const pendingNext = generator.next()
    await vi.runAllTimersAsync()
    next = await pendingNext
  }

  return events
}

describe('streamAgentReply', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('streams a contextual simplification using the previous assistant reply', async () => {
    vi.useFakeTimers()

    const history: ChatMessage[] = [
      {
        id: 'answer-1',
        role: 'assistant',
        userMessageId: 'question-1',
        content: 'Закон Ома описывает связь между напряжением, током и сопротивлением.',
        createdAt: '2026-01-01T10:00:00.000Z',
        status: 'complete',
      },
    ]

    const events = await collectEvents(
      streamAgentReply(
        { prompt: 'Объясни проще', history },
        new AbortController().signal,
      ),
    )
    const streamedText = events
      .filter((event) => event.type === 'text_delta')
      .map((event) => event.text)
      .join('')

    expect(streamedText).toContain('напряжение как будто «толкает»')
    expect(events[0]).toEqual({ type: 'started' })
    expect(events.at(-1)).toEqual({ type: 'completed' })
  })

  it('uses the mock calculator and streams its result', async () => {
    vi.useFakeTimers()

    const events = await collectEvents(
      streamAgentReply(
        { prompt: 'Сколько будет 17 × 24?', history: [] },
        new AbortController().signal,
      ),
    )

    expect(events).toContainEqual({ type: 'tool_call', tool: 'Калькулятор' })
    expect(events).toContainEqual({
      type: 'tool_result',
      tool: 'Калькулятор',
      result: '17 × 24 = 408',
    })
    expect(
      events
        .filter((event) => event.type === 'text_delta')
        .map((event) => event.text)
        .join(''),
    ).toContain('Ответ: 408')
  })

  it('returns a visible, retryable error for the demonstration prompt', async () => {
    vi.useFakeTimers()

    const events = await collectEvents(
      streamAgentReply(
        { prompt: 'Вызови ошибку', history: [] },
        new AbortController().signal,
      ),
    )

    expect(events).toEqual([
      { type: 'started' },
      {
        type: 'error',
        message: 'Не удалось подготовить ответ. Попробуй отправить запрос ещё раз.',
      },
    ])
  })
})
