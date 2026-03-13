// entrypoint.js

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

// Then import the expo router
import "expo-router/entry";
