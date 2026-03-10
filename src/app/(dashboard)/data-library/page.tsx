"use client";

import React, { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Database, Upload, FileText, Loader2, Check, X } from "lucide-react";
import { useEdgeStore } from "@/lib/edgestore-client";
import toast from "react-hot-toast";

interface UploadingFile {
  file: File;
  progress: number;
  status: "uploading" | "processing" | "done" | "error";
  error?: string;
}

export default function DataLibraryPage() {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [title, setTitle] = useState("");
  const { edgestore } = useEdgeStore();

  const processFile = async (file: File, fileUrl: string) => {
    // Create document record
    const docRes = await fetch("/api/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title || file.name,
        fileUrl,
        fileType: file.type,
        fileSize: file.size,
      }),
    });

    if (!docRes.ok) throw new Error("Failed to create document record");
    const document = await docRes.json();

    // Extract text from PDF
    if (file.type === "application/pdf") {
      const formData = new FormData();
      formData.append("file", file);

      // Read file as text for non-PDF or use the content directly
      const text = await file.text();

      // Create embeddings
      const embedRes = await fetch("/api/embeddings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId: document.id,
          content: text,
          title: title || file.name,
        }),
      });

      if (!embedRes.ok) {
        console.error("Embedding failed but document was uploaded");
      }
    }

    return document;
  };

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const newFiles: UploadingFile[] = acceptedFiles.map((file) => ({
        file,
        progress: 0,
        status: "uploading" as const,
      }));

      setUploadingFiles((prev) => [...prev, ...newFiles]);

      for (let i = 0; i < acceptedFiles.length; i++) {
        const file = acceptedFiles[i];
        try {
          // Upload to EdgeStore
          const res = await edgestore.publicFiles.upload({
            file,
            onProgressChange: (progress) => {
              setUploadingFiles((prev) =>
                prev.map((f) =>
                  f.file === file ? { ...f, progress } : f
                )
              );
            },
          });

          setUploadingFiles((prev) =>
            prev.map((f) =>
              f.file === file ? { ...f, status: "processing" as const, progress: 100 } : f
            )
          );

          // Process and embed
          await processFile(file, res.url);

          setUploadingFiles((prev) =>
            prev.map((f) =>
              f.file === file ? { ...f, status: "done" as const } : f
            )
          );

          toast.success(`${file.name} uploaded and processed`);
        } catch (error) {
          console.error("Upload error:", error);
          setUploadingFiles((prev) =>
            prev.map((f) =>
              f.file === file
                ? { ...f, status: "error" as const, error: "Upload failed" }
                : f
            )
          );
          toast.error(`Failed to upload ${file.name}`);
        }
      }
    },
    [edgestore, title]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "text/plain": [".txt"],
      "application/msword": [".doc"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
    },
    maxSize: 50 * 1024 * 1024,
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Database className="h-5 w-5 text-gray-500" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Data Library</h1>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Upload documents to be processed, embedded, and stored in your vector database
      </p>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Document Title (Optional)</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Enter a title for your document"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </CardContent>
      </Card>

      {/* Upload Zone */}
      <Card>
        <CardContent className="p-6">
          <div
            {...getRootProps()}
            className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 transition-colors cursor-pointer ${
              isDragActive
                ? "border-gray-900 bg-gray-50 dark:border-white dark:bg-gray-900"
                : "border-gray-300 hover:border-gray-400 dark:border-gray-700"
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="h-10 w-10 text-gray-400" />
            <p className="mt-4 text-sm font-medium text-gray-900 dark:text-white">
              {isDragActive ? "Drop files here" : "Drag & drop files here, or click to browse"}
            </p>
            <p className="mt-2 text-xs text-gray-500">
              Supports PDF, TXT, DOC, DOCX (max 50MB)
            </p>
            <Button variant="outline" className="mt-4">
              Browse Files
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Upload Progress */}
      {uploadingFiles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Uploads</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {uploadingFiles.map((item, index) => (
              <div key={index} className="flex items-center gap-4 rounded-lg border p-3 dark:border-gray-800">
                <FileText className="h-8 w-8 text-gray-400" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{item.file.name}</p>
                    {item.status === "done" && <Check className="h-4 w-4 text-green-500" />}
                    {item.status === "error" && <X className="h-4 w-4 text-red-500" />}
                    {(item.status === "uploading" || item.status === "processing") && (
                      <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                    )}
                  </div>
                  <Progress value={item.progress} className="mt-2" />
                  <p className="mt-1 text-xs text-gray-500">
                    {item.status === "uploading" && `Uploading... ${item.progress}%`}
                    {item.status === "processing" && "Processing & embedding..."}
                    {item.status === "done" && "Complete"}
                    {item.status === "error" && (item.error || "Failed")}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
