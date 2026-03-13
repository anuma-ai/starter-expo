# Sending Messages

The `ChatInput` component handles composing and sending messages, including text,
image attachments, and optimistic UI updates.

## Optimistic UI Updates

Add the user's message to the UI immediately before the API responds. This
creates a snappy experience by showing the message right away. On error, the
optimistic update is reverted by reloading from the database.

```tsx
    // Optimistic update: show the user's message in the UI immediately rather
    // than waiting for the API round-trip. On error we revert to the DB state.
    // After success we merge stored messages with the optimistic file URLs,
    // because the DB strips data URIs from attachments.
    const existingMessages = currentConversationId
      ? await getMessages(currentConversationId)
      : [];
    onMessagesChange([
      ...existingMessages,
      {
        uniqueId: "temp",
        messageId: 0,
        conversationId: "",
        role: "user",
        content: prompt,
        files: optimisticFiles,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as StoredMessage,
    ]);
```

## Building Content Parts

The API expects content as an array of typed parts. Text is always included, and
images are added as `image_url` parts when an attachment is present.

```tsx
    const userContent: Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }> = [
      { type: "text", text: prompt },
    ];
    if (attachedImage) {
      userContent.push({ type: "image_url", image_url: { url: attachedImage } });
    }
```

## Calling sendMessage

The content parts are passed to `sendMessage` along with the selected model.
`includeHistory: true` tells the SDK to prepend conversation history
automatically.

```tsx
    const result = await sendMessage({
      messages: [{ role: "user", content: userContent }],
      model: selectedModel,
      includeHistory: true,
      serverTools: [],
    });
```

## Title Generation

After the first message in a new conversation, the title is set to a truncated
version of the user's input using `updateConversationTitle` from the SDK.

```tsx
        // Set conversation title to first message (truncated)
        const isNewConversation = !conversationId;
        if (isNewConversation) {
          const title = prompt.length > 50 ? prompt.slice(0, 50) + "..." : prompt;
          await updateConversationTitle(convId, title);
        }
```

## Post-Stream Merge

After streaming completes, messages are reloaded from the database. Because
WatermelonDB strips data URIs from file attachments, the merge step preserves
the original image URLs from the optimistic update so attached images continue
to render.

```tsx
        // Instead of reloading from DB (which strips data URIs),
        // merge stored messages with preserved file URLs from optimistic update
        const storedMessages = await getMessages(convId);

        // Merge: preserve file URLs for user messages that had attachments
        const mergedMessages = storedMessages.map((msg: StoredMessage) => {
          // If this is the user message we just sent and it had files
          if (msg.role === "user" && msg.content === prompt && optimisticFiles) {
            // Check if stored message has files without URLs (stripped data URIs)
            if (!msg.files || msg.files.every((f) => !f.url)) {
              return { ...msg, files: optimisticFiles };
            }
          }
          return msg;
        });

        onMessagesChange(mergedMessages);
```

## Message Format Conversion

`StoredMessage` from the SDK is converted to a UI-friendly format. Messages
with image files are transformed into multi-part content arrays so the chat
view can render both text and images.

```tsx
// Convert StoredMessage to UI Message format
const toUIMessage = (msg: StoredMessage): Message => {
  // Check if message has files with URLs
  const imageFiles = msg.files?.filter((f) => f.url) || [];

  if (imageFiles.length === 0) {
    return { role: msg.role, content: msg.content };
  }

  // Build content array with text and images
  const contentArray: MessageContent = [
    { type: "text", text: msg.content },
    ...imageFiles.map((f) => ({
      type: "image_url" as const,
      image_url: { url: f.url! },
    })),
  ];

  return { role: msg.role, content: contentArray };
};
```
