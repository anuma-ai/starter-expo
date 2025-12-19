import { useState, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { GlassView } from "expo-glass-effect";
import { MenuView } from "@react-native-menu/menu";

export interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
}

interface ConversationListProps {
  conversations: Conversation[];
  currentConversationId: string | null;
  onSelectConversation: (conversation: Conversation) => void;
  onNewConversation: () => void;
  onDeleteConversation: (conversation: Conversation) => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");
export const DRAWER_WIDTH = Math.min(300, SCREEN_WIDTH * 0.8);

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  // Less than 24 hours
  if (diff < 24 * 60 * 60 * 1000) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  // Less than 7 days
  if (diff < 7 * 24 * 60 * 60 * 1000) {
    return date.toLocaleDateString([], { weekday: "short" });
  }

  // Older
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function ConversationList({
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
}: ConversationListProps) {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const query = searchQuery.toLowerCase();
    return conversations.filter((c) => c.title.toLowerCase().includes(query));
  }, [conversations, searchQuery]);

  return (
    <View
      style={[
        styles.drawer,
        {
          width: DRAWER_WIDTH,
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
        },
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Conversations</Text>
        <TouchableOpacity
          onPress={onNewConversation}
          style={styles.newButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="create-outline" size={24} color="#3C3C43" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <GlassView style={styles.searchBar}>
          <Ionicons name="search" size={16} color="#8E8E93" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search"
            placeholderTextColor="#8E8E93"
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
        </GlassView>
      </View>

      {/* List */}
      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {filteredConversations.length === 0 ? (
          <View style={styles.emptyContainer}>
            {searchQuery ? (
              <Text style={styles.emptyText}>No results found</Text>
            ) : (
              <>
                <Text style={styles.emptyText}>No conversations yet</Text>
                <Text style={styles.emptySubtext}>
                  Start a new chat to begin
                </Text>
              </>
            )}
          </View>
        ) : (
          filteredConversations.map((conversation) => (
            <MenuView
              key={conversation.id}
              onPressAction={({ nativeEvent }) => {
                if (nativeEvent.event === "delete") {
                  onDeleteConversation(conversation);
                }
              }}
              actions={[
                {
                  id: "delete",
                  title: "Delete",
                  attributes: { destructive: true },
                  image: "trash",
                  imageColor: "red",
                },
              ]}
            >
              <TouchableOpacity
                style={[
                  styles.conversationItem,
                  conversation.id === currentConversationId &&
                    styles.conversationItemActive,
                ]}
                onPress={() => onSelectConversation(conversation)}
                activeOpacity={0.7}
              >
                <View style={styles.conversationContent}>
                  <Text
                    style={[
                      styles.conversationTitle,
                      conversation.id === currentConversationId &&
                        styles.conversationTitleActive,
                    ]}
                    numberOfLines={1}
                  >
                    {conversation.title}
                  </Text>
                  <Text style={styles.conversationDate}>
                    {formatDate(conversation.updatedAt)}
                  </Text>
                </View>
              </TouchableOpacity>
            </MenuView>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  drawer: {
    backgroundColor: "#f5f5f5",
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: "#e0e0e0",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#000",
  },
  newButton: {
    padding: 4,
  },
  searchContainer: {
    paddingHorizontal: 12,
    paddingBottom: 12,
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
  list: {
    flex: 1,
  },
  listContent: {
    padding: 12,
    gap: 4,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#666",
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#999",
  },
  conversationItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "transparent",
  },
  conversationItemActive: {
    backgroundColor: "rgba(60, 60, 67, 0.1)",
  },
  conversationContent: {
    flex: 1,
    gap: 2,
  },
  conversationTitle: {
    fontSize: 15,
    fontWeight: "500",
    color: "#000",
  },
  conversationTitleActive: {
    color: "#3C3C43",
    fontWeight: "600",
  },
  conversationDate: {
    fontSize: 12,
    color: "#999",
  },
});
