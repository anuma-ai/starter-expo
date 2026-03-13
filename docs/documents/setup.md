# Setup

The starter requires a few pieces of infrastructure before the SDK hooks can run:
polyfills for React Native's missing Web APIs, a WatermelonDB database, and a
Privy authentication provider.

## Polyfills

React Native doesn't ship Web Streams or `TextDecoderStream`, both of which the
SDK needs for SSE streaming. The app's entrypoint installs these before anything
else loads.

```js
// Import required polyfills first
// IMPORTANT: These polyfills must be installed in this order
import "react-native-get-random-values";
import "@ethersproject/shims";
import { Buffer } from "buffer";
import { LogBox } from "react-native";
global.Buffer = Buffer;

// Suppress Privy embedded wallet timeout error (non-blocking SDK issue)
LogBox.ignoreLogs(["Ping reached timeout"]);

// Web Streams polyfill for SSE streaming (TextDecoderStream, TransformStream, etc.)
import { ReadableStream, TransformStream } from "web-streams-polyfill";
if (typeof globalThis.ReadableStream === "undefined") {
  globalThis.ReadableStream = ReadableStream;
}
if (typeof globalThis.TransformStream === "undefined") {
  globalThis.TransformStream = TransformStream;
}

// SDK polyfills (TextDecoderStream, etc.)
import "@anuma/sdk/polyfills";
```

Order matters — `react-native-get-random-values` and `@ethersproject/shims` must
come first, then the Web Streams polyfill, then `@anuma/sdk/polyfills` which
provides `TextDecoderStream`.

## Database

The SDK persists conversations and messages in WatermelonDB. Create a single
database instance using the schema, migrations, and model classes exported from
`@anuma/sdk/expo`.

```ts
const adapter = new SQLiteAdapter({
  schema: sdkSchema,
  migrations: sdkMigrations,
  dbName: "anuma_chat",
  jsi: true,
  onSetUpError: (error) => {
    console.error("Database setup error:", error);
  },
});

export const database = new Database({
  adapter,
  modelClasses: sdkModelClasses,
});
```

The `jsi: true` flag enables the JSI SQLite adapter for native performance. The
database is named `anuma_chat` and is shared across the app via a direct import.

## Authentication

Privy handles authentication and provides an identity token that the SDK uses for
API requests. Wrap your app in `PrivyProvider` with your app and client IDs from
the Expo config.

```tsx
export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PrivyProvider
        appId={Constants.expoConfig?.extra?.privyAppId}
        clientId={Constants.expoConfig?.extra?.privyClientId}
        config={{
          embedded: {
            ethereum: {
              createOnLogin: "users-without-wallets",
            },
            solana: {
              createOnLogin: "off",
            },
          },
        }}
      >
        <ErrorBoundary>
          <AppContent />
        </ErrorBoundary>
      </PrivyProvider>
    </GestureHandlerRootView>
  );
}
```

The `useIdentityToken` hook from Privy returns a `getIdentityToken` function that
the SDK's `useChatStorage` and `useModels` hooks accept as `getToken`.
