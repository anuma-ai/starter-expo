# Expo Starter

A starter template for building mobile AI chat apps with
[Expo](https://expo.dev/), React Native, and the
[Anuma SDK](https://www.npmjs.com/package/@anuma/sdk). Includes Google OAuth
authentication, real-time streaming chat with model selection, conversation
history, image attachments, and embedded wallet support.

## Getting Started

### Create an Anuma app

Sign in at [dashboard.anuma.ai](https://dashboard.anuma.ai/) and create an app.
This provisions the API account that powers AI responses.

### Clone and install

```bash
git clone https://github.com/anuma-ai/starter-expo.git
cd starter-expo
pnpm install
```

This app uses native modules and requires a development client — it won't work
with Expo Go. You'll need an iOS Simulator or Android Emulator.

### Configure environment variables

```bash
cp .env.example .env.local
```

At minimum you need `EXPO_PUBLIC_PRIVY_APP_ID` and
`EXPO_PUBLIC_PRIVY_CLIENT_ID` from the
[Privy Dashboard](https://dashboard.privy.io/). For iOS builds, also set
`EXPO_PUBLIC_APPLE_TEAM_ID`.

The API base URL defaults to `https://portal.anuma-dev.ai` in
`constants/api.ts`.

### Run the app

Build and run on iOS:

```bash
pnpm run ios
```

Build and run on Android:

```bash
pnpm run android
```

## Features

- Google OAuth authentication via Privy
- Real-time streaming AI chat with model selection
- Conversation history with local persistence (WatermelonDB)
- Image attachments in messages
- Gesture-driven conversation drawer
- Embedded wallet support (EVM)

## Key Patterns

The app uses the Anuma SDK's `useChatStorage` hook for message persistence.
Messages are stored locally in WatermelonDB and synced with the API. Streaming
responses arrive via SSE, which requires polyfills configured in
`entrypoint.js`.

Authentication tokens from Privy are passed to the SDK via `getIdentityToken`,
so the SDK can authenticate API requests on behalf of the user.

## License

MIT
