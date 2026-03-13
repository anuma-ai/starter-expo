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
import {
  useChatStorage,
  useModels,
  type StoredMessage,
} from "@anuma/sdk/expo";
import { Database } from "@nozbe/watermelondb";
import * as ImagePicker from "expo-image-picker";
import { GlassView } from "expo-glass-effect";
import { LinearGradient } from "expo-linear-gradient";

interface ChatInputProps {
  database: Database;
  conversationId: string | null;
  onConversationChange: (id: string) => void;
  onMessagesChange: (messages: StoredMessage[]) => void;
  streamingContent: string;
  setStreamingContent: (content: string) => void;
}

interface Model {
  id?: string;
  name?: string;
  provider?: string;
}

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
  database,
  conversationId,
  onConversationChange,
  onMessagesChange,
  streamingContent,
  setStreamingContent,
}: ChatInputProps) {
  const insets = useSafeAreaInsets();
  const { getIdentityToken } = useIdentityToken();
  const [input, setInput] = useState("");
  const [lineCount, setLineCount] = useState(1);
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [selectedModel, setSelectedModel] = useState("openai/gpt-4o");
  const accumulatedContentRef = useRef("");

  // Fetch available models
  const { models, isLoading: isLoadingModels } = useModels({
    getToken: getIdentityToken,
    baseUrl: "https://portal.anuma-dev.ai",
  });

  // Store latest callback in ref so useChatStorage callbacks always have fresh references
  const setStreamingContentRef = useRef(setStreamingContent);
  const onMessagesChangeRef = useRef(onMessagesChange);

  useEffect(() => {
    setStreamingContentRef.current = setStreamingContent;
    onMessagesChangeRef.current = onMessagesChange;
  }, [setStreamingContent, onMessagesChange]);

  // Store conversationId in ref for callbacks
  const conversationIdRef = useRef(conversationId);
  useEffect(() => {
    conversationIdRef.current = conversationId;
  }, [conversationId]);

  const {
    isLoading: isChatLoading,
    sendMessage,
    conversationId: currentConversationId,
    setConversationId,
    getMessages,
    updateConversationTitle,
  } = useChatStorage({
    database,
    conversationId: conversationId ?? undefined,
    getToken: getIdentityToken,
    baseUrl: "https://portal.anuma-dev.ai",
    onData: (chunk: string) => {
      accumulatedContentRef.current += chunk;
      setStreamingContentRef.current(accumulatedContentRef.current);
    },
    onFinish: async () => {
      accumulatedContentRef.current = "";
      setStreamingContentRef.current("");
      // Note: Messages are refreshed in onSubmit after sendMessage completes
    },
    onError: (error: Error) => {
      console.error("Chat error:", error);
      accumulatedContentRef.current = "";
      setStreamingContentRef.current("");
    },
  });

  // Store setConversationId in ref to avoid dependency issues
  const setConversationIdRef = useRef(setConversationId);
  useEffect(() => {
    setConversationIdRef.current = setConversationId;
  }, [setConversationId]);

  // Track if we're syncing from parent to avoid loops
  const isSyncingFromParent = useRef(false);

  // Sync conversationId from parent (only when parent initiates the change)
  useEffect(() => {
    if (conversationId !== currentConversationId) {
      isSyncingFromParent.current = true;
      setConversationIdRef.current(conversationId);
      // Reset flag after a tick
      setTimeout(() => {
        isSyncingFromParent.current = false;
      }, 0);
    }
  }, [conversationId, currentConversationId]);

  // Notify parent when conversation ID changes (only for new conversations created internally)
  useEffect(() => {
    if (
      currentConversationId &&
      currentConversationId !== conversationId &&
      !isSyncingFromParent.current
    ) {
      onConversationChange(currentConversationId);
    }
  }, [currentConversationId, conversationId, onConversationChange]);

  const isLoading = isChatLoading;

  const onSubmit = async () => {
    if (!input.trim() || isLoading) return;

    const prompt = input.trim();
    setInput("");
    setAttachedImage(null);

    accumulatedContentRef.current = "";
    setStreamingContent("");

    // Extract mime type from data URI (format: data:image/jpeg;base64,...)
    const mimeType = attachedImage?.match(/^data:([^;]+);/)?.[1] || "image/jpeg";

    // Store the attached file info for later merging (since DB strips data URIs)
    const optimisticFiles = attachedImage
      ? [{ id: "temp", name: "image", type: mimeType, size: 0, url: attachedImage }]
      : undefined;

    // Show user message immediately (optimistic update)
    const existingMessages = currentConversationId
      ? await getMessages(currentConversationId)
      : [];
    onMessagesChange([
      ...existingMessages,
      {
        uniqueId: "temp",
        messageId: 0,
        conversationId: "",
        role: "user",
        content: prompt,
        files: optimisticFiles,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as StoredMessage,
    ]);
    const userContent: Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }> = [
      { type: "text", text: prompt },
    ];
    if (attachedImage) {
      userContent.push({ type: "image_url", image_url: { url: attachedImage } });
    }
    const result = await sendMessage({
      messages: [{ role: "user", content: userContent }],
      model: selectedModel,
      includeHistory: true,
      serverTools: [],
    });

    if (result.error) {
      console.error("Chat error:", result.error);
      // Revert optimistic update on error
      if (currentConversationId) {
        const messages = await getMessages(currentConversationId);
        onMessagesChange(messages);
      }
    } else {
      // Messages are automatically stored
      // Use the conversation ID from the result in case it was newly created
      const convId = result.userMessage?.conversationId || currentConversationId;
      if (convId) {
        // Set conversation title to first message (truncated)
        const isNewConversation = !conversationId;
        if (isNewConversation) {
          const title = prompt.length > 50 ? prompt.slice(0, 50) + "..." : prompt;
          await updateConversationTitle(convId, title);
        }

        // Instead of reloading from DB (which strips data URIs),
        // merge stored messages with preserved file URLs from optimistic update
        const storedMessages = await getMessages(convId);

        // Merge: preserve file URLs for user messages that had attachments
        const mergedMessages = storedMessages.map((msg: StoredMessage) => {
          // If this is the user message we just sent and it had files
          if (msg.role === "user" && msg.content === prompt && optimisticFiles) {
            // Check if stored message has files without URLs (stripped data URIs)
            if (!msg.files || msg.files.every((f) => !f.url)) {
              return { ...msg, files: optimisticFiles };
            }
          }
          return msg;
        });

        onMessagesChange(mergedMessages);

        // Notify parent of new conversation if it changed
        if (convId !== conversationId) {
          onConversationChange(convId);
        }
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
    if (event === "attach-image") {
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
            <GlassView style={styles.plusButton} isInteractive>
              <Ionicons name="add" size={24} color="#3C3C43" />
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
              placeholder="Ask anything..."
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
