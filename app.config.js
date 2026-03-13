const config = require("./app.json");

config.expo.ios.appleTeamId =
  process.env.EXPO_PUBLIC_APPLE_TEAM_ID || "<your-apple-team-id>";

config.expo.extra = {
  ...config.expo.extra,
  privyAppId:
    process.env.EXPO_PUBLIC_PRIVY_APP_ID || "<your-privy-app-id>",
  privyClientId:
    process.env.EXPO_PUBLIC_PRIVY_CLIENT_ID || "<your-privy-client-id>",
};

if (process.env.EXPO_PUBLIC_EAS_PROJECT_ID) {
  config.expo.extra.eas = {
    projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID,
  };
}

if (process.env.EXPO_PUBLIC_EXPO_OWNER) {
  config.expo.owner = process.env.EXPO_PUBLIC_EXPO_OWNER;
}

module.exports = config;
