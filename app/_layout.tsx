import Constants from "expo-constants";
import { Stack } from "expo-router";
import { PrivyProvider, usePrivy } from "@privy-io/expo";
import { useState } from "react";
import { View, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { MenuView } from "@react-native-menu/menu";
import ChatInput from "@/components/ChatInput";
import ChatMessages from "@/components/ChatMessages";

interface Message {
  role: string;
  content: string;
}

function MenuButton() {
  const { logout } = usePrivy();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.floatingButtonContainer, { top: insets.top + 8 }]}>
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
        <View style={styles.floatingButton}>
          <Ionicons name="ellipsis-horizontal" size={20} color="#000" />
        </View>
      </MenuView>
    </View>
  );
}

function AppContent() {
  const { user } = usePrivy();
  const [messages, setMessages] = useState<Message[]>([]);
  const [streamingContent, setStreamingContent] = useState("");

  // Combine messages with streaming content for display
  const displayMessages = streamingContent
    ? [...messages, { role: "assistant", content: streamingContent }]
    : messages;

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      {user ? (
        <>
          <ChatMessages messages={displayMessages} />
          <MenuButton />
          <ChatInput
            messages={messages}
            onMessagesUpdate={setMessages}
            streamingContent={streamingContent}
            setStreamingContent={setStreamingContent}
          />
        </>
      ) : (
        <Stack>
          <Stack.Screen name="index" options={{ headerShown: false }} />
        </Stack>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  floatingButtonContainer: {
    position: "absolute",
    right: 16,
    zIndex: 100,
  },
  floatingButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(240, 240, 240, 0.95)",
  },
});

export default function RootLayout() {
  return (
    <PrivyProvider
      appId={Constants.expoConfig?.extra?.privyAppId}
      clientId={Constants.expoConfig?.extra?.privyClientId}
      config={{
        embeddedWallets: {
          ethereum: {
            createOnLogin: "off",
          },
          solana: {
            createOnLogin: "off",
          },
        },
      }}
    >
      <AppContent />
    </PrivyProvider>
  );
}
