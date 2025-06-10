import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";
import { Submission } from "@/services/submissionService";

interface SubmissionHistoryProps {
  submissions: Submission[];
  loading: boolean;
  onRefresh?: () => void;
}

const SubmissionHistory = ({ submissions, loading, onRefresh }: SubmissionHistoryProps) => {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTypeIcon = (type: string) => {
    return type === 'classwork' ? '📚' : '🏠';
  };

  const getTypeColor = (type: string) => {
    return type === 'classwork' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800';
  };

  if (loading) {
    return (
      <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-gray-900">Submission History</CardTitle>
          <CardDescription>Loading your submissions...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading submissions...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (submissions.length === 0) {
    return (
      <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-gray-900">Submission History</CardTitle>
          <CardDescription>View all your submitted work</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">📝</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No submissions yet</h3>
            <p className="text-gray-600 mb-4">Your submitted work will appear here once you start submitting assignments.</p>
            {onRefresh && (
              <Button onClick={onRefresh} variant="outline">
                Refresh
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl font-bold text-gray-900">Submission History</CardTitle>
            <CardDescription>
              View all your submitted work ({submissions.length} submissions)
            </CardDescription>
          </div>
          {onRefresh && (
            <Button onClick={onRefresh} variant="outline" size="sm">
              Refresh
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {submissions.map((submission) => (
  <div key={submission.id} className="border p-4 rounded shadow-sm bg-white/80">
    <div className="flex justify-between items-center">
      <div>
        <h3 className="font-semibold text-lg text-gray-800">{submission.title}</h3>
        <p className="text-sm text-gray-600">{submission.description}</p>
        <p className="text-xs text-gray-400 mt-1">Type: {submission.type}</p>
        <p className="text-xs text-gray-400">Status: {submission.status}</p>
      </div>
      <div>
        {submission.fileUrl && (
          <a
            href={submission.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
          >
            View File
          </a>
        )}
      </div>
    </div>
  </div>
))}

        </div>
      </CardContent>
    </Card>
  );
};

export default SubmissionHistory;
