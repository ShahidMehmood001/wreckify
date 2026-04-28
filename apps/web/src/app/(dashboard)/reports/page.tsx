"use client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { FileText, Download, Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import type { Report } from "@/types";

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    api.get("/reports").then((r) => setReports(r.data)).finally(() => setLoading(false));
  }, []);

  async function handleDownload(report: Report) {
    const fileName = report.fileUrl.split("/").pop() ?? "report.pdf";
    setDownloading(report.id);
    try {
      const res = await api.get(`/reports/files/${fileName}`, { responseType: "blob" });
      const url = URL.createObjectURL(res.data as Blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Could not download report.");
    } finally {
      setDownloading(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Reports</h1>
        <p className="text-muted-foreground mt-1">Download your generated PDF assessment reports</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Generated Reports</CardTitle>
          <CardDescription>{reports.length} report{reports.length !== 1 ? "s" : ""} available</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />)}
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-16">
              <FileText className="w-14 h-14 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-1">No reports yet</h3>
              <p className="text-muted-foreground">Complete a scan and generate a PDF report from the scan detail page.</p>
            </div>
          ) : (
            <div className="divide-y">
              {reports.map((report) => (
                <div key={report.id} className="flex items-center justify-between py-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
                      <FileText className="w-5 h-5 text-red-500" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {report.type === "insurance" ? "Insurance Report" : "Standard Report"}
                      </p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {formatDate(report.generatedAt)}
                        </span>
                        {report.fileSize && (
                          <span className="text-xs text-muted-foreground">
                            {(report.fileSize / 1024).toFixed(0)} KB
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="capitalize">{report.type}</Badge>
                    <Button size="sm" variant="outline" onClick={() => handleDownload(report)} disabled={downloading === report.id}>
                      {downloading === report.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                      Download
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
