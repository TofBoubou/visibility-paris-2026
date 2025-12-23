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
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
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
    <Card className="bg-brand-blue text-brand-cream">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-full bg-brand-pink">
            <Bot className="w-4 h-4 text-brand-cream" />
          </div>
          <div>
            <h3 className="font-bold text-brand-cream text-sm">Sarah - Assistant IA</h3>
            <p className="text-xs text-brand-cream/70">
              Posez vos questions sur les données
            </p>
          </div>
        </div>

        {/* Messages */}
        <div className="h-48 overflow-y-auto mb-4 space-y-3 pr-2">
          {messages.length === 0 && (
            <p className="text-brand-cream/50 text-sm text-center py-8">
              Exemples: &quot;Qui est en tête ?&quot;, &quot;Comment évolue Sarah Knafo ?&quot;
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
                <div className="p-1 rounded-full bg-brand-pink h-6 w-6 flex-shrink-0">
                  <Bot className="w-4 h-4 text-brand-cream" />
                </div>
              )}
              <div
                className={`rounded-lg px-3 py-2 max-w-[80%] text-sm ${
                  message.role === "user"
                    ? "bg-brand-pink text-brand-cream"
                    : "bg-brand-cream/10 text-brand-cream"
                }`}
              >
                {message.content}
              </div>
              {message.role === "user" && (
                <div className="p-1 rounded-full bg-brand-yellow h-6 w-6 flex-shrink-0">
                  <User className="w-4 h-4 text-brand-blue" />
                </div>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-2 justify-start">
              <div className="p-1 rounded-full bg-brand-pink h-6 w-6 flex-shrink-0">
                <Bot className="w-4 h-4 text-brand-cream" />
              </div>
              <div className="bg-brand-cream/10 rounded-lg px-3 py-2">
                <Loader2 className="w-4 h-4 animate-spin text-brand-cream" />
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
            placeholder="Posez votre question..."
            className="flex-1 bg-brand-cream/10 text-brand-cream placeholder:text-brand-cream/50 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink"
            disabled={isLoading}
          />
          <Button
            type="submit"
            size="icon"
            disabled={isLoading || !input.trim()}
            className="bg-brand-pink hover:bg-brand-pink/80"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
