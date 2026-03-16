#!/bin/bash
set -e

DEVICE_NAME="${E2E_DEVICE:-iPhone 16e}"
BUNDLE_ID="dev.privy.example"

cleanup() {
  echo "==> Cleaning up..."
  kill $METRO_PID 2>/dev/null || true
  # Wait briefly for Metro to release the port
  sleep 1
  # Kill anything still on port 8081
  lsof -ti:8081 | xargs kill -9 2>/dev/null || true
  xcrun simctl shutdown "$DEVICE_NAME" 2>/dev/null || true
}
trap cleanup EXIT

echo "==> Killing any existing Metro on port 8081..."
lsof -ti:8081 | xargs kill -9 2>/dev/null || true

echo "==> Booting simulator: $DEVICE_NAME"
xcrun simctl boot "$DEVICE_NAME" 2>/dev/null || true

echo "==> Waiting for simulator to be ready..."
xcrun simctl bootstatus "$DEVICE_NAME" -b

echo "==> Building and installing app..."
npx expo run:ios --device "$DEVICE_NAME" --no-bundler &
BUILD_PID=$!

# Start Metro bundler in the background
npx expo start --dev-client --port 8081 &
METRO_PID=$!

# Wait for the build to finish
wait $BUILD_PID

echo "==> Waiting for app to be installed..."
sleep 5

echo "==> Running Maestro tests..."
maestro test .maestro/
