# Conversation Management

The SDK's `useChatStorage` hook exposes methods for managing conversations. The
app wires these into a gesture-driven drawer that lists all conversations with
search, selection, creation, and deletion.

## Switching Conversations

When the user selects a conversation from the drawer, messages are loaded from the
database and the drawer closes. The `toUIMessage` helper converts stored messages
into the format the chat view expects.

```tsx
  const handleSelectConversation = async (conversation: Conversation) => {
    setCurrentConversationId(conversation.id);
    setStreamingContent("");
    setDrawerOpen(false);
    // Load messages for selected conversation
    try {
      const storedMessages = await getMessagesRef.current(conversation.id);
      setMessages(storedMessages.map(toUIMessage));
    } catch (error) {
      console.error("Failed to load messages:", error);
      setMessages([]);
    }
  };
```

## Creating a Conversation

Starting a new conversation clears the current state. The SDK creates the actual
conversation record on the first `sendMessage` call when no `conversationId` is
set (auto-create mode).

```tsx
  const handleNewConversation = () => {
    setCurrentConversationId(null);
    setMessages([]);
    setStreamingContent("");
    setDrawerOpen(false);
  };
```

## Deleting a Conversation

Deletion removes the conversation from the database via the SDK's
`deleteConversation` method. If the deleted conversation is the one currently
active, the UI is reset.

```tsx
  const handleDeleteConversation = async (conversation: Conversation) => {
    try {
      await deleteConversationRef.current(conversation.id);
      // If we're deleting the current conversation, clear it
      if (currentConversationId === conversation.id) {
        setCurrentConversationId(null);
        setMessages([]);
        setStreamingContent("");
      }
      // Refresh the conversation list
      loadConversations();
    } catch (error) {
      console.error("Failed to delete conversation:", error);
    }
  };
```

## Conversation Format

`StoredConversation` from the SDK is converted to a UI-friendly shape for the
conversation list component.

```tsx
// Convert StoredConversation to UI Conversation format
const toUIConversation = (conv: StoredConversation): Conversation => ({
  id: conv.conversationId,
  title: conv.title || "New Chat",
  createdAt: conv.createdAt.getTime(),
  updatedAt: conv.updatedAt.getTime(),
});
```
