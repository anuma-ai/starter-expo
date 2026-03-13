import { Database } from "@nozbe/watermelondb";
import SQLiteAdapter from "@nozbe/watermelondb/adapters/sqlite";
import {
  chatStorageSchema,
  ChatMessage,
  ChatConversation,
} from "@anuma/sdk/expo";

const adapter = new SQLiteAdapter({
  schema: chatStorageSchema,
  dbName: "anuma_chat",
  jsi: true,
  onSetUpError: (error) => {
    console.error("Database setup error:", error);
  },
});

export const database = new Database({
  adapter,
  modelClasses: [ChatMessage, ChatConversation],
});
