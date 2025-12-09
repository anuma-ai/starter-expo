import { useState, useRef, useEffect } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { MenuView } from "@react-native-menu/menu";
import { useIdentityToken } from "@privy-io/expo";
import { useChat, useImageGeneration } from "@reverbia/sdk/expo";
import * as ImagePicker from "expo-image-picker";

type MessageContent =
  | string
  | Array<
      | { type: "text"; text: string }
      | { type: "image_url"; image_url: { url: string } }
    >;

interface Message {
  role: string;
  content: MessageContent;
}

interface ChatInputProps {
  messages: Message[];
  onMessagesUpdate: (messages: Message[]) => void;
  streamingContent: string;
  setStreamingContent: (content: string) => void;
}

// Convert our Message format to the API format
const toApiMessages = (messages: Message[]) => {
  return messages.map((msg) => {
    if (typeof msg.content === "string") {
      return { role: msg.role, content: msg.content };
    }
    // For array content (with images), convert to API format
    return {
      role: msg.role,
      content: msg.content.map((part) => {
        if (part.type === "text") {
          return { type: "text" as const, text: part.text };
        }
        return {
          type: "image_url" as const,
          image_url: { url: part.image_url.url },
        };
      }),
    };
  });
};

export default function ChatInput({
  messages,
  onMessagesUpdate,
  streamingContent,
  setStreamingContent,
}: ChatInputProps) {
  const { getIdentityToken } = useIdentityToken();
  const [input, setInput] = useState("");
  const [lineCount, setLineCount] = useState(1);
  const [imageMode, setImageMode] = useState(false);
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const messagesBeforeStreamRef = useRef<Message[]>([]);
  const accumulatedContentRef = useRef("");

  // Store latest callbacks in refs so useChat callbacks always have fresh references
  const setStreamingContentRef = useRef(setStreamingContent);
  const onMessagesUpdateRef = useRef(onMessagesUpdate);

  useEffect(() => {
    setStreamingContentRef.current = setStreamingContent;
    onMessagesUpdateRef.current = onMessagesUpdate;
  }, [setStreamingContent, onMessagesUpdate]);

  const { isLoading: isChatLoading, sendMessage } = useChat({
    getToken: getIdentityToken,
    baseUrl: "https://ai-portal-dev.zetachain.com",
    onData: (chunk: any) => {
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

  const { isLoading: isImageLoading, generateImage } = useImageGeneration({
    getToken: getIdentityToken,
    baseUrl: "https://ai-portal-dev.zetachain.com",
  });

  const isLoading = isChatLoading || isImageLoading;

  const onSubmit = async () => {
    if (!input.trim() || isLoading) return;

    const prompt = input.trim();

    // Build user message content - include attached image if present
    let userContent: MessageContent;
    if (attachedImage) {
      userContent = [
        { type: "text", text: prompt },
        { type: "image_url", image_url: { url: attachedImage } },
      ];
    } else {
      userContent = prompt;
    }

    const userMessage = { role: "user", content: userContent };
    const updatedMessages = [...messages, userMessage];

    onMessagesUpdate(updatedMessages);
    setInput("");
    setAttachedImage(null);

    if (imageMode) {
      // Image generation mode
      setImageMode(false);

      // Add loading placeholder
      const messagesWithLoading = [
        ...updatedMessages,
        { role: "assistant", content: "[[IMAGE_LOADING]]" },
      ];
      onMessagesUpdate(messagesWithLoading);

      console.log("Generating image with prompt:", prompt);
      const result = await generateImage({
        prompt,
        model: "openai-dall-e-3",
        response_format: "url",
      });
      console.log("Image generation result:", JSON.stringify(result, null, 2));

      const imageUrl =
        (result.data as any)?.images?.[0]?.url ||
        (result.data as any)?.data?.[0]?.url;
      if (imageUrl) {
        console.log("Image URL:", imageUrl);
        // Replace loading placeholder with actual image
        onMessagesUpdate([
          ...updatedMessages,
          {
            role: "assistant",
            content: imageUrl,
          },
        ]);
      } else if (result.error) {
        console.error("Image generation error:", result.error);
        // Remove loading placeholder on error
        onMessagesUpdate(updatedMessages);
      } else {
        console.log("No image URL found in result");
        // Remove loading placeholder if no URL
        onMessagesUpdate(updatedMessages);
      }
    } else {
      // Chat mode
      messagesBeforeStreamRef.current = updatedMessages;
      accumulatedContentRef.current = "";
      setStreamingContent("");

      const result = await sendMessage({
        messages: toApiMessages(updatedMessages) as any,
        model: "openai/gpt-4o",
      });

      // Fallback if no streaming happened
      if (
        !accumulatedContentRef.current &&
        result.data?.choices?.[0]?.message
      ) {
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
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0]?.base64) {
      const asset = result.assets[0];
      const extension = asset.uri.split(".").pop()?.toLowerCase() || "jpeg";
      const mimeType = extension === "png" ? "image/png" : "image/jpeg";
      setAttachedImage(`data:${mimeType};base64,${asset.base64}`);
    }
  };

  const handleMenuAction = (event: string) => {
    if (event === "generate-image") {
      setImageMode(!imageMode);
    } else if (event === "attach-image") {
      pickImage();
    }
  };

  return (
    <View style={styles.container}>
      {attachedImage && (
        <View style={styles.attachedImageContainer}>
          <Image source={{ uri: attachedImage }} style={styles.attachedImage} />
          <TouchableOpacity
            style={styles.removeImageButton}
            onPress={() => setAttachedImage(null)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <View style={styles.removeImageButtonInner}>
              <Ionicons name="close" size={12} color="#fff" />
            </View>
          </TouchableOpacity>
        </View>
      )}
      <View style={styles.inputRow}>
        <MenuView
          onPressAction={({ nativeEvent }) =>
            handleMenuAction(nativeEvent.event)
          }
          actions={[
            {
              id: "generate-image",
              title: "Generate image",
              image: "photo.fill",
              imageColor: "#007AFF",
              state: imageMode ? "on" : "off",
            },
            {
              id: "attach-image",
              title: "Attach image",
              image: "paperclip",
              imageColor: "#007AFF",
            },
          ]}
        >
          <View
            style={[styles.plusButton, imageMode && styles.plusButtonActive]}
          >
            <Ionicons
              name={imageMode ? "image" : "add"}
              size={24}
              color={imageMode ? "#007AFF" : "#000"}
            />
          </View>
        </MenuView>

        <TextInput
          style={[styles.input, { borderRadius: lineCount > 1 ? 20 : 9999 }]}
          value={input}
          onChangeText={(text) => {
            setInput(text);
            setLineCount((text.match(/\n/g) || []).length + 1);
          }}
          placeholder={imageMode ? "Describe the image..." : "Message..."}
          placeholderTextColor="#999"
          multiline
          maxLength={2000}
          blurOnSubmit={true}
          onSubmitEditing={onSubmit}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 12,
    paddingBottom: 34,
    backgroundColor: "transparent",
    gap: 8,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  attachedImageContainer: {
    position: "relative",
    alignSelf: "flex-start",
    marginBottom: 4,
  },
  attachedImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  removeImageButton: {
    position: "absolute",
    top: 4,
    right: 4,
  },
  removeImageButtonInner: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "rgba(60, 60, 67, 0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  plusButton: {
    width: 40,
    height: 40,
    borderRadius: 9999,
    backgroundColor: "rgba(240, 240, 240, 0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  plusButtonActive: {
    backgroundColor: "rgba(0, 122, 255, 0.15)",
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    backgroundColor: "rgba(240, 240, 240, 0.9)",
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
