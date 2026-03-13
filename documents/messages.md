# Sending Messages

The `ChatInput` component handles composing and sending messages, including text,
image attachments, and optimistic UI updates.

## Optimistic UI Updates

Add the user's message to the UI immediately before the API responds. This
creates a snappy experience by showing the message right away. On error, the
optimistic update is reverted by reloading from the database.

{@includeCode ../components/ChatInput.tsx#optimisticUpdate}

## Building Content Parts

The API expects content as an array of typed parts. Text is always included, and
images are added as `image_url` parts when an attachment is present.

{@includeCode ../components/ChatInput.tsx#contentParts}

## Calling sendMessage

The content parts are passed to `sendMessage` along with the selected model.
`includeHistory: true` tells the SDK to prepend conversation history
automatically.

{@includeCode ../components/ChatInput.tsx#sendCall}

## Title Generation

After the first message in a new conversation, the title is set to a truncated
version of the user's input using `updateConversationTitle` from the SDK.

{@includeCode ../components/ChatInput.tsx#titleGeneration}

## Post-Stream Merge

After streaming completes, messages are reloaded from the database. Because
WatermelonDB strips data URIs from file attachments, the merge step preserves
the original image URLs from the optimistic update so attached images continue
to render.

{@includeCode ../components/ChatInput.tsx#postStreamMerge}

## Message Format Conversion

`StoredMessage` from the SDK is converted to a UI-friendly format. Messages
with image files are transformed into multi-part content arrays so the chat
view can render both text and images.

{@includeCode ../app/_layout.tsx#toUIMessage}
