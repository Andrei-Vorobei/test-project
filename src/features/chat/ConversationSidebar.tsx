import type { Conversation } from './chatTypes'

interface ConversationSidebarProps {
  conversations: Conversation[]
  activeConversationId: string | null
  isOpen: boolean
  onCreateConversation: () => void
  onDeleteConversation: (conversation: Conversation) => void
  onSelectConversation: (conversationId: string) => void
  onClose: () => void
}

export function ConversationSidebar({
  conversations,
  activeConversationId,
  isOpen,
  onCreateConversation,
  onDeleteConversation,
  onSelectConversation,
  onClose,
}: ConversationSidebarProps) {
  return (
    <>
      {isOpen && (
        <button
          aria-label="Закрыть меню диалогов"
          className="sidebar-backdrop"
          onClick={onClose}
          type="button"
        />
      )}
      <aside
        aria-label="Список диалогов"
        className={`sidebar${isOpen ? ' sidebar--open' : ''}`}
      >
        <a aria-label="LOM AI — на главную" className="brand" href="/">
          <span aria-hidden="true" className="brand__mark">
            L
          </span>
          <span className="brand__name">
            lom<span>ai</span>
          </span>
        </a>

        <button
          className="new-chat-button"
          onClick={onCreateConversation}
          type="button"
        >
          <span aria-hidden="true" className="new-chat-button__icon">
            +
          </span>
          Новый диалог
        </button>

        <div className="conversation-list">
          <p className="conversation-list__label">Недавние</p>
          {conversations.length === 0 ? (
            <p className="conversation-list__empty">
              Новые диалоги появятся здесь
            </p>
          ) : (
            <ul>
              {conversations.map((conversation) => (
                <li className="conversation-row" key={conversation.id}>
                  <button
                    aria-current={
                      conversation.id === activeConversationId
                        ? 'page'
                        : undefined
                    }
                    className={`conversation-item${
                      conversation.id === activeConversationId
                        ? ' conversation-item--active'
                        : ''
                    }`}
                    onClick={() => onSelectConversation(conversation.id)}
                    type="button"
                  >
                    <span aria-hidden="true" className="conversation-item__icon">
                      ◌
                    </span>
                    <span className="conversation-item__title">
                      {conversation.title || 'Новый диалог'}
                    </span>
                  </button>
                  <button
                    aria-label={`Удалить диалог «${conversation.title || 'Новый диалог'}»`}
                    className="conversation-item__delete"
                    onClick={() => onDeleteConversation(conversation)}
                    title="Удалить диалог"
                    type="button"
                  >
                    <svg
                      aria-hidden="true"
                      fill="none"
                      height="15"
                      viewBox="0 0 16 16"
                      width="15"
                    >
                      <path
                        d="M3.5 4.5h9m-8 0 .5 8h6l.5-8M6 4.5V3h4v1.5m-3 2v4m2-4v4"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.2"
                      />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="sidebar__footer">
          <span aria-hidden="true" className="student-avatar">
            У
          </span>
          <span className="sidebar__profile">
            <strong>Ученик</strong>
            <span>Рабочее пространство</span>
          </span>
          <span aria-hidden="true" className="sidebar__more">
            ···
          </span>
        </div>
      </aside>
    </>
  )
}
