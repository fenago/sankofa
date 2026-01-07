import { Source, ResponseLength } from "../types";

interface StreamCallbacks {
  onStart?: () => void;
  onToken?: (token: string) => void;
  onComplete?: (fullText: string) => void;
  onError?: (error: Error) => void;
}

interface ChatOptions {
  enableImageGeneration?: boolean;
  responseLength?: ResponseLength;
}

export async function streamChatCompletion(
  userMessage: string,
  sources: Source[],
  callbacks: StreamCallbacks,
  options: ChatOptions = {}
): Promise<void> {
  const { enableImageGeneration = false, responseLength = "detailed" } = options;
  const sourcesContext = sources
    .map((source, index) => {
      const body = source.content ?? source.text ?? "";
      return `[Source ${index + 1}: ${source.title ?? source.url}]\nURL: ${
        source.url
      }\n\n${body}\n\n---\n`;
    })
    .join("\n");

  try {
    callbacks.onStart?.();

    // Call our server-side API route (which uses Gemini)
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [{ role: "user", content: userMessage }],
        context: sourcesContext,
        enableImageGeneration,
        responseLength,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error ||
          errorData.message ||
          `API request failed: ${response.statusText}`
      );
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("Failed to get response reader");
    }

    const decoder = new TextDecoder();
    let fullText = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      fullText += chunk;
      callbacks.onToken?.(chunk);
    }

    callbacks.onComplete?.(fullText);
  } catch (error) {
    const err =
      error instanceof Error ? error : new Error("Unknown error occurred");
    callbacks.onError?.(err);
    throw err;
  }
}
