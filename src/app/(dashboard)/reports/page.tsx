"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Plus, Download, BarChart3, Loader2 } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface Report {
  id: string;
  title: string;
  content: string;
  type: string;
  createdAt: string;
}

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Reports are generated from analytics
    setLoading(false);
  }, []);

  const generateReport = async () => {
    // This would generate a report from analytics data
    toast("Report generation coming soon!");
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-gray-500" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reports</h1>
        </div>
        <Button onClick={generateReport}>
          <Plus className="mr-2 h-4 w-4" />
          Generate Report
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : reports.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BarChart3 className="h-12 w-12 text-gray-300" />
            <p className="mt-4 text-lg font-medium text-gray-900 dark:text-white">No Reports Yet</p>
            <p className="mt-2 text-sm text-gray-500">
              Generate reports from your document analytics and AI insights
            </p>
            <Button className="mt-4" onClick={generateReport}>
              <Plus className="mr-2 h-4 w-4" />
              Generate Your First Report
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <Card key={report.id} className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-900">
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800">
                    <FileText className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{report.title}</p>
                    <p className="text-xs text-gray-500">{formatDate(report.createdAt)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{report.type}</Badge>
                  <Button variant="ghost" size="icon">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function toast(message: string) {
  // Simple toast fallback
  if (typeof window !== "undefined") {
    import("react-hot-toast").then((mod) => mod.default(message));
  }
}
