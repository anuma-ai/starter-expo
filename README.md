# Expo Starter

A starter template for building mobile AI chat apps with [Expo](https://expo.dev/), React Native, and the [Anuma SDK](https://www.npmjs.com/package/@anuma/sdk).

## Features

- Google OAuth authentication via Privy
- Real-time streaming AI chat with model selection
- Conversation history with local persistence (WatermelonDB)
- Image attachments in messages
- Gesture-driven conversation drawer
- Embedded wallet support (EVM)

## Prerequisites

- Node.js 18+
- pnpm
- Expo development client (this app uses native modules and won't work with Expo Go)
- iOS Simulator or Android Emulator

## Setup

1. Install dependencies:

```
pnpm install
```

2. The Anuma SDK is linked locally from `../sdk`. Make sure the SDK repo is cloned as a sibling directory.

3. Copy `.env.example` to `.env.local` and fill in your credentials:

```
cp .env.example .env.local
```

   At minimum you need `EXPO_PUBLIC_PRIVY_APP_ID` and `EXPO_PUBLIC_PRIVY_CLIENT_ID` from the [Privy Dashboard](https://dashboard.privy.io/). For iOS builds, also set `EXPO_PUBLIC_APPLE_TEAM_ID`.

4. The API base URL defaults to `https://portal.anuma-dev.ai` in `constants/api.ts`.

## Running the App

Build and run on iOS:

```
pnpm run ios
```

Build and run on Android:

```
pnpm run android
```

## Key Patterns

The app uses the Anuma SDK's `useChatStorage` hook for message persistence. Messages are stored locally in WatermelonDB and synced with the API. Streaming responses arrive via SSE, which requires polyfills configured in `entrypoint.js`.

Authentication tokens from Privy are passed to the SDK via `getIdentityToken`, so the SDK can authenticate API requests on behalf of the user.
