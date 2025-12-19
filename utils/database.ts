import { Database } from "@nozbe/watermelondb";
import SQLiteAdapter from "@nozbe/watermelondb/adapters/sqlite";
import {
  chatStorageSchema,
  ChatMessage,
  ChatConversation,
} from "@reverbia/sdk/expo";

const adapter = new SQLiteAdapter({
  schema: chatStorageSchema,
  dbName: "reverbia_chat",
  jsi: true,
  onSetUpError: (error) => {
    console.error("Database setup error:", error);
  },
});

export const database = new Database({
  adapter,
  modelClasses: [ChatMessage, ChatConversation],
});
