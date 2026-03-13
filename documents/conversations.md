# Conversation Management

The SDK's `useChatStorage` hook exposes methods for managing conversations. The
app wires these into a gesture-driven drawer that lists all conversations with
search, selection, creation, and deletion.

## Switching Conversations

When the user selects a conversation from the drawer, messages are loaded from the
database and the drawer closes. The `toUIMessage` helper converts stored messages
into the format the chat view expects.

{@includeCode ../app/_layout.tsx#switchConversation}

## Creating a Conversation

Starting a new conversation clears the current state. The SDK creates the actual
conversation record on the first `sendMessage` call when no `conversationId` is
set (auto-create mode).

{@includeCode ../app/_layout.tsx#newConversation}

## Deleting a Conversation

Deletion removes the conversation from the database via the SDK's
`deleteConversation` method. If the deleted conversation is the one currently
active, the UI is reset.

{@includeCode ../app/_layout.tsx#deleteConversation}

## Conversation Format

`StoredConversation` from the SDK is converted to a UI-friendly shape for the
conversation list component.

{@includeCode ../app/_layout.tsx#toUIConversation}
