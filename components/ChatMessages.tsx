import { useRef, useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";

const IMAGE_LOADING_PLACEHOLDER = "[[IMAGE_LOADING]]";

type MessageContent =
  | string
  | Array<
      | { type: "text"; text: string }
      | { type: "image_url"; image_url: { url: string } }
    >;

const isImageUrl = (content: string) => {
  const trimmed = content.trim();
  return (
    (trimmed.startsWith("http://") || trimmed.startsWith("https://")) &&
    (trimmed.includes("oaidalleapiprodscus") ||
      trimmed.match(/\.(png|jpg|jpeg|gif|webp)(\?|$)/i))
  );
};

const getTextContent = (content: MessageContent): string => {
  if (typeof content === "string") return content;
  const textPart = content.find((part) => part.type === "text");
  return textPart && "text" in textPart ? textPart.text : "";
};

const getImageUrls = (content: MessageContent): string[] => {
  if (typeof content === "string") return [];
  return content
    .filter((part) => part.type === "image_url")
    .map(
      (part) =>
        (part as { type: "image_url"; image_url: { url: string } }).image_url
          .url
    );
};

interface Message {
  role: string;
  content: MessageContent;
}

interface ChatMessagesProps {
  messages: Message[];
}

function ImageSkeleton() {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return <Animated.View style={[styles.imageSkeleton, { opacity }]} />;
}

function LoadableImage({ uri }: { uri: string }) {
  const [loaded, setLoaded] = useState(false);

  return (
    <View>
      {!loaded && <ImageSkeleton />}
      <Image
        source={{ uri }}
        style={[styles.generatedImage, !loaded && styles.hiddenImage]}
        resizeMode="cover"
        onLoad={() => setLoaded(true)}
      />
    </View>
  );
}

export default function ChatMessages({ messages }: ChatMessagesProps) {
  const scrollViewRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    // Scroll to bottom when messages change
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  if (messages.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Start a conversation</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={[
          styles.contentContainer,
          { paddingTop: insets.top + 60 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {messages.map((message, index) => {
          const textContent = getTextContent(message.content);
          const attachedImages = getImageUrls(message.content);
          const isGeneratedImage =
            message.role === "assistant" &&
            typeof message.content === "string" &&
            isImageUrl(message.content);
          const isLoading =
            message.role === "assistant" &&
            message.content === IMAGE_LOADING_PLACEHOLDER;
          const isUser = message.role === "user";
          const hasAttachedImage = attachedImages.length > 0;

          return (
            <View
              key={index}
              style={[
                styles.messageContainer,
                isUser
                  ? styles.userMessageContainer
                  : styles.assistantMessageContainer,
              ]}
            >
              {/* User attached image - shown outside bubble */}
              {isUser && hasAttachedImage && (
                <Image
                  source={{ uri: attachedImages[0] }}
                  style={styles.userAttachedImage}
                  resizeMode="cover"
                />
              )}

              {/* Message bubble */}
              <View
                style={[
                  styles.messageBubble,
                  isUser ? styles.userBubble : styles.assistantBubble,
                  (isGeneratedImage || isLoading) && styles.imageBubble,
                ]}
              >
                {isLoading ? (
                  <ImageSkeleton />
                ) : isGeneratedImage ? (
                  <LoadableImage uri={message.content as string} />
                ) : (
                  <Text
                    style={[
                      styles.messageText,
                      isUser ? styles.userText : styles.assistantText,
                    ]}
                  >
                    {textContent}
                  </Text>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>
      <LinearGradient
        colors={["#ffffff", "rgba(255, 255, 255, 0)"]}
        style={[styles.topGradient, { height: insets.top + 80 }]}
        pointerEvents="none"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  topGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 8,
    gap: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#999",
  },
  messageContainer: {
    gap: 6,
  },
  userMessageContainer: {
    alignItems: "flex-end",
  },
  assistantMessageContainer: {
    alignItems: "flex-start",
  },
  messageBubble: {
    maxWidth: "80%",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  userBubble: {
    backgroundColor: "#f0f0f0",
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: "#f0f0f0",
    borderBottomLeftRadius: 4,
  },
  userAttachedImage: {
    width: 200,
    height: 200,
    borderRadius: 16,
  },
  imageBubble: {
    padding: 0,
    overflow: "hidden",
    backgroundColor: "transparent",
  },
  generatedImage: {
    width: 250,
    height: 250,
    borderRadius: 20,
  },
  imageSkeleton: {
    width: 250,
    height: 250,
    borderRadius: 20,
    backgroundColor: "#e0e0e0",
  },
  hiddenImage: {
    position: "absolute",
    opacity: 0,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userText: {
    color: "#000",
  },
  assistantText: {
    color: "#000",
  },
});
