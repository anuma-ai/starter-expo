import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useLoginWithOAuth, useLoginWithEmail } from "@privy-io/expo";

export default function LoginScreen() {
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");

  const oauth = useLoginWithOAuth({
    onError: (err) => setError(err.message || "Login failed"),
  });

  const emailLogin = useLoginWithEmail({
    onError: (err) => setError(err.message || "Login failed"),
  });

  const isAwaitingOtp = emailLogin.state.status === "awaiting-code-input";
  const isLoading =
    oauth.state.status === "loading" ||
    emailLogin.state.status === "sending-code" ||
    emailLogin.state.status === "submitting-code";

  const handleSendCode = () => {
    if (!email.trim()) return;
    setError("");
    emailLogin.sendCode({ email: email.trim() });
  };

  const handleSubmitCode = () => {
    if (!otp.trim()) return;
    setError("");
    emailLogin.loginWithCode({ code: otp.trim() });
  };

  return (
    <View style={styles.container}>
      <View style={styles.form}>
        {!isAwaitingOtp ? (
          <>
            <TextInput
              testID="email-input"
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#8E8E93"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              testID="send-code-button"
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handleSendCode}
              disabled={isLoading || !email.trim()}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.buttonText}>Continue with email</Text>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TextInput
              testID="otp-input"
              style={styles.input}
              placeholder="Enter code"
              placeholderTextColor="#8E8E93"
              value={otp}
              onChangeText={setOtp}
              keyboardType="number-pad"
            />
            <TouchableOpacity
              testID="submit-code-button"
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handleSubmitCode}
              disabled={isLoading || !otp.trim()}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.buttonText}>Verify</Text>
              )}
            </TouchableOpacity>
          </>
        )}

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        <TouchableOpacity
          testID="sign-in-button"
          style={[styles.button, styles.googleButton]}
          onPress={() => oauth.login({ provider: "google" })}
          disabled={isLoading}
        >
          <Text style={styles.googleButtonText}>Sign in with Google</Text>
        </TouchableOpacity>
      </View>

      {error && (
        <Text testID="login-error" style={styles.error}>
          {error}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 24,
  },
  form: {
    width: "100%",
    maxWidth: 320,
    gap: 12,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: "#000",
    backgroundColor: "#f9f9f9",
  },
  button: {
    height: 48,
    borderRadius: 12,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  googleButton: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  googleButtonText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "600",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: 4,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#e0e0e0",
  },
  dividerText: {
    color: "#8E8E93",
    fontSize: 14,
  },
  error: {
    color: "red",
    marginTop: 16,
    textAlign: "center",
  },
});
