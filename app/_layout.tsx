import Constants from "expo-constants";
import { Stack } from "expo-router";
import { PrivyProvider, usePrivy } from "@privy-io/expo";
import { useState, useEffect, useCallback, useRef } from "react";
import { View, StyleSheet, TouchableOpacity, Dimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { MenuView } from "@react-native-menu/menu";
import { GlassView } from "expo-glass-effect";
import {
  GestureDetector,
  Gesture,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  interpolate,
  Easing,
} from "react-native-reanimated";
import ChatInput from "@/components/ChatInput";
import ChatMessages from "@/components/ChatMessages";
import ConversationList, {
  DRAWER_WIDTH,
  type Conversation,
} from "@/components/ConversationList";
import { type StoredMessage, type StoredConversation } from "@anuma/sdk/expo";
import { useChatStorageSetup } from "@/hooks/useChatStorageSetup";
import ErrorBoundary from "@/components/ErrorBoundary";

// UI Message type for ChatMessages (matches ChatMessages MessageContent type)
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

// #region toUIMessage
// Convert StoredMessage to UI Message format
const toUIMessage = (msg: StoredMessage): Message => {
  // Check if message has files with URLs
  const imageFiles = msg.files?.filter((f) => f.url) || [];

  if (imageFiles.length === 0) {
    return { role: msg.role, content: msg.content };
  }

  // Build content array with text and images
  const contentArray: MessageContent = [
    { type: "text", text: msg.content },
    ...imageFiles.map((f) => ({
      type: "image_url" as const,
      image_url: { url: f.url! },
    })),
  ];

  return { role: msg.role, content: contentArray };
};
// #endregion toUIMessage

// #region toUIConversation
// Convert StoredConversation to UI Conversation format
const toUIConversation = (conv: StoredConversation): Conversation => ({
  id: conv.conversationId,
  title: conv.title || "New Chat",
  createdAt: conv.createdAt.getTime(),
  updatedAt: conv.updatedAt.getTime(),
});
// #endregion toUIConversation

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const EDGE_WIDTH = 20; // Width of the edge area that triggers the gesture
const VELOCITY_THRESHOLD = 500; // Velocity threshold to snap open/closed

function ConversationButton({ onPress }: { onPress: () => void }) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.floatingButtonContainer,
        styles.leftButton,
        { top: insets.top + 8 },
      ]}
    >
      <TouchableOpacity onPress={onPress}>
        <GlassView style={styles.floatingButton} isInteractive>
          <Ionicons name="chatbubbles-outline" size={20} color="#3C3C43" />
        </GlassView>
      </TouchableOpacity>
    </View>
  );
}

function MenuButton() {
  const { logout } = usePrivy();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.floatingButtonContainer,
        styles.rightButton,
        { top: insets.top + 8 },
      ]}
    >
      <MenuView
        onPressAction={({ nativeEvent }) => {
          if (nativeEvent.event === "logout") {
            logout();
          }
        }}
        actions={[
          {
            id: "logout",
            title: "Logout",
            attributes: { destructive: true },
            imageColor: "red",
            image: "rectangle.portrait.and.arrow.right",
          },
        ]}
      >
        <GlassView style={styles.floatingButton} isInteractive>
          <Ionicons name="ellipsis-horizontal" size={20} color="#3C3C43" />
        </GlassView>
      </MenuView>
    </View>
  );
}

