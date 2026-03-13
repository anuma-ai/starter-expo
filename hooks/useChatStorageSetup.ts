import { useRef, useEffect } from "react";
import { useIdentityToken } from "@privy-io/expo";
import { useChatStorage, useModels } from "@anuma/sdk/expo";
import { database } from "@/utils/database";
import { API_BASE_URL } from "@/constants/api";

interface UseChatStorageSetupOptions {
  conversationId?: string;
  onStreamingContent?: (content: string) => void;
  onError?: (error: Error) => void;
}

export function useChatStorageSetup(options: UseChatStorageSetupOptions = {}) {
  const { conversationId, onStreamingContent, onError } = options;
  const { getIdentityToken } = useIdentityToken();
  const accumulatedContentRef = useRef("");

  const onStreamingContentRef = useRef(onStreamingContent);
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onStreamingContentRef.current = onStreamingContent;
    onErrorRef.current = onError;
  }, [onStreamingContent, onError]);

  const chatStorage = useChatStorage({
    database,
    conversationId,
    getToken: getIdentityToken,
    baseUrl: API_BASE_URL,
    onData: (chunk: string) => {
      accumulatedContentRef.current += chunk;
      onStreamingContentRef.current?.(accumulatedContentRef.current);
    },
    onFinish: async () => {
      accumulatedContentRef.current = "";
      onStreamingContentRef.current?.("");
    },
    onError: (error: Error) => {
      console.error("Chat error:", error);
      accumulatedContentRef.current = "";
      onStreamingContentRef.current?.("");
      onErrorRef.current?.(error);
    },
  });

  const { models, isLoading: isLoadingModels } = useModels({
    getToken: getIdentityToken,
    baseUrl: API_BASE_URL,
  });

  return {
    ...chatStorage,
    models,
    isLoadingModels,
    accumulatedContentRef,
  };
}
