import * as FileSystem from "expo-file-system";

type MessageContent =
  | string
  | Array<
      | { type: "text"; text: string }
      | { type: "image_url"; image_url: { url: string } }
    >;

export interface Message {
  role: string;
  content: MessageContent;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

const CONVERSATIONS_FILE = `${FileSystem.documentDirectory}conversations.json`;

export async function loadConversations(): Promise<Conversation[]> {
  try {
    const fileInfo = await FileSystem.getInfoAsync(CONVERSATIONS_FILE);
    if (!fileInfo.exists) {
      return [];
    }
    const content = await FileSystem.readAsStringAsync(CONVERSATIONS_FILE);
    const conversations = JSON.parse(content) as Conversation[];
    // Sort by most recently updated
    return conversations.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch (error) {
    console.error("Error loading conversations:", error);
    return [];
  }
}

export async function saveConversations(
  conversations: Conversation[]
): Promise<void> {
  try {
    await FileSystem.writeAsStringAsync(
      CONVERSATIONS_FILE,
      JSON.stringify(conversations)
    );
  } catch (error) {
    console.error("Error saving conversations:", error);
  }
}

export async function saveConversation(
  conversation: Conversation
): Promise<void> {
  const conversations = await loadConversations();
  const index = conversations.findIndex((c) => c.id === conversation.id);
  if (index >= 0) {
    conversations[index] = conversation;
  } else {
    conversations.unshift(conversation);
  }
  await saveConversations(conversations);
}

export async function deleteConversation(id: string): Promise<void> {
  const conversations = await loadConversations();
  const filtered = conversations.filter((c) => c.id !== id);
  await saveConversations(filtered);
}

export function createNewConversation(): Conversation {
  const now = Date.now();
  return {
    id: `conv_${now}_${Math.random().toString(36).substr(2, 9)}`,
    title: "New Chat",
    messages: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function generateTitle(messages: Message[]): string {
  if (messages.length === 0) return "New Chat";

  const firstUserMessage = messages.find((m) => m.role === "user");
  if (!firstUserMessage) return "New Chat";

  const content = firstUserMessage.content;
  const text =
    typeof content === "string"
      ? content
      : content.find((p) => p.type === "text")?.text || "";

  // Truncate to first 40 characters
  if (text.length <= 40) return text;
  return text.substring(0, 40) + "...";
}

