# Streaming

The SDK streams AI responses token-by-token via Server-Sent Events. The starter
app accumulates these chunks and appends a temporary assistant message to the
chat view so the response appears in real time.

## Callback Setup

The `useChatStorageSetup` hook passes three callbacks to the SDK's
`useChatStorage`:

- `onData` — called on each streamed chunk. Appends the chunk to a ref and
  forwards the full accumulated text to the parent via `onStreamingContent`.
- `onFinish` — resets the accumulator when streaming completes.
- `onError` — resets the accumulator and forwards the error.

{@includeCode ../hooks/useChatStorageSetup.ts#hookInit}

Callbacks are stored in refs to avoid re-creating the SDK hook when the parent
re-renders with new function references.

## Displaying Streaming Content

While streaming is active, the parent component appends a temporary assistant
message containing the accumulated text. Once streaming finishes, the
`onFinish` callback clears the streaming content and the message appears from
the database instead.

{@includeCode ../app/_layout.tsx#streamingDisplay}

## React Native Considerations

Unlike web apps that can update the DOM directly for low-latency rendering,
React Native goes through the bridge for every state update. The starter keeps
it simple by updating React state on each token. For very high-frequency
streaming, you could debounce the `onStreamingContent` callback or batch
updates using `requestAnimationFrame`.
