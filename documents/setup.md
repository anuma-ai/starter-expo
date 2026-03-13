# Setup

The starter requires a few pieces of infrastructure before the SDK hooks can run:
polyfills for React Native's missing Web APIs, a WatermelonDB database, and a
Privy authentication provider.

## Polyfills

React Native doesn't ship Web Streams or `TextDecoderStream`, both of which the
SDK needs for SSE streaming. The app's entrypoint installs these before anything
else loads.

{@includeCode ../entrypoint.js#polyfills}

Order matters — `react-native-get-random-values` and `@ethersproject/shims` must
come first, then the Web Streams polyfill, then `@anuma/sdk/polyfills` which
provides `TextDecoderStream`.

## Database

The SDK persists conversations and messages in WatermelonDB. Create a single
database instance using the schema, migrations, and model classes exported from
`@anuma/sdk/expo`.

{@includeCode ../utils/database.ts#database}

The `jsi: true` flag enables the JSI SQLite adapter for native performance. The
database is named `anuma_chat` and is shared across the app via a direct import.

## Authentication

Privy handles authentication and provides an identity token that the SDK uses for
API requests. Wrap your app in `PrivyProvider` with your app and client IDs from
the Expo config.

{@includeCode ../app/_layout.tsx#authProvider}

The `useIdentityToken` hook from Privy returns a `getIdentityToken` function that
the SDK's `useChatStorage` and `useModels` hooks accept as `getToken`.
