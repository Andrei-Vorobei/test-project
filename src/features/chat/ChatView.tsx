import type { ChatMessage } from './chatTypes'
import type { AgentGeneration } from './chatTypes'

interface ChatViewProps {
  messages: ChatMessage[]
  generation?: AgentGeneration
  disabled?: boolean
  onUseSuggestion: (suggestion: string) => void
  onRetry: (userMessageId: string) => void
}

const suggestions = [
  'Объясни закон Ома простыми словами',
  'Помоги решить задачу, не давая ответ сразу',
  'Сколько будет 17 × 24?',
]

export function ChatView({
  messages,
  generation,
  disabled = false,
  onUseSuggestion,
  onRetry,
}: ChatViewProps) {
  if (messages.length === 0) {
    return (
      <div className="welcome">
        <div aria-hidden="true" className="welcome__spark">
          <span>✳</span>
        </div>
        <p className="welcome__eyebrow">Твой помощник в учёбе</p>
        <h1>
          Привет! Что будем
          <br />
          изучать сегодня?
        </h1>
        <p className="welcome__description">
          Спроси о сложной теме, вместе разберём задачу
          <br className="desktop-break" /> или просто начни с того, что тебя
          интересует.
        </p>
        <div aria-label="Примеры вопросов" className="suggestions">
          {suggestions.map((suggestion, index) => (
            <button
              className="suggestion"
              disabled={disabled}
              key={suggestion}
              onClick={() => onUseSuggestion(suggestion)}
              type="button"
            >
              <span aria-hidden="true" className="suggestion__icon">
                {['✳', '↗', '∑'][index]}
              </span>
              <span>{suggestion}</span>
              <span aria-hidden="true" className="suggestion__arrow">
                ↗
              </span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div aria-live="polite" className="message-list" role="log">
      {messages.map((message) => (
        <article
          className={`message message--${message.role}`}
          key={message.id}
        >
          {message.role === 'assistant' && (
            <span aria-hidden="true" className="message__avatar">
              ✳
            </span>
          )}
          <div className="message__content">
            <p className="message__author">
              {message.role === 'user' ? 'Ты' : 'LOM AI'}
            </p>
            <p className="message__text">{message.content}</p>
            {message.role === 'assistant' &&
              (message.toolActivity ||
                generation?.assistantMessageId === message.id) && (
                <div className="agent-progress">
                  {message.toolActivity && (
                    <div className="tool-activity">
                      <span aria-hidden="true" className="tool-activity__icon">
                        ▦
                      </span>
                      <div>
                        <p className="tool-activity__title">
                          {message.toolActivity.name}
                          {message.toolActivity.result ? ' · готово' : ' · выполняется'}
                        </p>
                        {message.toolActivity.result && (
                          <p className="tool-activity__result">
                            {message.toolActivity.result}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                  {generation?.assistantMessageId === message.id &&
                    message.content.length === 0 && (
                    <span
                      aria-label={generation.statusText}
                      className="typing-indicator"
                    >
                      <span />
                      <span />
                      <span />
                    </span>
                    )}
                </div>
              )}
            {message.role === 'assistant' && message.status === 'error' && (
              <div className="message-error">
                <p>{message.errorMessage ?? 'Не удалось подготовить ответ.'}</p>
                <button
                  disabled={disabled}
                  onClick={() => onRetry(message.userMessageId)}
                  type="button"
                >
                  <span aria-hidden="true">↻</span>
                  Попробовать ещё раз
                </button>
              </div>
            )}
          </div>
        </article>
      ))}
    </div>
  )
}
