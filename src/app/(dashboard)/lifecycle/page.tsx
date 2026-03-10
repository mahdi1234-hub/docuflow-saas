"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, FileText, Clock, CheckCircle, AlertCircle, ArrowRight } from "lucide-react";

interface Document {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

const stages = [
  { name: "Upload", icon: FileText, description: "Document uploaded to storage" },
  { name: "Processing", icon: RefreshCw, description: "Extracting text and metadata" },
  { name: "Embedding", icon: Clock, description: "Creating vector embeddings" },
  { name: "Ready", icon: CheckCircle, description: "Available for search and analysis" },
];

export default function LifecyclePage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const res = await fetch("/api/documents");
      if (res.ok) {
        const data = await res.json();
        setDocuments(data);
      }
    } catch (error) {
      console.error("Failed to fetch documents:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStageIndex = (status: string) => {
    switch (status) {
      case "processing": return 1;
      case "embedding": return 2;
      case "ready": return 3;
      default: return 0;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2">
        <RefreshCw className="h-5 w-5 text-gray-500" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Lifecycle</h1>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Track the processing pipeline of your documents
      </p>

      {/* Pipeline Stages */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Document Processing Pipeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            {stages.map((stage, index) => (
              <React.Fragment key={stage.name}>
                <div className="flex flex-col items-center text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                    <stage.icon className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                  </div>
                  <p className="mt-2 text-sm font-medium text-gray-900 dark:text-white">{stage.name}</p>
                  <p className="mt-1 text-xs text-gray-500">{stage.description}</p>
                </div>
                {index < stages.length - 1 && (
                  <ArrowRight className="h-5 w-5 text-gray-300 dark:text-gray-600" />
                )}
              </React.Fragment>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Document Status List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Document Status</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : documents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <FileText className="h-10 w-10 text-gray-300" />
              <p className="mt-2 text-sm text-gray-500">No documents in pipeline</p>
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => {
                const stageIndex = getStageIndex(doc.status);
                return (
                  <div key={doc.id} className="flex items-center justify-between rounded-lg border p-3 dark:border-gray-800">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-gray-500" />
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{doc.title}</p>
                        <p className="text-xs text-gray-500">Stage {stageIndex + 1} of {stages.length}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex gap-1">
                        {stages.map((_, i) => (
                          <div
                            key={i}
                            className={`h-2 w-8 rounded-full ${
                              i <= stageIndex ? "bg-green-500" : "bg-gray-200 dark:bg-gray-700"
                            }`}
                          />
                        ))}
                      </div>
                      <Badge variant={doc.status === "ready" ? "success" : "warning"}>
                        {doc.status}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
