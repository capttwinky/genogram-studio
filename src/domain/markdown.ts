const FENCE_PATTERN = /```(?:genogram-json|json)\s*([\s\S]*?)```/i;

export function extractGenogramJson(markdown: string): { source: string; warning?: string } {
  const match = markdown.match(FENCE_PATTERN);
  if (match?.[1]) {
    return { source: match[1].trim() };
  }

  return {
    source: markdown.trim(),
    warning: "No genogram-json fence found; validating the full editor contents as JSON.",
  };
}

