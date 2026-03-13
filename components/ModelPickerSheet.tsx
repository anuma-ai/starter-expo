import { useState, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Platform,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { GlassView } from "expo-glass-effect";
import { LinearGradient } from "expo-linear-gradient";

export interface Model {
  id?: string;
  name?: string;
  provider?: string;
}

interface ModelPickerSheetProps {
  visible: boolean;
  onClose: () => void;
  models: Model[];
  isLoading: boolean;
  selectedModelId: string;
  onSelectModel: (modelId: string) => void;
}

export default function ModelPickerSheet({
  visible,
  onClose,
  models,
  isLoading,
  selectedModelId,
  onSelectModel,
}: ModelPickerSheetProps) {
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
      <View style={styles.container}>
        {/* Grabber */}
        <View style={styles.grabberContainer}>
          <View style={styles.grabber} />
        </View>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <View style={styles.closeButtonCircle}>
              <Ionicons name="close" size={16} color="#3C3C43" />
            </View>
          </TouchableOpacity>
          <Text style={styles.title}>Models</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Content */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#8E8E93" />
            <Text style={styles.loadingText}>Loading models...</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.list}
            contentContainerStyle={{
              paddingTop: 64,
              paddingBottom: insets.bottom + 20,
            }}
            keyboardShouldPersistTaps="handled"
          >
            {filteredModels.map((model, index, arr) => (
              <View key={model.id}>
                <TouchableOpacity
                  style={styles.modelItem}
                  onPress={() => handleSelect(model.id!)}
                  activeOpacity={0.7}
                >
                  <View style={styles.modelInfo}>
                    <Text
                      style={[
                        styles.modelName,
                        model.id === selectedModelId &&
                          styles.modelNameSelected,
                      ]}
                      numberOfLines={1}
                    >
                      {model.name || model.id}
                    </Text>
                    {model.provider && (
                      <Text style={styles.modelProvider}>
                        {model.provider}
                      </Text>
                    )}
                  </View>
                  {model.id === selectedModelId && (
                    <Ionicons name="checkmark" size={22} color="#007AFF" />
                  )}
                </TouchableOpacity>
                {index < arr.length - 1 && (
                  <View style={styles.separator} />
                )}
              </View>
            ))}
          </ScrollView>
        )}

        {/* Search Bar - Floating with gradient behind */}
        <View style={styles.searchOverlay}>
          <LinearGradient
            colors={["#f5f5f5", "#f5f5f5", "#f5f5f5", "rgba(245, 245, 245, 0)"]}
            locations={[0, 0.5, 0.75, 1]}
            style={styles.searchGradient}
          />
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
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
