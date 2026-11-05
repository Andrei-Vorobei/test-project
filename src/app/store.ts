import {
  configureStore,
  createListenerMiddleware,
  isAnyOf,
} from '@reduxjs/toolkit'
import chatsReducer, {
  createConversation,
  deleteConversation,
  runAssistant,
  selectConversation,
  setPersistenceWarning,
} from '../features/chat/chatsSlice'
import { saveChatState } from '../features/chat/chatPersistence'

const persistenceListener = createListenerMiddleware()

export const store = configureStore({
  reducer: {
    chats: chatsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().prepend(persistenceListener.middleware),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

persistenceListener.startListening({
  matcher: isAnyOf(
    createConversation,
    deleteConversation,
    selectConversation,
    runAssistant.pending,
    runAssistant.fulfilled,
    runAssistant.rejected,
  ),
  effect: (_action, listenerApi) => {
    const { conversations, activeConversationId } = (
      listenerApi.getState() as RootState
    ).chats

    try {
      saveChatState({ conversations, activeConversationId })
      listenerApi.dispatch(setPersistenceWarning(null))
    } catch (error) {
      console.error('Unable to save conversations.', error)
      listenerApi.dispatch(
        setPersistenceWarning('Не удалось сохранить диалоги на этом устройстве.'),
      )
    }
  },
})
