import { useState } from "react";
import { View, Button, Text, StyleSheet } from "react-native";
import { useLoginWithOAuth } from "@privy-io/expo";

export default function LoginScreen() {
  const [error, setError] = useState("");
  const oauth = useLoginWithOAuth({
    onError: (err) => {
      console.log(err);
      setError(JSON.stringify(err.message));
    },
  });

  return (
    <View style={styles.container}>
      <Button
        title="Sign in"
        disabled={oauth.state.status === "loading"}
        onPress={() => oauth.login({ provider: "google" })}
      />
      {error && <Text style={styles.error}>Error: {error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  error: {
    color: "red",
    marginTop: 10,
  },
});
