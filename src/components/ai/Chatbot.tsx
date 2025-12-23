"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ChatbotProps {
  context?: {
    candidates?: Record<string, unknown>;
  };
}

export function Chatbot({ context }: ChatbotProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    // Use block: "nearest" to only scroll within the container, not the page
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: userMessage,
          context,
        }),
      });

      const data = await response.json();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.response || "Désolé, je n'ai pas pu répondre." },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Une erreur est survenue. Réessayez plus tard." },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="bg-gray-800 text-white">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-1.5 rounded-full bg-blue-600">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-white text-sm">Assistant IA</h3>
            <p className="text-xs text-gray-400">
              Posez vos questions sur les données
            </p>
          </div>
        </div>

        {/* Messages */}
        <div className="h-40 overflow-y-auto mb-3 space-y-2 pr-2">
          {messages.length === 0 && (
            <p className="text-gray-500 text-sm text-center py-6">
              Ex: &quot;Qui est en tête ?&quot;, &quot;Évolution de...&quot;
            </p>
          )}
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex gap-2 ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {message.role === "assistant" && (
                <div className="p-1 rounded-full bg-blue-600 h-5 w-5 flex-shrink-0">
                  <Bot className="w-3 h-3 text-white" />
                </div>
              )}
              <div
                className={`rounded-lg px-3 py-2 max-w-[80%] text-sm ${
                  message.role === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-700 text-gray-100"
                }`}
              >
                {message.content}
              </div>
              {message.role === "user" && (
                <div className="p-1 rounded-full bg-gray-600 h-5 w-5 flex-shrink-0">
                  <User className="w-3 h-3 text-gray-300" />
                </div>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-2 justify-start">
              <div className="p-1 rounded-full bg-blue-600 h-5 w-5 flex-shrink-0">
                <Bot className="w-3 h-3 text-white" />
              </div>
              <div className="bg-gray-700 rounded-lg px-3 py-2">
                <Loader2 className="w-4 h-4 animate-spin text-gray-300" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Votre question..."
            className="flex-1 bg-gray-700 text-white placeholder:text-gray-500 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
          <Button
            type="submit"
            size="icon"
            disabled={isLoading || !input.trim()}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
