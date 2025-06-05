
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";

interface SubmissionHistoryProps {
  submissions: any[];
}

const SubmissionHistory = ({ submissions }: SubmissionHistoryProps) => {
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());

  const toggleExpanded = (id: number) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
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
            <p className="text-gray-600">Your submitted work will appear here once you start submitting assignments.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-gray-900">Submission History</CardTitle>
        <CardDescription>
          View all your submitted work ({submissions.length} submissions)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {submissions.map((submission) => (
            <Card key={submission.id} className="border shadow-sm hover:shadow-md transition-all duration-200">
              <Collapsible>
                <CollapsibleTrigger
                  onClick={() => toggleExpanded(submission.id)}
                  className="w-full"
                >
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{getTypeIcon(submission.type)}</span>
                        <div className="text-left">
                          <CardTitle className="text-lg">{submission.title}</CardTitle>
                          <CardDescription>
                            {formatDate(submission.submittedAt)}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getTypeColor(submission.type)}>
                          {submission.type === 'classwork' ? 'Class Work' : 'Homework'}
                        </Badge>
                        <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50">
                          {submission.status}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="p-1 h-8 w-8"
                        >
                          <span className={`transform transition-transform duration-200 ${
                            expandedItems.has(submission.id) ? 'rotate-180' : ''
                          }`}>
                            ▼
                          </span>
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <div className="space-y-4">
                      {submission.description && (
                        <div>
                          <h4 className="font-semibold text-sm text-gray-700 mb-2">Description:</h4>
                          <p className="text-gray-600 text-sm bg-gray-50 p-3 rounded-lg">
                            {submission.description}
                          </p>
                        </div>
                      )}
                      
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold text-sm text-gray-700">Code:</h4>
                          <Badge variant="outline" className="text-xs">
                            {submission.language}
                          </Badge>
                        </div>
                        <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                          <code>{submission.code}</code>
                        </pre>
                      </div>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default SubmissionHistory;
