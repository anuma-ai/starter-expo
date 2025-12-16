import Constants from "expo-constants";
import { Stack } from "expo-router";
import { PrivyProvider, usePrivy } from "@privy-io/expo";
import { useState, useEffect, useCallback } from "react";
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
import ConversationList, { DRAWER_WIDTH } from "@/components/ConversationList";
import {
  Conversation,
  Message,
  loadConversations,
  saveConversation,
  deleteConversation,
  createNewConversation,
  generateTitle,
} from "@/utils/storage";

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
  const [currentConversation, setCurrentConversation] =
    useState<Conversation | null>(null);
  const [streamingContent, setStreamingContent] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Reanimated shared value for smooth gesture-driven animation
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

  // Load conversations on mount
  useEffect(() => {
    if (user) {
      loadConversations().then((loaded) => {
        // Filter out any empty conversations that might have been saved
        const nonEmpty = loaded.filter((c) => c.messages.length > 0);
        setConversations(nonEmpty);
        if (nonEmpty.length > 0) {
          setCurrentConversation(nonEmpty[0]);
        } else {
          // Create a new empty conversation but don't save it yet
          setCurrentConversation(createNewConversation());
        }
        setIsLoaded(true);
      });
    }
  }, [user]);

  const messages = currentConversation?.messages || [];

  const handleMessagesUpdate = useCallback(
    async (newMessages: Message[]) => {
      if (!currentConversation) return;

      // Don't save empty conversations
      if (newMessages.length === 0) return;

      const updatedConversation: Conversation = {
        ...currentConversation,
        messages: newMessages,
        updatedAt: Date.now(),
        title: generateTitle(newMessages),
      };

      setCurrentConversation(updatedConversation);
      await saveConversation(updatedConversation);

      setConversations((prev) => {
        const filtered = prev.filter((c) => c.id !== updatedConversation.id);
        return [updatedConversation, ...filtered];
      });
    },
    [currentConversation]
  );

  const handleSelectConversation = (conversation: Conversation) => {
    setCurrentConversation(conversation);
    setStreamingContent("");
    setDrawerOpen(false);
  };

  const handleNewConversation = () => {
    // Create a new conversation but don't save it until it has messages
    const newConv = createNewConversation();
    setCurrentConversation(newConv);
    setStreamingContent("");
    setDrawerOpen(false);
  };

  const handleDeleteConversation = async (id: string) => {
    await deleteConversation(id);
    setConversations((prev) => {
      const filtered = prev.filter((c) => c.id !== id);

      if (currentConversation?.id === id) {
        if (filtered.length > 0) {
          setCurrentConversation(filtered[0]);
        } else {
          // Create new empty conversation but don't save it
          setCurrentConversation(createNewConversation());
        }
      }

      return filtered;
    });
  };

  const displayMessages = streamingContent
    ? [...messages, { role: "assistant", content: streamingContent }]
    : messages;

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
            currentConversationId={currentConversation?.id || null}
            onSelectConversation={handleSelectConversation}
            onNewConversation={handleNewConversation}
          />

          {/* Main Content */}
          <View style={styles.mainContent}>
            <ChatMessages messages={displayMessages} />
            <ConversationButton onPress={() => setDrawerOpen(!drawerOpen)} />
            <MenuButton />
            <ChatInput
              messages={messages}
              onMessagesUpdate={handleMessagesUpdate}
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
        <AppContent />
      </PrivyProvider>
    </GestureHandlerRootView>
  );
}
