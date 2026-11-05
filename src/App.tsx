import { useState } from 'react'
import { useAppDispatch, useAppSelector } from './app/hooks'
import {
  createConversation,
  deleteConversation,
  runAssistant,
  selectConversation,
  setPersistenceWarning,
} from './features/chat/chatsSlice'
import type { Conversation, UserMessage } from './features/chat/chatTypes'
import { ChatView } from './features/chat/ChatView'
import { ConversationSidebar } from './features/chat/ConversationSidebar'
import { MessageComposer } from './features/chat/MessageComposer'
import './App.css'

function createId(): string {
  return crypto.randomUUID()
}

function App() {
  const dispatch = useAppDispatch()
  const {
    conversations,
    activeConversationId,
    generations,
    persistenceWarning,
  } =
    useAppSelector((state) => state.chats)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  const activeConversation = conversations.find(
    ({ id }) => id === activeConversationId,
  )
  const activeGeneration = activeConversation
    ? generations[activeConversation.id]
    : undefined

  function handleCreateConversation() {
    const now = new Date().toISOString()
    const conversation: Conversation = {
      id: createId(),
      title: 'Новый диалог',
      createdAt: now,
      updatedAt: now,
      messages: [],
    }

    dispatch(createConversation(conversation))
    setIsSidebarOpen(false)
  }

  function handleSendMessage(content: string) {
    if (activeGeneration) {
      return
    }

    let conversationId = activeConversationId

    if (!conversationId || !activeConversation) {
      const now = new Date().toISOString()
      conversationId = createId()
      dispatch(
        createConversation({
          id: conversationId,
          title: 'Новый диалог',
          createdAt: now,
          updatedAt: now,
          messages: [],
        }),
      )
    }

    const message: UserMessage = {
      id: createId(),
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
    }

    dispatch(
      runAssistant({
        conversationId,
        userMessageId: message.id,
        assistantMessageId: createId(),
        assistantCreatedAt: new Date().toISOString(),
        userMessage: message,
      }),
    )
  }

  function handleRetry(userMessageId: string) {
    if (!activeConversation || activeGeneration) {
      return
    }

    dispatch(
      runAssistant({
        conversationId: activeConversation.id,
        userMessageId,
        assistantMessageId: createId(),
        assistantCreatedAt: new Date().toISOString(),
      }),
    )
  }

  function handleSelectConversation(conversationId: string) {
    dispatch(selectConversation(conversationId))
    setIsSidebarOpen(false)
  }

  function handleDeleteConversation(conversation: Conversation) {
    const title = conversation.title || 'Новый диалог'
    const confirmed = window.confirm(
      `Удалить диалог «${title}»? История сообщений будет удалена.`,
    )

    if (confirmed) {
      dispatch(deleteConversation(conversation.id))
    }
  }

  return (
    <div className="app-shell">
      <ConversationSidebar
        activeConversationId={activeConversationId}
        conversations={conversations}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onCreateConversation={handleCreateConversation}
        onDeleteConversation={handleDeleteConversation}
        onSelectConversation={handleSelectConversation}
      />

      <main className="chat-panel">
        <header className="chat-header">
          <button
            aria-label="Открыть список диалогов"
            className="mobile-menu-button"
            onClick={() => setIsSidebarOpen(true)}
            type="button"
          >
            <span />
            <span />
            <span />
          </button>
          <div className="chat-header__identity">
            <span aria-hidden="true" className="chat-header__avatar">
              ✳
            </span>
            <div>
              <p className="chat-header__title">Учебный помощник</p>
              <p className="chat-header__subtitle">
                <span
                  aria-hidden="true"
                  className={`status-dot${activeGeneration ? ' status-dot--busy' : ''}`}
                />
                {activeGeneration?.statusText ?? 'Всегда готов помочь'}
              </p>
            </div>
          </div>
        </header>

        {persistenceWarning && (
          <div className="persistence-warning" role="status">
            <span>{persistenceWarning}</span>
            <button
              aria-label="Закрыть уведомление"
              onClick={() => dispatch(setPersistenceWarning(null))}
              type="button"
            >
              ×
            </button>
          </div>
        )}

        <section aria-label="Переписка" className="chat-content">
          <ChatView
            generation={activeGeneration}
            messages={activeConversation?.messages ?? []}
            onRetry={handleRetry}
            disabled={Boolean(activeGeneration)}
            onUseSuggestion={handleSendMessage}
          />
        </section>

        <footer className="chat-footer">
          <MessageComposer
            onSend={handleSendMessage}
            onUseSuggestion={handleSendMessage}
            disabled={Boolean(activeGeneration)}
          />
        </footer>
      </main>
    </div>
  )
}

export default App
