# Fetching Models

The `useModels` hook from `@anuma/sdk/expo` fetches available LLM models from the
API. The starter app wires it into a modal picker so users can select which model
to use for each message.

## Hook Initialization

```ts
  const { models, isLoading: isLoadingModels } = useModels({
    getToken: getIdentityToken,
    baseUrl: API_BASE_URL,
  });
```

The hook takes `getToken` (a function returning a Privy identity token) and an
optional `baseUrl`. It returns the `models` array and an `isLoading` flag.

## Model Picker

The `ModelPickerSheet` component renders a searchable modal list of available
models. Each model shows its name and provider, with a checkmark on the selected
one. The selected model ID is passed to `sendMessage` on each request.

## Model Shape

Each model object contains:

- `id` — the model identifier passed to the API (e.g. `openai/gpt-4o`)
- `name` — display name
- `provider` — the model provider name
