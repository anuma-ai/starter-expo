import { type ToolConfig } from "@anuma/sdk/tools";

// #region timezoneTool
export const timezoneTool: ToolConfig = {
  type: "function",
  function: {
    name: "get_current_time",
    description:
      "Get the current date and time for a given IANA timezone (e.g. America/New_York, Europe/London).",
    parameters: {
      type: "object",
      properties: {
        timezone: {
          type: "string",
          description: "IANA timezone identifier (e.g. America/New_York)",
        },
      },
      required: ["timezone"],
    },
  },
  executor: async (args: Record<string, unknown>) => {
    const timezone = args.timezone as string;
    const resp = await fetch(
      `https://timeapi.io/api/time/current/zone?timeZone=${encodeURIComponent(timezone)}`
    );
    if (!resp.ok) {
      return `Error: Timezone lookup failed (${resp.status})`;
    }
    const data = await resp.json();
    return {
      timezone: data.timeZone,
      datetime: data.dateTime,
      utcOffset: data.utcOffset,
      dayOfWeek: data.dayOfWeek,
    };
  },
  autoExecute: true,
};
// #endregion timezoneTool
