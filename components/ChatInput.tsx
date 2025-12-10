import { useState, useRef, useEffect, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { MenuView } from "@react-native-menu/menu";
import { useIdentityToken } from "@privy-io/expo";
import { useChat, useImageGeneration, useModels } from "@reverbia/sdk/expo";
import * as ImagePicker from "expo-image-picker";
import { GlassView } from "expo-glass-effect";
import { LinearGradient } from "expo-linear-gradient";

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

interface Model {
  id?: string;
  name?: string;
  provider?: string;
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

function ModelPickerSheet({
  visible,
  onClose,
  models,
  isLoading,
  selectedModelId,
  onSelectModel,
}: {
  visible: boolean;
  onClose: () => void;
  models: Model[];
  isLoading: boolean;
  selectedModelId: string;
  onSelectModel: (modelId: string) => void;
}) {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredModels = useMemo(() => {
    const validModels = models.filter((model) => model.id);
    if (!searchQuery.trim()) return validModels;
    const query = searchQuery.toLowerCase();
    return validModels.filter(
      (m) =>
        (m.name || m.id || "").toLowerCase().includes(query) ||
        (m.provider || "").toLowerCase().includes(query)
    );
  }, [models, searchQuery]);

  const handleSelect = (modelId: string) => {
    onSelectModel(modelId);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === "ios" ? "pageSheet" : "fullScreen"}
      onRequestClose={onClose}
    >
      <View style={sheetStyles.container}>
        {/* Grabber - Apple standard appearance */}
        <View style={sheetStyles.grabberContainer}>
          <View style={sheetStyles.grabber} />
        </View>

        {/* Header - Close button on left per Apple HIG */}
        <View style={sheetStyles.header}>
          <TouchableOpacity
            onPress={onClose}
            style={sheetStyles.closeButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <View style={sheetStyles.closeButtonCircle}>
              <Ionicons name="close" size={16} color="#3C3C43" />
            </View>
          </TouchableOpacity>
          <Text style={sheetStyles.title}>Models</Text>
          <View style={sheetStyles.headerSpacer} />
        </View>

        {/* Content */}
        {isLoading ? (
          <View style={sheetStyles.loadingContainer}>
            <ActivityIndicator size="large" color="#8E8E93" />
            <Text style={sheetStyles.loadingText}>Loading models...</Text>
          </View>
        ) : (
          <ScrollView
            style={sheetStyles.list}
            contentContainerStyle={{
              paddingTop: 64,
              paddingBottom: insets.bottom + 20,
            }}
            keyboardShouldPersistTaps="handled"
          >
            {filteredModels.map((model, index, arr) => (
              <View key={model.id}>
                <TouchableOpacity
                  style={sheetStyles.modelItem}
                  onPress={() => handleSelect(model.id!)}
                  activeOpacity={0.7}
                >
                  <View style={sheetStyles.modelInfo}>
                    <Text
                      style={[
                        sheetStyles.modelName,
                        model.id === selectedModelId &&
                          sheetStyles.modelNameSelected,
                      ]}
                      numberOfLines={1}
                    >
                      {model.name || model.id}
                    </Text>
                    {model.provider && (
                      <Text style={sheetStyles.modelProvider}>
                        {model.provider}
                      </Text>
                    )}
                  </View>
                  {model.id === selectedModelId && (
                    <Ionicons name="checkmark" size={22} color="#007AFF" />
                  )}
                </TouchableOpacity>
                {index < arr.length - 1 && (
                  <View style={sheetStyles.separator} />
                )}
              </View>
            ))}
          </ScrollView>
        )}

        {/* Search Bar - Floating with gradient behind */}
        <View style={sheetStyles.searchOverlay}>
          <LinearGradient
            colors={["#f5f5f5", "#f5f5f5", "#f5f5f5", "rgba(245, 245, 245, 0)"]}
            locations={[0, 0.5, 0.75, 1]}
            style={sheetStyles.searchGradient}
          />
          <View style={sheetStyles.searchContainer}>
            <GlassView style={sheetStyles.searchBar}>
              <Ionicons name="search" size={16} color="#8E8E93" />
              <TextInput
                style={sheetStyles.searchInput}
                placeholder="Search"
                placeholderTextColor="#8E8E93"
                value={searchQuery}
                onChangeText={setSearchQuery}
                returnKeyType="search"
                clearButtonMode="while-editing"
              />
            </GlassView>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const sheetStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  grabberContainer: {
    alignItems: "center",
    paddingTop: 6,
    paddingBottom: 8,
    zIndex: 2,
  },
  grabber: {
    width: 36,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "rgba(60, 60, 67, 0.3)",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    minHeight: 44,
    zIndex: 2,
  },
  closeButton: {
    width: 44,
    justifyContent: "center",
    alignItems: "flex-start",
  },
  closeButtonCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(118, 118, 128, 0.12)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerSpacer: {
    width: 44,
  },
  title: {
    flex: 1,
    fontSize: 17,
    fontWeight: "600",
    color: "#000",
    textAlign: "center",
  },
  searchOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
    height: 160,
  },
  searchGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 70,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    height: 40,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 17,
    color: "#000",
    padding: 0,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: "#8E8E93",
  },
  list: {
    flex: 1,
  },
  modelItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(60, 60, 67, 0.12)",
    marginLeft: 20,
  },
  modelInfo: {
    flex: 1,
    gap: 2,
  },
  modelName: {
    fontSize: 16,
    fontWeight: "400",
    color: "#000",
  },
  modelNameSelected: {
    color: "#007AFF",
  },
  modelProvider: {
    fontSize: 13,
    color: "#8E8E93",
  },
});

