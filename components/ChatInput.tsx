import { useState, useRef, useEffect } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { MenuView } from "@react-native-menu/menu";
import { type StoredMessage } from "@anuma/sdk/expo";
import { useChatStorageSetup } from "@/hooks/useChatStorageSetup";
import * as ImagePicker from "expo-image-picker";
import { GlassView } from "expo-glass-effect";
import ModelPickerSheet from "@/components/ModelPickerSheet";

interface ChatInputProps {
  conversationId: string | null;
  onConversationChange: (id: string) => void;
  onMessagesChange: (messages: StoredMessage[]) => void;
  streamingContent: string;
  setStreamingContent: (content: string) => void;
}

export default function ChatInput({
  conversationId,
  onConversationChange,
  onMessagesChange,
  streamingContent,
  setStreamingContent,
}: ChatInputProps) {
  const insets = useSafeAreaInsets();
  const [input, setInput] = useState("");
  const [lineCount, setLineCount] = useState(1);
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [selectedModel, setSelectedModel] = useState("openai/gpt-4o");

  const {
    isLoading: isChatLoading,
    sendMessage,
    conversationId: currentConversationId,
    setConversationId,
    getMessages,
    updateConversationTitle,
    models,
    isLoadingModels,
  } = useChatStorageSetup({
    conversationId: conversationId ?? undefined,
    onStreamingContent: setStreamingContent,
  });

  // Bidirectional conversation ID sync between parent (_layout) and the SDK hook:
  // - Parent changes ID (e.g. user picks a conversation) → sync down to hook
  // - Hook creates a new conversation internally → notify parent
  // The isSyncingFromParent flag prevents the "notify parent" effect from firing
  // when the change originated from the parent, avoiding an infinite loop.
  const setConversationIdRef = useRef(setConversationId);
  useEffect(() => {
    setConversationIdRef.current = setConversationId;
  }, [setConversationId]);

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

    setStreamingContent("");

    // Extract mime type from data URI (format: data:image/jpeg;base64,...)
    const mimeType = attachedImage?.match(/^data:([^;]+);/)?.[1] || "image/jpeg";

    // Store the attached file info for later merging (since DB strips data URIs)
    const optimisticFiles = attachedImage
      ? [{ id: "temp", name: "image", type: mimeType, size: 0, url: attachedImage }]
      : undefined;

    // Optimistic update: show the user's message in the UI immediately rather
    // than waiting for the API round-trip. On error we revert to the DB state.
    // After success we merge stored messages with the optimistic file URLs,
    // because the DB strips data URIs from attachments.
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
