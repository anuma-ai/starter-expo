// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Path to the linked @reverbia/sdk package
const aiSdkPath = path.resolve(__dirname, "../ai-sdk");

// Watch the linked package
config.watchFolders = [aiSdkPath];

// Ensure all packages use the same React instance (prevent duplicate React)
const projectNodeModules = path.resolve(__dirname, "node_modules");

config.resolver.extraNodeModules = {
  "@reverbia/sdk": aiSdkPath,
  // Force all React imports to use this project's React
  react: path.resolve(projectNodeModules, "react"),
  "react-native": path.resolve(projectNodeModules, "react-native"),
};

// Block ai-sdk's node_modules react to prevent duplicate
config.resolver.blockList = [
  new RegExp(
    `${aiSdkPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/node_modules/react/.*`
  ),
  new RegExp(
    `${aiSdkPath.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    )}/node_modules/react-native/.*`
  ),
];

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

  // Handle @reverbia/sdk subpath exports
  if (moduleName === "@reverbia/sdk/expo") {
    return {
      filePath: path.resolve(aiSdkPath, "dist/expo/index.mjs"),
      type: "sourceFile",
    };
  }

  if (moduleName === "@reverbia/sdk/react/native") {
    return {
      filePath: path.resolve(aiSdkPath, "dist/react/native/native.mjs"),
      type: "sourceFile",
    };
  }

  if (moduleName === "@reverbia/sdk/react") {
    return {
      filePath: path.resolve(aiSdkPath, "dist/react/index.mjs"),
      type: "sourceFile",
    };
  }

  if (moduleName === "@reverbia/sdk") {
    return {
      filePath: path.resolve(aiSdkPath, "dist/index.mjs"),
      type: "sourceFile",
    };
  }

  return context.resolveRequest(context, moduleName, platform);
};

config.resolver.resolveRequest = resolveRequestWithPackageExports;

module.exports = config;
