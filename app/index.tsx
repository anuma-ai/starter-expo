import { View } from "react-native";
import LoginScreen from "@/components/LoginScreen";
import { usePrivy } from "@privy-io/expo";

export default function Index() {
  const { user } = usePrivy();

  if (!user) {
    return <LoginScreen />;
  }

  // Chat UI is rendered by _layout.tsx when authenticated
  return <View style={{ flex: 1, backgroundColor: "#fff" }} />;
}
