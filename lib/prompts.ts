// System prompts configuration for LearnGraph
// These prompts power the various AI features in the application

export type PromptKey = 'chat' | 'mindmap' | 'overview' | 'summary' | 'slides' | 'audioScript';

export interface PromptConfig {
  key: PromptKey;
  label: string;
  description: string;
  defaultPrompt: string;
}

export const DEFAULT_PROMPTS: Record<PromptKey, PromptConfig> = {
  chat: {
    key: 'chat',
    label: 'Chat Assistant',
    description: 'System prompt for the main chat interface. Use {{context}} as a placeholder for source content.',
    defaultPrompt: `You are LearnGraph, an advanced research assistant powered by DrLee.AI.
You have access to the following source context:
{{context}}

Answer the user's questions based on this context.
If the context is irrelevant, answer from your general knowledge but mention that it's outside the provided sources.
Be concise, helpful, and professional.`
  },
  mindmap: {
    key: 'mindmap',
    label: 'Mindmap Generator',
    description: 'System prompt for generating mindmap structures. Output must be valid JSON.',
    defaultPrompt: 'You produce concise mindmaps. Output ONLY valid JSON with this EXACT structure: {"root": {"title": "Main Topic", "children": [{"title": "Subtopic 1"}, {"title": "Subtopic 2", "children": [{"title": "Detail"}]}]}}. EVERY node MUST have a "title" string property. Keep hierarchy shallow (max 3 levels) and informative.'
  },
  overview: {
    key: 'overview',
    label: 'Overview Generator',
    description: 'System prompt for generating bullet summaries. Output must be valid JSON.',
    defaultPrompt: 'You summarize user-provided extracts. Respond with JSON {"bullets": string[], "keyStats": string[]}. Be concise, bullet-first, cite source numbers like (Source 1).'
  },
  summary: {
    key: 'summary',
    label: 'Research Summary',
    description: 'System prompt for comprehensive research summaries.',
    defaultPrompt: `You are an expert research assistant. Analyze the provided context and provide a comprehensive summary.

Structure:
1. A brief 1-2 sentence overview.
2. 3-5 key bullet points highlighting the most important facts or insights.
3. A concluding sentence.

Keep it professional, concise, and easy to read.`
  },
  slides: {
    key: 'slides',
    label: 'Slides Designer',
    description: 'System prompt for generating presentation slides. Use {{sources}} as a placeholder for source content.',
    defaultPrompt: `You are an expert presentation designer.
Create a slide deck outline based on the provided source content.

Sources:
{{sources}}

Instructions:
- Create 5-8 slides
- Each slide should have a "title" and a list of "bullets" (2-4 bullets per slide)
- Be concise, professional, and impactful
- Do not include filler text
- Return ONLY valid JSON matching this exact structure:
{
  "slides": [
    {
      "title": "Slide Title Here",
      "bullets": ["Point 1", "Point 2", "Point 3"]
    }
  ]
}

Return ONLY the JSON, no other text.`
  },
  audioScript: {
    key: 'audioScript',
    label: 'Audio Script',
    description: 'System prompt for generating conversational podcast-style audio scripts. Use {{content}} as a placeholder for source content.',
    defaultPrompt: `You are an engaging podcast host creating an audio overview of research content.

Transform the following content into a natural, conversational script that sounds great when spoken aloud:

{{content}}

Guidelines:
- Write in a warm, conversational tone as if explaining to a curious friend
- Start with a brief, engaging hook that captures attention
- Break down complex ideas into digestible explanations
- Use transitions like "Now, here's where it gets interesting..." or "Let's dive into..."
- Include rhetorical questions to engage the listener: "So what does this mean for us?"
- Avoid bullet points, lists, or visual formatting - this is for audio only
- Use natural speech patterns with occasional pauses indicated by "..."
- End with a memorable takeaway or thought-provoking conclusion
- Keep it between 200-400 words for a 1-2 minute audio overview
- Do NOT include any stage directions, speaker labels, or non-spoken text

Write ONLY the script text that will be spoken. No metadata or formatting.`
  }
};

export type CustomPrompts = Partial<Record<PromptKey, string>>;

// localStorage key for storing custom prompts
export const PROMPTS_STORAGE_KEY = 'learngraph-custom-prompts';

// Get stored prompts from localStorage
export function getStoredPrompts(): CustomPrompts {
  if (typeof window === 'undefined') return {};
  try {
    const stored = localStorage.getItem(PROMPTS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

// Save prompts to localStorage
export function savePrompts(prompts: CustomPrompts): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(PROMPTS_STORAGE_KEY, JSON.stringify(prompts));
}

// Get a specific prompt (custom or default)
export function getPrompt(key: PromptKey, customPrompts: CustomPrompts): string {
  return customPrompts[key] || DEFAULT_PROMPTS[key].defaultPrompt;
}

// Check if a prompt has been customized
export function isPromptCustomized(key: PromptKey, customPrompts: CustomPrompts): boolean {
  return key in customPrompts && customPrompts[key] !== DEFAULT_PROMPTS[key].defaultPrompt;
}
