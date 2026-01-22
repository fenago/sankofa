"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Link, FileUp, Plus, X, Loader2, CheckCircle, Network, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Source } from "@/lib/types";
import { mutate } from "swr";
import { notebookKeys } from "@/hooks/useNotebooks";

interface GraphStatus {
  graphed: boolean;
  skillCount: number;
  available: boolean;
  loading?: boolean;
  extracting?: boolean;
  jobId?: string;
  jobStatus?: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
}

interface SourcesPanelProps {
  notebookId?: string; // Optional - graph features only available when provided
  sources: Source[];
  onAddUrl: (url: string) => Promise<void>;
  onAddFile: (file: File) => Promise<void>;
  onRemoveSource: (id: string) => void;
  onAnalyze: () => void;
  isLoading: boolean;
}

// Polling interval for extraction status (5 seconds)
const POLL_INTERVAL = 5000;

export function SourcesPanel({ notebookId, sources, onAddUrl, onAddFile, onRemoveSource, onAnalyze, isLoading }: SourcesPanelProps) {
  const [urlInput, setUrlInput] = useState("");
  const [activeTab, setActiveTab] = useState<"url" | "file">("url");
  const [graphStatuses, setGraphStatuses] = useState<Record<string, GraphStatus>>({});
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch graph status for a single source
  const fetchGraphStatus = useCallback(async (sourceId: string) => {
    if (!notebookId) return;

    try {
      const res = await fetch(`/api/notebooks/${notebookId}/sources/${sourceId}/graph`);
      if (res.ok) {
        const data = await res.json();
        setGraphStatuses(prev => ({
          ...prev,
          [sourceId]: {
            graphed: data.graphed,
            skillCount: data.skillCount,
            available: data.available,
            loading: false,
            extracting: data.extracting || false,
            jobId: data.jobId,
            jobStatus: data.jobStatus,
            error: data.lastJob?.status === 'failed' ? data.lastJob.error : undefined,
          }
        }));

        // If extraction just completed, revalidate graph data
        if (data.graphed && data.skillCount > 0) {
          mutate(notebookKeys.graph(notebookId));
          mutate(notebookKeys.learningPath(notebookId));
        }

        return data;
      }
    } catch {
      setGraphStatuses(prev => ({
        ...prev,
        [sourceId]: { ...prev[sourceId], loading: false }
      }));
    }
    return null;
  }, [notebookId]);

  // Fetch graph status for all ready sources
  const fetchGraphStatuses = useCallback(async () => {
    if (!notebookId) return;

    const readySources = sources.filter(s => s.status === "success");

    for (const source of readySources) {
      // Skip if already loading
      if (graphStatuses[source.id]?.loading) continue;

      setGraphStatuses(prev => ({
        ...prev,
        [source.id]: { ...prev[source.id], loading: true }
      }));

      await fetchGraphStatus(source.id);
    }
  }, [sources, notebookId, graphStatuses, fetchGraphStatus]);

  // Fetch graph statuses on mount and when sources change
  useEffect(() => {
    if (!notebookId) return;

    const readySources = sources.filter(s => s.status === "success");
    // Only fetch for sources we haven't checked yet
    const uncheckedSources = readySources.filter(s => !graphStatuses[s.id]);
    if (uncheckedSources.length > 0) {
      fetchGraphStatuses();
    }
  }, [sources, fetchGraphStatuses, graphStatuses, notebookId]);

  // Poll for extraction status when any source is extracting
  useEffect(() => {
    if (!notebookId) return;

    const extractingSources = Object.entries(graphStatuses)
      .filter(([_, status]) => status.extracting)
      .map(([sourceId]) => sourceId);

    if (extractingSources.length > 0) {
      // Start polling
      if (!pollIntervalRef.current) {
        pollIntervalRef.current = setInterval(async () => {
          for (const sourceId of extractingSources) {
            const data = await fetchGraphStatus(sourceId);
            // If no longer extracting, we'll catch it in the next cycle
            if (data && !data.extracting) {
              console.log(`[SourcesPanel] Source ${sourceId} extraction completed`);
            }
          }
        }, POLL_INTERVAL);
      }
    } else {
      // Stop polling
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [notebookId, graphStatuses, fetchGraphStatus]);

  // Extract graph for a single source (streaming)
  const handleExtractGraph = async (sourceId: string) => {
    if (!notebookId) return;

    setGraphStatuses(prev => ({
      ...prev,
      [sourceId]: { ...prev[sourceId], extracting: true, error: undefined, jobStatus: 'pending' }
    }));

    try {
      const res = await fetch(`/api/notebooks/${notebookId}/sources/${sourceId}/graph`, {
        method: "POST",
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || `HTTP ${res.status}`);
      }

      // Handle streaming response
      const reader = res.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const event = JSON.parse(line);
            console.log(`[SourcesPanel] Stream event:`, event.status, event);

            if (event.status === 'extracting') {
              setGraphStatuses(prev => ({
                ...prev,
                [sourceId]: {
                  ...prev[sourceId],
                  extracting: true,
                  jobId: event.jobId,
                  jobStatus: 'processing',
                }
              }));
            } else if (event.status === 'storing') {
              setGraphStatuses(prev => ({
                ...prev,
                [sourceId]: {
                  ...prev[sourceId],
                  jobStatus: 'processing',
                }
              }));
            } else if (event.status === 'complete') {
              setGraphStatuses(prev => ({
                ...prev,
                [sourceId]: {
                  graphed: true,
                  skillCount: event.skillCount || 0,
                  available: true,
                  loading: false,
                  extracting: false,
                  jobId: event.jobId,
                  jobStatus: 'completed',
                }
              }));
              mutate(notebookKeys.graph(notebookId));
              mutate(notebookKeys.learningPath(notebookId));
              console.log(`[SourcesPanel] Extraction complete: ${event.skillCount} skills`);
            } else if (event.status === 'error') {
              setGraphStatuses(prev => ({
                ...prev,
                [sourceId]: {
                  ...prev[sourceId],
                  extracting: false,
                  error: event.error || 'Extraction failed',
                  jobStatus: 'failed',
                }
              }));
              console.error(`[SourcesPanel] Extraction error:`, event.error);
            }
            // Ignore heartbeat events
          } catch {
            console.warn('[SourcesPanel] Failed to parse stream line:', line);
          }
        }
      }
    } catch (err) {
      console.error('[SourcesPanel] Extraction request failed:', err);
      setGraphStatuses(prev => ({
        ...prev,
        [sourceId]: {
          ...prev[sourceId],
          extracting: false,
          error: err instanceof Error ? err.message : 'Network error - please try again',
        }
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;
    await onAddUrl(urlInput);
    setUrlInput("");
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await onAddFile(file);
      // Reset input so same file can be selected again
      e.target.value = "";
    }
  };

  // Count file sources (PDFs and TXTs)
  const fileCount = sources.filter(s =>
    s.url.toLowerCase().endsWith('.pdf') ||
    s.url.toLowerCase().endsWith('.txt') ||
    s.url.startsWith('file-')
  ).length;

  // Get extraction status text
  const getExtractionStatusText = (status: GraphStatus) => {
    if (status.loading) return "Checking...";
    if (status.extracting) {
      if (status.jobStatus === 'pending') return "Starting...";
      if (status.jobStatus === 'processing') return "Extracting...";
      return "Extracting...";
    }
    if (status.error) return "Failed";
    if (!status.available) return "Unavailable";
    if (status.graphed) return "Re-extract";
    return "Extract to Graph";
  };

  return (
    <div className="flex flex-col h-full bg-white text-black p-4 gap-6 overflow-hidden max-w-full">
      <div>
        <h2 className="text-2xl font-bold mb-1">Sources</h2>
        <p className="text-sm text-gray-600">Add content to your notebook</p>
      </div>

      <div className="flex gap-2 p-1 bg-gray-100 rounded-lg border border-gray-200">
        <button
          onClick={() => setActiveTab("url")}
          className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === "url" ? "bg-white text-black shadow-sm" : "text-gray-500 hover:text-black"
          }`}
        >
          <Link className="h-4 w-4" />
          URL
        </button>
        <button
          onClick={() => setActiveTab("file")}
          className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === "file" ? "bg-white text-black shadow-sm" : "text-gray-500 hover:text-black"
          }`}
        >
          <FileUp className="h-4 w-4" />
          File
        </button>
      </div>

      <div className="flex-none">
        {activeTab === "url" ? (
          <form onSubmit={handleSubmit} className="space-y-3">
            <Input
              placeholder="Paste URL (e.g. https://example.com)..."
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              className="bg-white border-gray-300 text-black placeholder:text-gray-400 focus-visible:ring-black"
              disabled={isLoading}
            />
            <Button
              type="submit"
              className="w-full bg-black text-white hover:bg-gray-800 hover:text-white font-medium"
              disabled={isLoading || !urlInput.trim()}
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              {isLoading ? "Adding Source..." : "Add Source"}
            </Button>
          </form>
        ) : (
          <div className="space-y-3">
            <label className={`relative h-32 border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-2 transition-colors ${
              isLoading || fileCount >= 5
                ? "border-gray-200 bg-gray-100 cursor-not-allowed"
                : "border-gray-300 bg-gray-50 cursor-pointer hover:border-gray-400"
            }`}>
              <input
                type="file"
                accept=".pdf,.txt"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={handleFileChange}
                disabled={isLoading || fileCount >= 5}
              />
              <FileUp className={`h-8 w-8 ${fileCount >= 5 ? "text-gray-300" : "text-gray-500"}`} />
              <span className={`text-sm font-medium ${fileCount >= 5 ? "text-gray-400" : "text-gray-600"}`}>
                {fileCount >= 5 ? "Max 5 files reached" : "Click to upload PDF or TXT"}
              </span>
              <span className="text-xs text-gray-400">
                {fileCount >= 5 ? "Remove a file to add more" : `${fileCount}/5 files added`}
              </span>
            </label>
            {isLoading && (
              <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Processing file...</span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Active Sources ({sources.length})</h3>
          {sources.filter(s => s.status === "success").length > 0 && (
            <Button
              size="sm"
              onClick={onAnalyze}
              className="bg-black text-white hover:bg-gray-800 hover:text-white h-7 px-3 text-xs font-medium"
            >
              Analyze All
            </Button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="space-y-3 pr-1">
            {sources.map((source) => {
              const graphStatus = graphStatuses[source.id];
              return (
                <div key={source.id} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <h4 className="text-sm font-medium text-black mb-1 truncate max-w-full block" title={source.title || source.url}>
                      {source.title || source.url}
                  </h4>
                  <p className="text-xs text-gray-500 truncate max-w-full block mb-2" title={source.url}>{source.url}</p>
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    {source.status === "success" ? (
                        <span className="text-green-600 flex items-center gap-1 text-xs">
                            <CheckCircle className="h-3 w-3 flex-shrink-0" /> Ready
                        </span>
                    ) : source.status === "error" ? (
                        <span className="text-red-600 flex items-center gap-1 text-xs">
                            <X className="h-3 w-3 flex-shrink-0" /> Error
                        </span>
                    ) : (
                        <span className="text-yellow-600 flex items-center gap-1 text-xs">
                            <Loader2 className="h-3 w-3 animate-spin flex-shrink-0" /> Processing
                        </span>
                    )}
                    {/* Graph status indicator (only when notebookId is provided) */}
                    {notebookId && source.status === "success" && (
                      <>
                        <span className="text-gray-300">|</span>
                        {!graphStatus || graphStatus.loading ? (
                          <span className="text-gray-400 flex items-center gap-1 text-xs">
                            <Loader2 className="h-3 w-3 animate-spin flex-shrink-0" /> Checking...
                          </span>
                        ) : graphStatus.extracting ? (
                          <span className="text-blue-600 flex items-center gap-1 text-xs">
                            <Loader2 className="h-3 w-3 animate-spin flex-shrink-0" />
                            {graphStatus.jobStatus === 'pending' ? 'Starting...' : 'Extracting...'}
                          </span>
                        ) : graphStatus.error ? (
                          <span className="text-red-500 flex items-center gap-1 text-xs" title={graphStatus.error}>
                            <X className="h-3 w-3 flex-shrink-0" /> Failed
                          </span>
                        ) : graphStatus.graphed ? (
                          <span className="text-purple-600 flex items-center gap-1 text-xs">
                            <Network className="h-3 w-3 flex-shrink-0" /> {graphStatus.skillCount} skills
                          </span>
                        ) : graphStatus.available ? (
                          <span className="text-gray-400 flex items-center gap-1 text-xs">
                            <Network className="h-3 w-3 flex-shrink-0" /> Not graphed
                          </span>
                        ) : (
                          <span className="text-orange-500 flex items-center gap-1 text-xs">
                            <Network className="h-3 w-3 flex-shrink-0" /> Graph unavailable
                          </span>
                        )}
                      </>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {/* Extract to Graph button (only when notebookId is provided and source is ready) */}
                    {notebookId && source.status === "success" && (
                      <button
                        onClick={() => handleExtractGraph(source.id)}
                        disabled={!graphStatus || graphStatus.loading || graphStatus.extracting || !graphStatus.available}
                        className={`flex-1 py-1.5 text-xs rounded border transition-colors flex items-center justify-center gap-1 ${
                          !graphStatus || graphStatus.loading || !graphStatus.available
                            ? "text-gray-400 bg-gray-100 border-gray-200 cursor-not-allowed"
                            : graphStatus.extracting
                              ? "text-blue-500 bg-blue-50 border-blue-200 cursor-not-allowed"
                              : graphStatus.error
                                ? "text-red-600 bg-red-50 hover:bg-red-100 border-red-200"
                                : graphStatus.graphed
                                  ? "text-purple-600 bg-purple-50 hover:bg-purple-100 border-purple-200"
                                  : "text-black bg-white hover:bg-gray-100 border-gray-300"
                        }`}
                      >
                        {graphStatus?.extracting || graphStatus?.loading ? (
                          <Loader2 className="h-3 w-3 animate-spin flex-shrink-0" />
                        ) : (
                          <Sparkles className="h-3 w-3 flex-shrink-0" />
                        )}
                        {graphStatus ? getExtractionStatusText(graphStatus) : "Checking..."}
                      </button>
                    )}
                    <button
                      onClick={() => onRemoveSource(source.id)}
                      className="flex-1 py-1.5 text-xs text-red-600 bg-red-50 hover:bg-red-100 rounded border border-red-200 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}

            {sources.length === 0 && (
                <div className="text-center text-gray-400 py-8 text-sm">
                    No sources added yet.
                </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
