"use client";

export default function TypingIndicator({ users }) {
  if (!users || users.length === 0) return null;

  const names =
    users.length === 1
      ? `${users[0].username} is typing`
      : users.length === 2
        ? `${users[0].username} and ${users[1].username} are typing`
        : `${users[0].username} and ${users.length - 1} others are typing`;

  return (
    <div className="flex items-center gap-2 px-2 py-1">
      <div className="flex gap-1">
        <span className="w-1.5 h-1.5 bg-dark-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
        <span className="w-1.5 h-1.5 bg-dark-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
        <span className="w-1.5 h-1.5 bg-dark-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
      </div>
      <span className="text-xs text-dark-400">{names}</span>
    </div>
  );
}
