import {
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from 'react'

const MAX_COMPOSER_HEIGHT = 160

interface MessageComposerProps {
  onSend: (content: string) => void
  onUseSuggestion: (suggestion: string) => void
  disabled?: boolean
}

export function MessageComposer({
  onSend,
  onUseSuggestion,
  disabled = false,
}: MessageComposerProps) {
  const [draft, setDraft] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useLayoutEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) {
      return
    }

    const element = textarea

    function resizeTextarea() {
      element.style.height = 'auto'
      const nextHeight = Math.min(
        element.scrollHeight,
        MAX_COMPOSER_HEIGHT,
      )
      element.style.height = `${nextHeight}px`
      element.style.overflowY =
        element.scrollHeight > MAX_COMPOSER_HEIGHT ? 'auto' : 'hidden'
    }

    resizeTextarea()
    window.addEventListener('resize', resizeTextarea)

    return () => window.removeEventListener('resize', resizeTextarea)
  }, [draft])

  function submitMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const content = draft.trim()
    if (!content || disabled) {
      return
    }

    onSend(content)
    setDraft('')
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      event.currentTarget.form?.requestSubmit()
    }
  }

  return (
    <div className="composer-wrap">
      <div className="quick-prompts" aria-label="Быстрые вопросы">
        <button
          onClick={() => onUseSuggestion('Объясни тему простыми словами')}
          disabled={disabled}
          type="button"
        >
          <span aria-hidden="true">✳</span> Объясни тему
        </button>
        <button
          onClick={() =>
            onUseSuggestion('Помоги решить задачу, не давая ответ сразу')
          }
          disabled={disabled}
          type="button"
        >
          <span aria-hidden="true">↗</span> Помоги с задачей
        </button>
      </div>
      <form className="composer" onSubmit={submitMessage}>
        <label className="visually-hidden" htmlFor="message-input">
          Напиши свой вопрос
        </label>
        <textarea
          autoComplete="off"
          id="message-input"
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Напиши свой вопрос..."
          ref={textareaRef}
          rows={1}
          value={draft}
        />
        <button
          aria-label="Отправить сообщение"
          className="composer__send"
          disabled={!draft.trim() || disabled}
          type="submit"
        >
          <svg
            aria-hidden="true"
            fill="none"
            height="19"
            viewBox="0 0 20 20"
            width="19"
          >
            <path
              d="M10 15.833V4.167M10 4.167 4.167 10M10 4.167 15.833 10"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.7"
            />
          </svg>
        </button>
      </form>
      <p className="composer-hint">
        Для примера ошибки напиши «вызови ошибку». LOM AI может ошибаться.
        <span> Enter — отправить · Shift + Enter — новая строка</span>
      </p>
    </div>
  )
}
