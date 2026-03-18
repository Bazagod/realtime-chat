"use client";

import { format } from "date-fns";

export default function MessageBubble({ message, isOwn, showAvatar }) {
  if (message.type === "system") {
    return (
      <div className="flex justify-center py-2">
        <span className="text-[11px] text-dark-500 bg-dark-800/50 px-3 py-1 rounded-full">
          {message.content}
        </span>
      </div>
    );
  }

  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"} ${showAvatar ? "mt-4" : "mt-0.5"}`}>
      <div className={`flex gap-2 max-w-[75%] md:max-w-[65%] ${isOwn ? "flex-row-reverse" : ""}`}>
        {/* Avatar */}
        <div className="shrink-0 w-8 self-end">
          {showAvatar && !isOwn && (
            <div className="w-8 h-8 rounded-full bg-dark-700 flex items-center justify-center text-xs font-bold text-dark-300">
              {message.sender?.username?.[0]?.toUpperCase() || "?"}
            </div>
          )}
        </div>

        <div className="min-w-0">
          {showAvatar && !isOwn && (
            <p className="text-xs text-dark-400 mb-1 ml-1 font-medium">{message.sender?.username}</p>
          )}

          <div
            className={`px-3.5 py-2.5 text-sm leading-relaxed ${
              isOwn
                ? "bg-primary-600 text-white rounded-2xl rounded-br-md"
                : "bg-dark-800 text-dark-100 rounded-2xl rounded-bl-md"
            }`}
          >
            <p className="whitespace-pre-wrap break-words">{message.content}</p>
            <p
              className={`text-[10px] mt-1 text-right ${
                isOwn ? "text-primary-200/70" : "text-dark-500"
              }`}
            >
              {(() => {
                try {
                  const d = new Date(message.created_at || message.createdAt);
                  return isNaN(d.getTime()) ? "" : format(d, "HH:mm");
                } catch { return ""; }
              })()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
