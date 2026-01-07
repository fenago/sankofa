"use client";

import { useState, useCallback, useRef, useEffect } from "react";

export interface VeoVideoState {
  status: "idle" | "starting" | "generating" | "complete" | "error";
  operationName: string | null;
  videoUrl: string | null;
  elapsedTime: number;
  error: string | null;
}

const POLL_INTERVAL = 5000; // Poll every 5 seconds
const MAX_TIMEOUT = 600000; // 10 minute max timeout

export function useVeoVideo() {
  const [state, setState] = useState<VeoVideoState>({
    status: "idle",
    operationName: null,
    videoUrl: null,
    elapsedTime: 0,
    error: null,
  });

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const elapsedIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    if (elapsedIntervalRef.current) {
      clearInterval(elapsedIntervalRef.current);
      elapsedIntervalRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  // Start video generation
  const generateVideo = useCallback(async (prompt: string) => {
    cleanup();

    setState({
      status: "starting",
      operationName: null,
      videoUrl: null,
      elapsedTime: 0,
      error: null,
    });

    startTimeRef.current = Date.now();
    abortControllerRef.current = new AbortController();

    // Start elapsed time counter
    elapsedIntervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setState((prev) => ({ ...prev, elapsedTime: elapsed }));

      // Check for timeout
      if (Date.now() - startTimeRef.current > MAX_TIMEOUT) {
        cleanup();
        setState((prev) => ({
          ...prev,
          status: "error",
          error: "Video generation timed out after 10 minutes",
        }));
      }
    }, 1000);

    try {
      // Start the Veo job
      const startRes = await fetch("/api/veo/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
        signal: abortControllerRef.current.signal,
      });

      const startData = await startRes.json();

      if (!startRes.ok) {
        throw new Error(startData.error || "Failed to start video generation");
      }

      const { operationName } = startData;

      setState((prev) => ({
        ...prev,
        status: "generating",
        operationName,
      }));

      // Start polling
      const poll = async () => {
        if (!abortControllerRef.current) return;

        try {
          const pollRes = await fetch("/api/veo/poll", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ operationName }),
            signal: abortControllerRef.current.signal,
          });

          const pollData = await pollRes.json();

          if (!pollRes.ok) {
            throw new Error(pollData.error || "Failed to poll video status");
          }

          if (pollData.done) {
            cleanup();

            if (pollData.videoUri) {
              setState((prev) => ({
                ...prev,
                status: "complete",
                videoUrl: pollData.videoUri,
              }));
            } else {
              setState((prev) => ({
                ...prev,
                status: "error",
                error: "Video generation completed but no video URL returned",
              }));
            }
          }
        } catch (error) {
          if ((error as Error).name === "AbortError") return;

          cleanup();
          setState((prev) => ({
            ...prev,
            status: "error",
            error: error instanceof Error ? error.message : "Polling failed",
          }));
        }
      };

      // Start polling immediately, then every POLL_INTERVAL
      poll();
      pollIntervalRef.current = setInterval(poll, POLL_INTERVAL);

    } catch (error) {
      if ((error as Error).name === "AbortError") return;

      cleanup();
      setState((prev) => ({
        ...prev,
        status: "error",
        error: error instanceof Error ? error.message : "Failed to start video generation",
      }));
    }
  }, [cleanup]);

  // Cancel video generation
  const cancel = useCallback(() => {
    cleanup();
    setState({
      status: "idle",
      operationName: null,
      videoUrl: null,
      elapsedTime: 0,
      error: null,
    });
  }, [cleanup]);

  // Reset state
  const reset = useCallback(() => {
    cleanup();
    setState({
      status: "idle",
      operationName: null,
      videoUrl: null,
      elapsedTime: 0,
      error: null,
    });
  }, [cleanup]);

  return {
    ...state,
    generateVideo,
    cancel,
    reset,
    isGenerating: state.status === "starting" || state.status === "generating",
  };
}
