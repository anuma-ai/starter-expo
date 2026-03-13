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

3. Configure your credentials in `app.json` under `expo.extra`:

   - `privyAppId` — your Privy app ID from the [Privy Dashboard](https://dashboard.privy.io/)
   - `privyClientId` — your Privy client ID

4. Set the API base URL in `constants/api.ts` (defaults to `https://portal.anuma-dev.ai`).

## Running the App

Build and run on iOS:

```
pnpm run ios
```

Build and run on Android:

```
pnpm run android
```

## Project Structure

```
app/
  _layout.tsx        Main layout with chat UI, drawer, and navigation
  index.tsx          Entry route — shows login or empty view

components/
  ChatInput.tsx      Message input with image attach and model picker
  ChatMessages.tsx   Message list with markdown rendering
  ConversationList.tsx  Drawer with conversation history
  LoginScreen.tsx    OAuth login screen
  ModelPickerSheet.tsx  Modal for selecting AI models

hooks/
  useChatStorageSetup.ts  Wraps Anuma SDK's useChatStorage with auth and streaming

constants/
  api.ts             API base URL

utils/
  database.ts        WatermelonDB setup with SDK schema and migrations
```

## Key Patterns

The app uses the Anuma SDK's `useChatStorage` hook for message persistence. Messages are stored locally in WatermelonDB and synced with the API. Streaming responses arrive via SSE, which requires polyfills configured in `entrypoint.js`.

Authentication tokens from Privy are passed to the SDK via `getIdentityToken`, so the SDK can authenticate API requests on behalf of the user.
