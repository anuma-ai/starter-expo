import { SafeAreaView, View } from "react-native";
import LoginScreen from "@/components/LoginScreen";
import { usePrivy } from "@privy-io/expo";

export default function Index() {
  const { user } = usePrivy();

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <View style={{ flex: 1, backgroundColor: "#fff" }} />
    </SafeAreaView>
  );
}
