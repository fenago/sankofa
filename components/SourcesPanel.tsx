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
  checkingAfterNetworkError?: boolean;
  extractionStartedAt?: number;
  lastPolledAt?: number;
  pollCount?: number;
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
  const [, forceUpdate] = useState(0); // For elapsed time updates
  const elapsedTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Update elapsed time display every second when extracting
  useEffect(() => {
    const hasExtractingSource = Object.values(graphStatuses).some(s => s.extracting);

    if (hasExtractingSource && !elapsedTimerRef.current) {
      elapsedTimerRef.current = setInterval(() => {
        forceUpdate(n => n + 1);
      }, 1000);
    } else if (!hasExtractingSource && elapsedTimerRef.current) {
      clearInterval(elapsedTimerRef.current);
      elapsedTimerRef.current = null;
    }

    return () => {
      if (elapsedTimerRef.current) {
        clearInterval(elapsedTimerRef.current);
        elapsedTimerRef.current = null;
      }
    };
  }, [graphStatuses]);

  // Format elapsed time
  const formatElapsedTime = (startedAt: number) => {
    const elapsed = Math.floor((Date.now() - startedAt) / 1000);
    if (elapsed < 60) return `${elapsed}s`;
    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;
    return `${mins}m ${secs}s`;
  };

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
            checkingAfterNetworkError: false,
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
            // Update poll tracking before fetch
            setGraphStatuses(prev => ({
              ...prev,
              [sourceId]: {
                ...prev[sourceId],
                lastPolledAt: Date.now(),
                pollCount: (prev[sourceId]?.pollCount || 0) + 1,
              }
            }));

            const data = await fetchGraphStatus(sourceId);
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

  // Extract graph for a single source
  const handleExtractGraph = async (sourceId: string) => {
    if (!notebookId) return;

    setGraphStatuses(prev => ({
      ...prev,
      [sourceId]: { ...prev[sourceId], extracting: true, error: undefined, jobStatus: 'pending', extractionStartedAt: Date.now() }
    }));

    try {
      // Step 1: Create the extraction job
      console.log(`[SourcesPanel] Creating extraction job for source ${sourceId}`);
      const createRes = await fetch(`/api/notebooks/${notebookId}/sources/${sourceId}/graph`, {
        method: "POST",
      });

      const createData = await createRes.json();

      if (!createRes.ok) {
        throw new Error(createData.error || `HTTP ${createRes.status}`);
      }

      if (!createData.jobId) {
        throw new Error('No job ID returned from server');
      }

      const jobId = createData.jobId;
      console.log(`[SourcesPanel] Job created: ${jobId}, ${createData.textLength} chars. Starting worker...`);

      // Update state with job ID
      setGraphStatuses(prev => ({
        ...prev,
        [sourceId]: {
          ...prev[sourceId],
          extracting: true,
          jobId: jobId,
          jobStatus: 'processing',
        }
      }));

      // Step 2: Call the Netlify background function to run extraction
      // This is a true background function with 15-minute timeout
      // We don't await this - it returns 202 immediately and processes in background
      fetch('/.netlify/functions/extract-graph-background', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId,
          notebookId,
          sourceId,
          // Text will be fetched from Supabase by the background function
        }),
      }).then(async (workerRes) => {
        const workerData = await workerRes.json();
        console.log(`[SourcesPanel] Background function response:`, workerData);
        if (!workerRes.ok) {
          console.error(`[SourcesPanel] Background function error:`, workerData.error);
          // If worker failed, polling will pick up the failed status
        }
      }).catch((workerErr) => {
        // Worker errors will be tracked by job status polling
        console.error(`[SourcesPanel] Background function call failed:`, workerErr);
      });

      // Polling will automatically pick up this job and track completion

    } catch (err) {
      console.error('[SourcesPanel] Extraction request failed:', err);

      // Check if this is a network error
      const isNetworkError = err instanceof TypeError &&
        (err.message.includes('network') || err.message.includes('fetch') || err.message.includes('Failed to fetch'));

      if (isNetworkError) {
        // Network error - check if job might have started anyway
        console.log('[SourcesPanel] Network error, checking job status...');
        setGraphStatuses(prev => ({
          ...prev,
          [sourceId]: {
            ...prev[sourceId],
            extracting: true,
            jobStatus: 'processing',
            error: undefined,
            checkingAfterNetworkError: true,
          }
        }));

        // Check actual status after a delay
        setTimeout(async () => {
          const data = await fetchGraphStatus(sourceId);
          if (data) {
            console.log('[SourcesPanel] Status check result:', data);
          }
        }, 3000);
      } else {
        // Actual error
        setGraphStatuses(prev => ({
          ...prev,
          [sourceId]: {
            ...prev[sourceId],
            extracting: false,
            error: err instanceof Error ? err.message : 'Request failed',
            jobStatus: 'failed',
          }
        }));
      }
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
      if (status.checkingAfterNetworkError) return "Reconnecting...";
      if (status.jobStatus === 'pending') return "Starting...";
      const elapsed = status.extractionStartedAt ? formatElapsedTime(status.extractionStartedAt) : '';
      if (status.jobStatus === 'processing') return elapsed ? `Extracting (${elapsed})` : "Extracting...";
      return elapsed ? `Extracting (${elapsed})` : "Extracting...";
    }
    if (status.error) return "Retry";
    if (!status.available) return "Unavailable";
    if (status.graphed) return "Re-extract";
    return "Extract to Graph";
  };

  // Get helpful message for extractions
  const getExtractionHelpText = (status: GraphStatus) => {
    if (!status.extracting || !status.extractionStartedAt) return null;
    const elapsed = Math.floor((Date.now() - status.extractionStartedAt) / 1000);
    if (elapsed > 180) return "Still working... Large documents can take 3-5 minutes. You can leave this page - extraction continues in background.";
    if (elapsed > 120) return "Building knowledge graph... This typically takes 2-4 minutes for large documents.";
    if (elapsed > 60) return "AI is analyzing content structure and relationships...";
    if (elapsed > 30) return "Extracting skills, prerequisites, and educational metadata...";
    if (elapsed > 10) return "Processing with AI... Status updates every 5 seconds.";
    return "Starting extraction... This may take 1-4 minutes depending on document size.";
  };

  // Check if we just polled (within last 2 seconds)
  const isRecentlyPolled = (status: GraphStatus) => {
    if (!status.lastPolledAt) return false;
    return Date.now() - status.lastPolledAt < 2000;
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
                            {graphStatus.checkingAfterNetworkError
                              ? 'Reconnecting...'
                              : graphStatus.jobStatus === 'pending'
                                ? 'Starting...'
                                : isRecentlyPolled(graphStatus)
                                  ? 'Checking...'
                                  : `Extracting${graphStatus.extractionStartedAt ? ` (${formatElapsedTime(graphStatus.extractionStartedAt)})` : '...'}`}
                            {graphStatus.pollCount && graphStatus.pollCount > 0 && (
                              <span className="text-blue-400 ml-1 text-[10px]">• {graphStatus.pollCount} checks</span>
                            )}
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
                  {/* Help text for long extractions */}
                  {graphStatus && getExtractionHelpText(graphStatus) && (
                    <p className="text-xs text-blue-600 mt-1 mb-2 italic">
                      {getExtractionHelpText(graphStatus)}
                    </p>
                  )}
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
