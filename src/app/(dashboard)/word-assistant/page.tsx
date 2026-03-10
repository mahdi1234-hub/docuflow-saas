"use client";

import React, { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  MessageSquare,
  Send,
  Globe,
  FileText,
  Plus,
  Loader2,
  Trash2,
  Sparkles,
  Upload,
  ExternalLink,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useDropzone } from "react-dropzone";
import { useEdgeStore } from "@/lib/edgestore-client";
import toast from "react-hot-toast";

interface Message {
  id?: string;
  role: "user" | "assistant";
  content: string;
  sources?: string[];
}

interface Conversation {
  id: string;
  title: string;
  updatedAt: string;
  messages: { content: string }[];
}

const MODELS = [
  { id: "llama-3.3-70b-versatile", name: "Llama 3.3 70B" },
  { id: "llama-3.1-8b-instant", name: "Llama 3.1 8B" },
  { id: "mixtral-8x7b-32768", name: "Mixtral 8x7B" },
  { id: "gemma2-9b-it", name: "Gemma 2 9B" },
];

export default function WordAssistantPage() {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState(MODELS[0].id);
  const [useWebSearch, setUseWebSearch] = useState(true);
  const [useDocuments, setUseDocuments] = useState(true);
  const [uploadingFile, setUploadingFile] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { edgestore } = useEdgeStore();

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchConversations = async () => {
    try {
      const res = await fetch("/api/conversations");
      if (res.ok) {
        const data = await res.json();
        setConversations(data);
      }
    } catch (error) {
      console.error("Failed to fetch conversations:", error);
    }
  };

  const newConversation = () => {
    setMessages([]);
    setActiveConversation(null);
  };

  const deleteConversation = async (id: string) => {
    try {
      await fetch("/api/conversations", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: id }),
      });
      setConversations(conversations.filter((c) => c.id !== id));
      if (activeConversation === id) {
        newConversation();
      }
    } catch (error) {
      toast.error("Failed to delete conversation");
    }
  };

  const onDrop = async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    const file = acceptedFiles[0];
    setUploadingFile(true);

    try {
      const res = await edgestore.publicFiles.upload({ file });

      // Create document record
      const docRes = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: file.name,
          fileUrl: res.url,
          fileType: file.type,
          fileSize: file.size,
        }),
      });

      if (docRes.ok) {
        const doc = await docRes.json();
        const text = await file.text();

        // Create embeddings
        await fetch("/api/embeddings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            documentId: doc.id,
            content: text,
            title: file.name,
          }),
        });

        toast.success(`${file.name} uploaded and embedded`);
        setInput((prev) => prev + `\n[Attached: ${file.name}]`);
      }
    } catch (error) {
      toast.error("Failed to upload file");
    } finally {
      setUploadingFile(false);
    }
  };

  const { getRootProps, getInputProps, open: openFileDialog } = useDropzone({
    onDrop,
    noClick: true,
    noKeyboard: true,
    accept: {
      "application/pdf": [".pdf"],
      "text/plain": [".txt"],
    },
  });

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = { role: "user", content: input.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
          conversationId: activeConversation,
          model: selectedModel,
          useWebSearch,
          useDocuments,
        }),
      });

      if (!response.ok) throw new Error("Chat request failed");

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader available");

      const assistantMessage: Message = { role: "assistant", content: "", sources: [] };
      setMessages([...newMessages, assistantMessage]);

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") break;

            try {
              const parsed = JSON.parse(data);
              assistantMessage.content += parsed.content || "";
              if (parsed.sources) assistantMessage.sources = parsed.sources;
              if (parsed.conversationId && !activeConversation) {
                setActiveConversation(parsed.conversationId);
              }
              setMessages([...newMessages, { ...assistantMessage }]);
            } catch {
              // Skip malformed JSON
            }
          }
        }
      }

      fetchConversations();
    } catch (error) {
      console.error("Chat error:", error);
      toast.error("Failed to get AI response");
      setMessages(newMessages);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex h-full" {...getRootProps()}>
      <input {...getInputProps()} />

      {/* Conversation Sidebar */}
      <div className="w-64 border-r border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
        <div className="p-4">
          <Button className="w-full" onClick={newConversation}>
            <Plus className="mr-2 h-4 w-4" />
            New Chat
          </Button>
        </div>
        <div className="space-y-1 px-2 overflow-y-auto" style={{ maxHeight: "calc(100vh - 120px)" }}>
          {conversations.map((conv) => (
            <div
              key={conv.id}
              className={`group flex items-center justify-between rounded-lg px-3 py-2 text-sm cursor-pointer transition-colors ${
                activeConversation === conv.id
                  ? "bg-white shadow-sm dark:bg-gray-800"
                  : "hover:bg-white/50 dark:hover:bg-gray-800/50"
              }`}
              onClick={() => {
                setActiveConversation(conv.id);
                // Load messages for this conversation
              }}
            >
              <div className="flex-1 truncate">
                <p className="truncate font-medium text-gray-900 dark:text-white">{conv.title}</p>
              </div>
              <button
                className="hidden text-gray-400 hover:text-red-500 group-hover:block"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteConversation(conv.id);
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex flex-1 flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-3 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-gray-500" />
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Word Assistant</h1>
          </div>
          <div className="flex items-center gap-3">
            <select
              className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
            >
              {MODELS.map((model) => (
                <option key={model.id} value={model.id}>{model.name}</option>
              ))}
            </select>
            <button
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                useWebSearch
                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                  : "bg-gray-100 text-gray-500 dark:bg-gray-800"
              }`}
              onClick={() => setUseWebSearch(!useWebSearch)}
            >
              <Globe className="h-3.5 w-3.5" />
              Web
            </button>
            <button
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                useDocuments
                  ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                  : "bg-gray-100 text-gray-500 dark:bg-gray-800"
              }`}
              onClick={() => setUseDocuments(!useDocuments)}
            >
              <FileText className="h-3.5 w-3.5" />
              Docs
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800">
                <Sparkles className="h-8 w-8 text-gray-400" />
              </div>
              <h2 className="mt-4 text-xl font-semibold text-gray-900 dark:text-white">
                How can I help you today?
              </h2>
              <p className="mt-2 text-sm text-gray-500">
                Ask me anything. I can search the web, analyze your documents, and more.
              </p>
              <div className="mt-6 grid grid-cols-2 gap-3">
                {[
                  "Summarize my latest document",
                  "Search for recent AI news",
                  "Analyze document trends",
                  "Help me write a report",
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    className="rounded-lg border border-gray-200 p-3 text-left text-sm text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
                    onClick={() => {
                      setInput(suggestion);
                    }}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((message, index) => (
                <div key={index} className="animate-fade-in">
                  <div className="flex gap-4">
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback className={message.role === "assistant" ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900" : "bg-gray-200"}>
                        {message.role === "assistant" ? "AI" : session?.user?.name?.[0] || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-2">
                      <p className="text-sm font-medium text-gray-500">
                        {message.role === "assistant" ? "DocuFlow AI" : session?.user?.name || "You"}
                      </p>
                      <div className="prose prose-sm max-w-none text-gray-900 dark:text-gray-100">
                        <p className="whitespace-pre-wrap">{message.content}</p>
                      </div>
                      {message.sources && message.sources.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-2">
                          <span className="text-xs font-medium text-gray-400">Sources:</span>
                          {message.sources.map((source, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {source.startsWith("http") ? (
                                <a href={source} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1">
                                  <ExternalLink className="h-3 w-3" />
                                  {new URL(source).hostname}
                                </a>
                              ) : (
                                source
                              )}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex gap-4">
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className="bg-gray-900 text-white dark:bg-white dark:text-gray-900">AI</AvatarFallback>
                  </Avatar>
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                    <span className="text-sm text-gray-400">Thinking...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-gray-200 px-6 py-4 dark:border-gray-800">
          <div className="relative flex items-end gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0"
              onClick={openFileDialog}
              disabled={uploadingFile}
            >
              {uploadingFile ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Upload className="h-5 w-5" />
              )}
            </Button>
            <Textarea
              placeholder="Ask anything... (Shift+Enter for new line)"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="min-h-[44px] max-h-32 resize-none"
              rows={1}
            />
            <Button
              size="icon"
              className="shrink-0"
              onClick={sendMessage}
              disabled={!input.trim() || loading}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="mt-2 text-center text-xs text-gray-400">
            Powered by Groq AI + Firecrawl. AI can make mistakes - verify important information.
          </p>
        </div>
      </div>
    </div>
  );
}