export default function ChatInput({
  messages,
  onMessagesUpdate,
  streamingContent,
  setStreamingContent,
}: ChatInputProps) {
  const insets = useSafeAreaInsets();
  const { getIdentityToken } = useIdentityToken();
  const [input, setInput] = useState("");
  const [lineCount, setLineCount] = useState(1);
  const [imageMode, setImageMode] = useState(false);
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [selectedModel, setSelectedModel] = useState("openai/gpt-4o");
  const messagesBeforeStreamRef = useRef<Message[]>([]);
  const accumulatedContentRef = useRef("");

  // Fetch available models
  const { models, isLoading: isLoadingModels } = useModels({
    getToken: getIdentityToken,
    baseUrl: "https://ai-portal-dev.zetachain.com",
  });

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
        model: selectedModel,
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
    } else if (event === "choose-model") {
      setShowModelPicker(true);
    }
  };

  // Get display name for selected model
  const selectedModelDisplay =
    models.find((m) => m.id === selectedModel)?.name ||
    selectedModel.split("/").pop() ||
    selectedModel;

  return (
    <>
      <View style={[styles.container, { paddingBottom: insets.bottom + 12 }]}>
        {attachedImage && (
          <View style={styles.attachedImageContainer}>
            <Image
              source={{ uri: attachedImage }}
              style={styles.attachedImage}
            />
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
                imageColor: "#3C3C43",
                state: imageMode ? "on" : "off",
              },
              {
                id: "choose-model",
                title: `Model: ${selectedModelDisplay}`,
                image: "cpu",
                imageColor: "#3C3C43",
              },
              {
                id: "attach-image",
                title: "Attach image",
                image: "paperclip",
                imageColor: "#3C3C43",
              },
            ]}
          >
            <GlassView
              style={[styles.plusButton, imageMode && styles.plusButtonActive]}
              isInteractive
            >
              <Ionicons
                name={imageMode ? "image" : "add"}
                size={24}
                color="#3C3C43"
              />
            </GlassView>
          </MenuView>

          <GlassView
            style={[
              styles.inputContainer,
              { borderRadius: lineCount > 1 ? 20 : 9999 },
            ]}
            isInteractive
          >
            <TextInput
              style={styles.input}
              value={input}
              onChangeText={(text) => {
                setInput(text);
                setLineCount((text.match(/\n/g) || []).length + 1);
              }}
              placeholder={
                imageMode ? "Describe the image..." : "Ask anything..."
              }
              placeholderTextColor="#8E8E93"
              multiline
              maxLength={2000}
              blurOnSubmit={true}
              onSubmitEditing={onSubmit}
            />
          </GlassView>

          <TouchableOpacity
            onPress={onSubmit}
            disabled={isLoading || !input.trim()}
          >
            <GlassView
              style={[
                styles.sendButton,
                (!input.trim() || isLoading) && styles.sendButtonDisabled,
              ]}
              isInteractive
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#3C3C43" />
              ) : (
                <Ionicons name="arrow-up" size={20} color="#3C3C43" />
              )}
            </GlassView>
          </TouchableOpacity>
        </View>
      </View>

      <ModelPickerSheet
        visible={showModelPicker}
        onClose={() => setShowModelPicker(false)}
        models={models}
        isLoading={isLoadingModels}
        selectedModelId={selectedModel}
        onSelectModel={setSelectedModel}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
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
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  plusButtonActive: {
    backgroundColor: "rgba(60, 60, 67, 0.1)",
  },
  inputContainer: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    justifyContent: "center",
  },
  input: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: "#000",
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});
