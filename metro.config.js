// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const sdkRoot = path.resolve(projectRoot, "../sdk");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(projectRoot);

// Watch the linked SDK directory so Metro picks up changes
config.watchFolders = [sdkRoot];

// Enable symlinks for pnpm link: resolution
config.resolver.unstable_enableSymlinks = true;

// Enable package exports so @anuma/sdk/polyfills, /expo, etc. resolve
config.resolver.unstable_enablePackageExports = true;

// Force React and React Native to resolve from this project's node_modules
// to prevent duplicate instances from the linked SDK
config.resolver.extraNodeModules = {
  react: path.resolve(projectRoot, "node_modules/react"),
  "react-native": path.resolve(projectRoot, "node_modules/react-native"),
  "react-dom": path.resolve(projectRoot, "node_modules/react-dom"),
};

const resolveRequestWithPackageExports = (context, moduleName, platform) => {
  // Force all React imports to use project's React (prevent duplicate React)
  if (moduleName === "react" || moduleName.startsWith("react/")) {
    return context.resolveRequest(
      { ...context, originModulePath: __filename },
      moduleName,
      platform
    );
  }

  if (moduleName === "react-native" || moduleName.startsWith("react-native/")) {
    return context.resolveRequest(
      { ...context, originModulePath: __filename },
      moduleName,
      platform
    );
  }

  // Package exports in `jose` are incorrect, so we need to force the browser version
  if (moduleName === "jose") {
    const ctx = {
      ...context,
      unstable_conditionNames: ["browser"],
    };
    return ctx.resolveRequest(ctx, moduleName, platform);
  }

  return context.resolveRequest(context, moduleName, platform);
};

config.resolver.resolveRequest = resolveRequestWithPackageExports;

module.exports = config;
