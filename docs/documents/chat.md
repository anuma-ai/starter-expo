# Chat Hook

`useChatStorageSetup` is the main hook that wires together the SDK's storage
layer, streaming callbacks, and model fetching. It wraps `useChatStorage` and
`useModels` from `@anuma/sdk/expo` into a single setup function.

## Hook Initialization

Pass the database, auth token, and streaming callbacks into `useChatStorage`.
The `onData` callback accumulates streamed chunks in a ref and forwards the
full text to the parent component on each token. `onFinish` and `onError`
reset the accumulator.

```ts
  const chatStorage = useChatStorage({
    database,
    conversationId,
    getToken: getIdentityToken,
    baseUrl: API_BASE_URL,
    onData: (chunk: string) => {
      accumulatedContentRef.current += chunk;
      onStreamingContentRef.current?.(accumulatedContentRef.current);
    },
    onFinish: async () => {
      accumulatedContentRef.current = "";
      onStreamingContentRef.current?.("");
    },
    onError: (error: Error) => {
      console.error("Chat error:", error);
      accumulatedContentRef.current = "";
      onStreamingContentRef.current?.("");
      onErrorRef.current?.(error);
    },
  });
```

## Models

The `useModels` hook fetches available LLM models from the API. It takes the
same `getToken` and `baseUrl` as the chat hook.

```ts
  const { models, isLoading: isLoadingModels } = useModels({
    getToken: getIdentityToken,
    baseUrl: API_BASE_URL,
  });
```

## Return Value

The hook spreads the SDK's chat storage methods and adds model data.

```ts
  return {
    ...chatStorage,
    models,
    isLoadingModels,
    accumulatedContentRef,
  };
```

## What's Next

- [Sending Messages](messages) — optimistic UI, content parts, and the send flow
- [Conversations](conversations) — switching, creating, and deleting conversations
- [Streaming](streaming) — how streamed tokens reach the UI
- [Fetching Models](models) — model picker integration
