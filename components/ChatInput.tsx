import { useState, useRef, useEffect } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useIdentityToken } from "@privy-io/expo";
import { useChat } from "@reverbia/sdk/expo";

interface Message {
  role: string;
  content: string;
}

interface ChatInputProps {
  messages: Message[];
  onMessagesUpdate: (messages: Message[]) => void;
  streamingContent: string;
  setStreamingContent: (content: string) => void;
}

export default function ChatInput({
  messages,
  onMessagesUpdate,
  streamingContent,
  setStreamingContent,
}: ChatInputProps) {
  const { getIdentityToken } = useIdentityToken();
  const [input, setInput] = useState("");
  const messagesBeforeStreamRef = useRef<Message[]>([]);
  const accumulatedContentRef = useRef("");

  // Store latest callbacks in refs so useChat callbacks always have fresh references
  const setStreamingContentRef = useRef(setStreamingContent);
  const onMessagesUpdateRef = useRef(onMessagesUpdate);

  useEffect(() => {
    setStreamingContentRef.current = setStreamingContent;
    onMessagesUpdateRef.current = onMessagesUpdate;
  }, [setStreamingContent, onMessagesUpdate]);

  const { isLoading, sendMessage } = useChat({
    getToken: getIdentityToken,
    baseUrl: "https://ai-portal-dev.zetachain.com",
    onData: (chunk) => {
      console.log("Streaming chunk:", chunk);
      // Chunk is the content string directly from this SDK
      const content =
        typeof chunk === "string"
          ? chunk
          : chunk.choices?.[0]?.delta?.content || "";
      if (content) {
        accumulatedContentRef.current += content;
        setStreamingContentRef.current(accumulatedContentRef.current);
      }
    },
    onFinish: () => {
      // Move streaming content to messages
      if (accumulatedContentRef.current) {
        onMessagesUpdateRef.current([
          ...messagesBeforeStreamRef.current,
          { role: "assistant", content: accumulatedContentRef.current },
        ]);
      }
      accumulatedContentRef.current = "";
      setStreamingContentRef.current("");
    },
    onError: (error) => {
      console.error("Chat error:", error);
      accumulatedContentRef.current = "";
      setStreamingContentRef.current("");
    },
  });

  const onSubmit = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = { role: "user", content: input };
    const updatedMessages = [...messages, userMessage];
    messagesBeforeStreamRef.current = updatedMessages;
    accumulatedContentRef.current = "";

    onMessagesUpdate(updatedMessages);
    setStreamingContent("");
    setInput("");

    const result = await sendMessage({
      messages: updatedMessages,
      model: "openai/gpt-4o",
    });

    // Fallback if no streaming happened
    if (!accumulatedContentRef.current && result.data?.choices?.[0]?.message) {
      const assistantMsg = result.data.choices[0].message;
      onMessagesUpdate([
        ...updatedMessages,
        {
          role: assistantMsg.role || "assistant",
          content:
            typeof assistantMsg.content === "string"
              ? assistantMsg.content
              : assistantMsg.content?.[0]?.text || "",
        },
      ]);
    } else if (result.error) {
      console.error("Chat error:", result.error);
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        value={input}
        onChangeText={setInput}
        placeholder="Message..."
        placeholderTextColor="#999"
        multiline
        maxLength={2000}
      />
      <TouchableOpacity
        onPress={onSubmit}
        disabled={isLoading || !input.trim()}
        style={[
          styles.sendButton,
          (!input.trim() || isLoading) && styles.sendButtonDisabled,
        ]}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Ionicons name="arrow-up" size={20} color="#fff" />
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    padding: 12,
    paddingBottom: 34,
    backgroundColor: "transparent",
    alignItems: "flex-end",
    gap: 8,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    backgroundColor: "rgba(240, 240, 240, 0.9)",
    borderRadius: 9999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    color: "#000",
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 9999,
    backgroundColor: "#007AFF",
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonDisabled: {
    backgroundColor: "#ccc",
  },
});
