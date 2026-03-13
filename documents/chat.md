# Chat Hook

`useChatStorageSetup` is the main hook that wires together the SDK's storage
layer, streaming callbacks, and model fetching. It wraps `useChatStorage` and
`useModels` from `@anuma/sdk/expo` into a single setup function.

## Hook Initialization

Pass the database, auth token, and streaming callbacks into `useChatStorage`.
The `onData` callback accumulates streamed chunks in a ref and forwards the
full text to the parent component on each token. `onFinish` and `onError`
reset the accumulator.

{@includeCode ../hooks/useChatStorageSetup.ts#hookInit}

## Models

The `useModels` hook fetches available LLM models from the API. It takes the
same `getToken` and `baseUrl` as the chat hook.

{@includeCode ../hooks/useChatStorageSetup.ts#models}

## Return Value

The hook spreads the SDK's chat storage methods and adds model data.

{@includeCode ../hooks/useChatStorageSetup.ts#returnValue}

## What's Next

- [Sending Messages](messages) — optimistic UI, content parts, and the send flow
- [Conversations](conversations) — switching, creating, and deleting conversations
- [Streaming](streaming) — how streamed tokens reach the UI
- [Fetching Models](models) — model picker integration
