"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  DEFAULT_PROMPTS,
  PromptKey,
  CustomPrompts,
  getStoredPrompts,
  savePrompts,
  isPromptCustomized,
} from "@/lib/prompts";
import { RotateCcw } from "lucide-react";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customPrompts: CustomPrompts;
  onPromptsChange: (prompts: CustomPrompts) => void;
}

const TABS: { key: PromptKey; label: string }[] = [
  { key: "chat", label: "Chat" },
  { key: "mindmap", label: "Mindmap" },
  { key: "overview", label: "Overview" },
  { key: "summary", label: "Summary" },
  { key: "slides", label: "Slides" },
  { key: "audioScript", label: "Audio" },
];

export function SettingsDialog({
  open,
  onOpenChange,
  customPrompts,
  onPromptsChange,
}: SettingsDialogProps) {
  const [activeTab, setActiveTab] = useState<PromptKey>("chat");
  const [localPrompts, setLocalPrompts] = useState<CustomPrompts>({});

  // Sync local state with props when dialog opens
  useEffect(() => {
    if (open) {
      setLocalPrompts(customPrompts);
    }
  }, [open, customPrompts]);

  const activeConfig = DEFAULT_PROMPTS[activeTab];
  const currentValue =
    localPrompts[activeTab] ?? activeConfig.defaultPrompt;
  const isCustomized = isPromptCustomized(activeTab, localPrompts);

  const handlePromptChange = (value: string) => {
    setLocalPrompts((prev) => ({
      ...prev,
      [activeTab]: value,
    }));
  };

  const handleReset = () => {
    setLocalPrompts((prev) => {
      const updated = { ...prev };
      delete updated[activeTab];
      return updated;
    });
  };

  const handleSave = () => {
    // Clean up prompts that match defaults
    const cleanedPrompts: CustomPrompts = {};
    for (const key of Object.keys(localPrompts) as PromptKey[]) {
      if (localPrompts[key] !== DEFAULT_PROMPTS[key].defaultPrompt) {
        cleanedPrompts[key] = localPrompts[key];
      }
    }

    savePrompts(cleanedPrompts);
    onPromptsChange(cleanedPrompts);
    onOpenChange(false);
  };

  const handleCancel = () => {
    setLocalPrompts(customPrompts);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>System Prompts Settings</DialogTitle>
          <DialogDescription>
            Customize the AI system prompts used throughout the application.
            Changes are saved to your browser.
          </DialogDescription>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-gray-200 pb-2">
          {TABS.map((tab) => {
            const tabIsCustomized = isPromptCustomized(tab.key, localPrompts);
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`
                  px-3 py-1.5 text-sm font-medium rounded-md transition-colors
                  ${
                    activeTab === tab.key
                      ? "bg-black text-white"
                      : "text-gray-600 hover:bg-gray-100"
                  }
                `}
              >
                {tab.label}
                {tabIsCustomized && (
                  <span className="ml-1 text-xs opacity-60">*</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          <div className="mb-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">
                {activeConfig.label}
              </label>
              {isCustomized && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleReset}
                  className="text-xs h-7 text-gray-500 hover:text-gray-700"
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Reset to Default
                </Button>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              {activeConfig.description}
            </p>
          </div>

          <textarea
            value={currentValue}
            onChange={(e) => handlePromptChange(e.target.value)}
            className="flex-1 min-h-[200px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
            placeholder="Enter system prompt..."
          />
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave} className="bg-black text-white hover:bg-gray-800">
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
