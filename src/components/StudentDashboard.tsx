
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { User } from "firebase/auth";
import SubmissionForm from "./SubmissionForm";
import SubmissionHistory from "./SubmissionHistory";
import { useFirebaseAuth } from "@/hooks/useFirebaseAuth";
import { submissionService, Submission } from "@/services/submissionService";
import { useToast } from "@/hooks/use-toast";

interface StudentDashboardProps {
  user: User;
}

const StudentDashboard = ({ user }: StudentDashboardProps) => {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const { logout } = useFirebaseAuth();
  const { toast } = useToast();

  useEffect(() => {
    loadSubmissions();
  }, [user]);

  const loadSubmissions = async () => {
    try {
      setLoading(true);
      const userSubmissions = await submissionService.getUserSubmissions(user.uid);
      setSubmissions(userSubmissions);
    } catch (error) {
      console.error('Error loading submissions:', error);
      toast({
        title: "Error",
        description: "Failed to load submissions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmission = async (submissionData: any) => {
    try {
      const newSubmission = {
        userId: user.uid,
        userEmail: user.email || '',
        userName: user.displayName || '',
        title: submissionData.title,
        description: submissionData.description,
        code: submissionData.code,
        language: submissionData.language,
        type: submissionData.type,
        status: "submitted"
      };
      
      await submissionService.addSubmission(newSubmission);
      await loadSubmissions(); // Refresh the submissions list
      
      toast({
        title: "Submission Successful",
        description: `Your ${submissionData.type} has been submitted successfully!`,
      });
    } catch (error) {
      console.error('Error submitting:', error);
      toast({
        title: "Submission Failed",
        description: "Failed to submit your work. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <span className="text-lg font-bold text-white">V2V</span>
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">V2V Edtech LLP</h1>
                <p className="text-sm text-gray-600">Student Portal</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={user.photoURL || ''} alt={user.displayName || ''} />
                  <AvatarFallback>{user.displayName?.charAt(0) || 'U'}</AvatarFallback>
                </Avatar>
                <div className="hidden sm:block">
                  <p className="text-sm font-medium text-gray-900">{user.displayName}</p>
                  <p className="text-xs text-gray-600">{user.email}</p>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={logout}
                className="text-gray-600 hover:text-gray-900"
              >
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <Card className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-0 shadow-xl">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl font-bold">Welcome back, {user.displayName}!</CardTitle>
                  <CardDescription className="text-blue-100 mt-2">
                    Data Analysis Internship • 3 Months Program
                  </CardDescription>
                </div>
                <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                  Active Intern
                </Badge>
              </div>
            </CardHeader>
          </Card>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Submissions</p>
                  <p className="text-3xl font-bold text-gray-900">{submissions.length}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <span className="text-blue-600 text-xl">📝</span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Class Work</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {submissions.filter(s => s.type === 'classwork').length}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <span className="text-green-600 text-xl">📚</span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Homework</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {submissions.filter(s => s.type === 'homework').length}
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <span className="text-purple-600 text-xl">🏠</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="submit" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 bg-white/60 backdrop-blur-sm">
            <TabsTrigger value="submit" className="text-lg py-3">Submit Work</TabsTrigger>
            <TabsTrigger value="history" className="text-lg py-3">Submission History</TabsTrigger>
          </TabsList>

          <TabsContent value="submit">
            <SubmissionForm onSubmit={handleSubmission} />
          </TabsContent>

          <TabsContent value="history">
            <SubmissionHistory submissions={submissions} loading={loading} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default StudentDashboard;
