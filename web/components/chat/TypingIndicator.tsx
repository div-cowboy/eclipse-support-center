"use client";

import { Bot } from "lucide-react";

interface TypingIndicatorProps {
  className?: string;
  showAvatar?: boolean;
}

export function TypingIndicator({
  className = "",
  showAvatar = true,
}: TypingIndicatorProps) {
  return (
    <div className={`flex gap-3 justify-start ${className}`}>
      {showAvatar && (
        <div className="flex-shrink-0">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Bot className="h-4 w-4 text-primary" />
          </div>
        </div>
      )}

      <div className="max-w-[80%] rounded-lg px-3 py-2 bg-muted">
        <div className="flex items-center gap-1">
          <span className="text-sm text-muted-foreground">AI is typing</span>
          <div className="flex gap-1">
            <div className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.3s]"></div>
            <div className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.15s]"></div>
            <div className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
