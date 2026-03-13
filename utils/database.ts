import { Database } from "@nozbe/watermelondb";
import SQLiteAdapter from "@nozbe/watermelondb/adapters/sqlite";
import {
  sdkSchema,
  sdkMigrations,
  sdkModelClasses,
} from "@anuma/sdk/expo";

// #region database
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
// #endregion database
