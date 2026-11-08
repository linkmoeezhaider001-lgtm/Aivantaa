"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useChat } from "ai/react";
import { Bot, MessageCircle, Send, Sparkles, X } from "lucide-react";

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { messages, input, handleInputChange, handleSubmit, isLoading } =
    useChat();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const submitMessage = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!input.trim() || isLoading) return;
    handleSubmit(event);
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 sm:bottom-7 sm:right-7">
      {isOpen && (
        <section
          aria-label="Aivantaa support chat"
          className="mb-4 flex h-[min(620px,calc(100vh-7rem))] w-[min(380px,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-2xl border border-cyan-400/20 bg-zinc-950/95 shadow-2xl shadow-cyan-950/40 backdrop-blur-xl"
        >
          <header className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900/80 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-300/30 bg-cyan-400/10 text-cyan-300">
                <Bot size={19} />
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-100">
                  Aivantaa Support
                </p>
                <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Online now
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Close chat"
              className="rounded-lg p-2 text-zinc-500 transition hover:bg-zinc-800 hover:text-zinc-100"
            >
              <X size={18} />
            </button>
          </header>

          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            {messages.length === 0 && (
              <div className="rounded-xl border border-cyan-400/10 bg-cyan-400/[0.04] p-4">
                <div className="mb-3 flex items-center gap-2 text-cyan-300">
                  <Sparkles size={16} />
                  <span className="text-sm font-medium">Welcome to Aivantaa</span>
                </div>
                <p className="text-sm leading-6 text-zinc-400">
                  Ask how we reconnect dormant MedSpa leads and turn them into
                  booked appointments.
                </p>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-6 ${
                    message.role === "user"
                      ? "rounded-br-md bg-cyan-400 text-zinc-950"
                      : "rounded-bl-md border border-zinc-800 bg-zinc-900 text-zinc-300"
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-md border border-zinc-800 bg-zinc-900 px-4 py-3">
                  <span className="flex gap-1">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-300" />
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-300 [animation-delay:150ms]" />
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-300 [animation-delay:300ms]" />
                  </span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form
            onSubmit={submitMessage}
            className="border-t border-zinc-800 bg-zinc-900/60 p-3"
          >
            <div className="flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-950 p-1.5 transition focus-within:border-cyan-400/60">
              <input
                value={input}
                onChange={handleInputChange}
                placeholder="Ask about lead reactivation..."
                aria-label="Chat message"
                className="min-w-0 flex-1 bg-transparent px-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600"
                disabled={isLoading}
              />
              <button
                type="submit"
                aria-label="Send message"
                disabled={isLoading || !input.trim()}
                className="rounded-lg bg-cyan-400 p-2 text-zinc-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Send size={16} />
              </button>
            </div>
          </form>
        </section>
      )}

      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-label={isOpen ? "Close Aivantaa support chat" : "Open Aivantaa support chat"}
        className="ml-auto flex h-14 w-14 items-center justify-center rounded-full border border-cyan-300/40 bg-cyan-400 text-zinc-950 shadow-lg shadow-cyan-500/25 transition hover:scale-105 hover:bg-cyan-300"
      >
        {isOpen ? <X size={22} /> : <MessageCircle size={23} />}
      </button>
    </div>
  );
}
