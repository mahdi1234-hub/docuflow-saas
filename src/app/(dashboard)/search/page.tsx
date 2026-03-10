"use client";

import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Search as SearchIcon, FileText, FolderKanban, MessageSquare, Loader2 } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface SearchResults {
  documents?: Array<{ id: string; title: string; description: string | null; createdAt: string; status: string }>;
  projects?: Array<{ id: string; name: string; description: string | null; createdAt: string; status: string }>;
  conversations?: Array<{ id: string; title: string; updatedAt: string }>;
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults>({});
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const search = async (q: string) => {
    if (!q.trim()) return;
    setLoading(true);
    setSearched(true);

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data);
      }
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      search(query);
    }
  };

  const totalResults =
    (results.documents?.length || 0) +
    (results.projects?.length || 0) +
    (results.conversations?.length || 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2">
        <SearchIcon className="h-5 w-5 text-gray-500" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Search</h1>
      </div>

      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
        <Input
          placeholder="Search documents, projects, conversations..."
          className="h-12 pl-10 text-lg"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
        />
      </div>

      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      )}

      {searched && !loading && (
        <>
          <p className="text-sm text-gray-500">
            {totalResults} result{totalResults !== 1 ? "s" : ""} found
          </p>

          <Tabs defaultValue="all">
            <TabsList>
              <TabsTrigger value="all">All ({totalResults})</TabsTrigger>
              <TabsTrigger value="documents">Documents ({results.documents?.length || 0})</TabsTrigger>
              <TabsTrigger value="projects">Projects ({results.projects?.length || 0})</TabsTrigger>
              <TabsTrigger value="conversations">Chats ({results.conversations?.length || 0})</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-3">
              {results.documents?.map((doc) => (
                <Card key={doc.id} className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900">
                  <CardContent className="flex items-center gap-4 p-4">
                    <FileText className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{doc.title}</p>
                      <p className="text-xs text-gray-500">{formatDate(doc.createdAt)}</p>
                    </div>
                    <Badge variant="secondary" className="ml-auto">Document</Badge>
                  </CardContent>
                </Card>
              ))}
              {results.projects?.map((proj) => (
                <Card key={proj.id} className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900">
                  <CardContent className="flex items-center gap-4 p-4">
                    <FolderKanban className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{proj.name}</p>
                      <p className="text-xs text-gray-500">{formatDate(proj.createdAt)}</p>
                    </div>
                    <Badge variant="secondary" className="ml-auto">Project</Badge>
                  </CardContent>
                </Card>
              ))}
              {results.conversations?.map((conv) => (
                <Card key={conv.id} className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900">
                  <CardContent className="flex items-center gap-4 p-4">
                    <MessageSquare className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{conv.title}</p>
                      <p className="text-xs text-gray-500">{formatDate(conv.updatedAt)}</p>
                    </div>
                    <Badge variant="secondary" className="ml-auto">Conversation</Badge>
                  </CardContent>
                </Card>
              ))}
              {totalResults === 0 && (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <SearchIcon className="h-12 w-12 text-gray-300" />
                    <p className="mt-4 text-sm text-gray-500">No results found for &quot;{query}&quot;</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="documents" className="space-y-3">
              {results.documents?.map((doc) => (
                <Card key={doc.id} className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900">
                  <CardContent className="flex items-center gap-4 p-4">
                    <FileText className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{doc.title}</p>
                      {doc.description && <p className="text-xs text-gray-500">{doc.description}</p>}
                      <p className="text-xs text-gray-400">{formatDate(doc.createdAt)}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="projects" className="space-y-3">
              {results.projects?.map((proj) => (
                <Card key={proj.id} className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900">
                  <CardContent className="flex items-center gap-4 p-4">
                    <FolderKanban className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{proj.name}</p>
                      {proj.description && <p className="text-xs text-gray-500">{proj.description}</p>}
                      <p className="text-xs text-gray-400">{formatDate(proj.createdAt)}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="conversations" className="space-y-3">
              {results.conversations?.map((conv) => (
                <Card key={conv.id} className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900">
                  <CardContent className="flex items-center gap-4 p-4">
                    <MessageSquare className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{conv.title}</p>
                      <p className="text-xs text-gray-400">{formatDate(conv.updatedAt)}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