function AppContent() {
  const { user } = usePrivy();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<
    string | null
  >(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [streamingContent, setStreamingContent] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const { getConversations, getMessages, deleteConversation } =
    useChatStorageSetup();

  // Store functions in refs to avoid infinite loops from changing references
  const getConversationsRef = useRef(getConversations);
  const getMessagesRef = useRef(getMessages);
  const deleteConversationRef = useRef(deleteConversation);
  useEffect(() => {
    getConversationsRef.current = getConversations;
    getMessagesRef.current = getMessages;
    deleteConversationRef.current = deleteConversation;
  }, [getConversations, getMessages, deleteConversation]);

  // Load conversations from database
  const loadConversations = useCallback(async () => {
    try {
      const storedConversations = await getConversationsRef.current();
      setConversations(storedConversations.map(toUIConversation));
    } catch (error) {
      console.error("Failed to load conversations:", error);
    }
  }, []);

  // Load conversations on mount and when user changes
  useEffect(() => {
    if (user) {
      loadConversations();
    }
  }, [user, loadConversations]);

  // Gesture-driven drawer: the drawer slides in from the left using a shared
  // Reanimated value. A pan gesture on the main content area controls the
  // translation, snapping open/closed based on velocity and position thresholds.
  const translateX = useSharedValue(-DRAWER_WIDTH);
  const startX = useSharedValue(0);
  const gestureStartedFromEdge = useSharedValue(false);

  // Update animation when drawer state changes (from button press)
  useEffect(() => {
    translateX.value = withTiming(drawerOpen ? 0 : -DRAWER_WIDTH, {
      duration: 300,
      easing: Easing.out(Easing.cubic),
    });
  }, [drawerOpen, translateX]);

  // Callbacks for gesture handlers
  const openDrawer = useCallback(() => {
    setDrawerOpen(true);
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
  }, []);

  // Pan gesture for drawer
  const panGesture = Gesture.Pan()
    .onStart((event) => {
      startX.value = translateX.value;
      // Check if gesture started from left edge (when drawer is closed)
      // or anywhere (when drawer is open)
      const isFromEdge =
        event.x < EDGE_WIDTH && translateX.value <= -DRAWER_WIDTH + 10;
      const isDrawerOpen = translateX.value > -DRAWER_WIDTH / 2;
      gestureStartedFromEdge.value = isFromEdge || isDrawerOpen;
    })
    .onUpdate((event) => {
      if (!gestureStartedFromEdge.value) return;

      const newX = startX.value + event.translationX;
      // Clamp between -DRAWER_WIDTH and 0
      translateX.value = Math.max(-DRAWER_WIDTH, Math.min(0, newX));
    })
    .onEnd((event) => {
      if (!gestureStartedFromEdge.value) return;

      // Determine if we should open or close based on position and velocity
      const shouldOpen =
        event.velocityX > VELOCITY_THRESHOLD ||
        (event.velocityX > -VELOCITY_THRESHOLD &&
          translateX.value > -DRAWER_WIDTH / 2);

      translateX.value = withTiming(shouldOpen ? 0 : -DRAWER_WIDTH, {
        duration: 250,
        easing: Easing.out(Easing.cubic),
      });

      if (shouldOpen) {
        runOnJS(openDrawer)();
      } else {
        runOnJS(closeDrawer)();
      }
    });

  // Animated style for the sliding container
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  // Animated style for the overlay (fades in/out with drawer)
  const overlayAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(translateX.value, [-DRAWER_WIDTH, 0], [0, 0.3]);
    return {
      opacity,
    };
  });

  // Mark as loaded once user is available
  useEffect(() => {
    if (user) {
      setIsLoaded(true);
    }
  }, [user]);

  // Handle messages change from ChatInput
  const handleMessagesChange = useCallback(
    (storedMessages: StoredMessage[]) => {
      setMessages(storedMessages.map(toUIMessage));
    },
    []
  );

  // Handle conversation ID change from ChatInput
  const handleConversationChange = useCallback((id: string) => {
    setCurrentConversationId(id);
    // Refresh conversations list to show newly created conversation
    loadConversations();
  }, [loadConversations]);

  // #region switchConversation
  const handleSelectConversation = async (conversation: Conversation) => {
    setCurrentConversationId(conversation.id);
    setStreamingContent("");
    setDrawerOpen(false);
    // Load messages for selected conversation
    try {
      const storedMessages = await getMessagesRef.current(conversation.id);
      setMessages(storedMessages.map(toUIMessage));
    } catch (error) {
      console.error("Failed to load messages:", error);
      setMessages([]);
    }
  };
  // #endregion switchConversation

  // #region newConversation
  const handleNewConversation = () => {
    setCurrentConversationId(null);
    setMessages([]);
    setStreamingContent("");
    setDrawerOpen(false);
  };
  // #endregion newConversation

  // #region deleteConversation
  const handleDeleteConversation = async (conversation: Conversation) => {
    try {
      await deleteConversationRef.current(conversation.id);
      // If we're deleting the current conversation, clear it
      if (currentConversationId === conversation.id) {
        setCurrentConversationId(null);
        setMessages([]);
        setStreamingContent("");
      }
      // Refresh the conversation list
      loadConversations();
    } catch (error) {
      console.error("Failed to delete conversation:", error);
    }
  };
  // #endregion deleteConversation

  // #region streamingDisplay
  const displayMessages = streamingContent
    ? [...messages, { role: "assistant", content: streamingContent }]
    : messages;
  // #endregion streamingDisplay

  if (!user || !isLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: "#fff" }}>
        <Stack>
          <Stack.Screen name="index" options={{ headerShown: false }} />
        </Stack>
      </View>
    );
  }

  return (
    <GestureDetector gesture={panGesture}>
      <View style={styles.rootContainer}>
        <Animated.View style={[styles.slidingContainer, animatedStyle]}>
          {/* Drawer */}
          <ConversationList
            conversations={conversations}
            currentConversationId={currentConversationId}
            onSelectConversation={handleSelectConversation}
            onNewConversation={handleNewConversation}
            onDeleteConversation={handleDeleteConversation}
          />

          {/* Main Content */}
          <View style={styles.mainContent}>
            <ChatMessages messages={displayMessages} />
            <ConversationButton onPress={() => setDrawerOpen(!drawerOpen)} />
            <MenuButton />
            <ChatInput
              conversationId={currentConversationId}
              onConversationChange={handleConversationChange}
              onMessagesChange={handleMessagesChange}
              streamingContent={streamingContent}
              setStreamingContent={setStreamingContent}
            />

            {/* Overlay to close drawer when tapping on main content */}
            <Animated.View
              style={[styles.overlay, overlayAnimatedStyle]}
              pointerEvents={drawerOpen ? "auto" : "none"}
            >
              <TouchableOpacity
                style={StyleSheet.absoluteFill}
                activeOpacity={1}
                onPress={() => setDrawerOpen(false)}
              />
            </Animated.View>
          </View>
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    overflow: "hidden",
  },
  slidingContainer: {
    flex: 1,
    flexDirection: "row",
    width: SCREEN_WIDTH + DRAWER_WIDTH,
  },
  mainContent: {
    width: SCREEN_WIDTH,
    backgroundColor: "#fff",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000",
    zIndex: 50,
  },
  floatingButtonContainer: {
    position: "absolute",
    zIndex: 100,
  },
  leftButton: {
    left: 16,
  },
  rightButton: {
    right: 16,
  },
  floatingButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
});

// #region authProvider
export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PrivyProvider
        appId={Constants.expoConfig?.extra?.privyAppId}
        clientId={Constants.expoConfig?.extra?.privyClientId}
        config={{
          embedded: {
            ethereum: {
              createOnLogin: "users-without-wallets",
            },
            solana: {
              createOnLogin: "off",
            },
          },
        }}
      >
        <ErrorBoundary>
          <AppContent />
        </ErrorBoundary>
      </PrivyProvider>
    </GestureHandlerRootView>
  );
}
// #endregion authProvider
