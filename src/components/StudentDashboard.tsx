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
import Image from "next/image"; // Add this import for the logo

interface StudentDashboardProps {
  user: User;
}

const StudentDashboard = ({ user }: StudentDashboardProps) => {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { logout } = useFirebaseAuth();
  const { toast } = useToast();

  const loadSubmissions = async () => {
    if (!user?.uid) {
      console.log('No user ID available');
      setLoading(false);
      return;
    }
    
    try {
      console.log('Starting to load submissions for user:', user.uid);
      setLoading(true);
      
      const userSubmissions = await submissionService.getUserSubmissions(user.uid);
      console.log('Successfully loaded submissions:', userSubmissions);
      
      setSubmissions(userSubmissions);
      
      toast({
        title: "Data Loaded",
        description: `Found ${userSubmissions.length} submissions`,
      });
    } catch (error) {
      console.error('Error loading submissions:', error);
      toast({
        title: "Error",
        description: "Failed to load submissions. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('User changed, loading submissions...');
    loadSubmissions();
  }, [user?.uid]);

  const handleSubmission = async (submissionData: any) => {
    if (!user?.uid) {
      throw new Error('User not authenticated');
    }

    console.log('Handling new submission:', submissionData);
    
    const newSubmission = {
      userId: user.uid,
      userEmail: user.email || '',
      userName: user.displayName || 'Unknown User',
      title: submissionData.title,
      description: submissionData.description || '',
      code: submissionData.code,
      language: submissionData.language,
      type: submissionData.type as 'classwork' | 'homework',
      status: "submitted"
    };
    
    try {
      console.log('Adding submission to Firebase:', newSubmission);
      await submissionService.addSubmission(newSubmission);
      console.log('Submission added successfully');
      
      toast({
        title: "Success",
        description: "Submission added successfully!",
      });
      
      // Reload submissions to show the new one
      console.log('Reloading submissions...');
      await loadSubmissions();
    } catch (error) {
      console.error('Error submitting:', error);
      throw error;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 relative">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-64 h-64 bg-gradient-to-br from-blue-200/20 to-indigo-200/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-gradient-to-br from-purple-200/20 to-pink-200/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      {/* Header */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-white/20 shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16 lg:h-18">
            {/* Logo Section - Updated with actual logo */}
            <div className="flex items-center gap-2 sm:gap-4">
              {/* Logo Image */}
              <div className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center">
                <img 
                  src="/v2v.png" 
                  alt="V2V Logo" 
                  className="w-8 h-8 sm:w-10 sm:h-10 object-contain"
                />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg sm:text-xl font-bold text-gray-900">V2V Edtech LLP</h1>
                <p className="text-xs sm:text-sm text-gray-600">Student Portal</p>
              </div>
              <div className="sm:hidden">
                <h1 className="text-base font-bold text-gray-900">V2V Portal</h1>
              </div>
            </div>
            
            {/* Desktop User Info */}
            <div className="hidden md:flex items-center gap-4">
              <div className="flex items-center gap-3">
                <Avatar className="w-8 h-8 sm:w-9 sm:h-9 ring-2 ring-blue-100">
                  <AvatarImage src={user.photoURL || ''} alt={user.displayName || ''} />
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-500 text-white font-semibold">
                    {user.displayName?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{user.displayName}</p>
                  <p className="text-xs text-gray-600">{user.email}</p>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={logout}
                className="text-gray-600 hover:text-gray-900 border-gray-200 hover:border-gray-300 bg-white/50 backdrop-blur-sm hover:bg-white/80 transition-all duration-200"
              >
                Logout
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden flex items-center gap-2">
              <Avatar className="w-8 h-8 ring-2 ring-blue-100">
                <AvatarImage src={user.photoURL || ''} alt={user.displayName || ''} />
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-500 text-white font-semibold text-sm">
                  {user.displayName?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </Button>
            </div>
          </div>

          {/* Mobile Menu Dropdown */}
          {mobileMenuOpen && (
            <div className="md:hidden border-t border-gray-200 bg-white/90 backdrop-blur-xl">
              <div className="p-4 space-y-3">
                <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={user.photoURL || ''} alt={user.displayName || ''} />
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-500 text-white font-semibold">
                      {user.displayName?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-gray-900">{user.displayName}</p>
                    <p className="text-sm text-gray-600">{user.email}</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  onClick={logout}
                  className="w-full justify-center"
                >
                  Logout
                </Button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Welcome Section */}
        <div className="mb-6 sm:mb-8">
          <Card className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white border-0 shadow-2xl overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/90 via-indigo-600/90 to-purple-600/90"></div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
            <CardHeader className="relative z-10 p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="text-xl sm:text-2xl lg:text-3xl font-bold">
                    Welcome back, {user.displayName?.split(' ')[0]}! 👋
                  </CardTitle>
                  <CardDescription className="text-blue-100 mt-2 text-sm sm:text-base">
                    Data Analysis Internship • 3 Months Program
                  </CardDescription>
                </div>
                <Badge variant="secondary" className="bg-white/20 text-white border-white/30 backdrop-blur-sm w-fit">
                  <span className="hidden sm:inline">Active Intern</span>
                  <span className="sm:hidden">Active</span>
                </Badge>
              </div>
            </CardHeader>
          </Card>
        </div>

        {/* Stats Cards - Simplified for mobile */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <Card className="bg-white/70 backdrop-blur-xl border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <CardContent className="p-3 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Total Submissions</p>
                  <p className="text-xl sm:text-3xl font-bold text-gray-900 mt-1">{submissions.length}</p>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center">
                  <span className="text-blue-600 text-lg sm:text-xl">📝</span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white/70 backdrop-blur-xl border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <CardContent className="p-3 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Class Work</p>
                  <p className="text-xl sm:text-3xl font-bold text-gray-900 mt-1">
                    {submissions.filter(s => s.type === 'classwork').length}
                  </p>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-green-100 to-emerald-200 rounded-xl flex items-center justify-center">
                  <span className="text-green-600 text-lg sm:text-xl">📚</span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white/70 backdrop-blur-xl border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 sm:col-span-2 lg:col-span-1">
            <CardContent className="p-3 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Homework</p>
                  <p className="text-xl sm:text-3xl font-bold text-gray-900 mt-1">
                    {submissions.filter(s => s.type === 'homework').length}
                  </p>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl flex items-center justify-center">
                  <span className="text-purple-600 text-lg sm:text-xl">🏠</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="submit" className="space-y-4 sm:space-y-6">
          <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-1 shadow-lg">
            <TabsList className="grid w-full grid-cols-2 bg-transparent h-12 sm:h-14">
              <TabsTrigger 
                value="submit" 
                className="text-sm sm:text-lg py-2 sm:py-3 data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:text-blue-600 rounded-xl font-semibold transition-all duration-200"
              >
                <span className="hidden sm:inline">Submit Work</span>
                <span className="sm:hidden">Submit</span>
              </TabsTrigger>
              <TabsTrigger 
                value="history" 
                className="text-sm sm:text-lg py-2 sm:py-3 data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:text-blue-600 rounded-xl font-semibold transition-all duration-200"
              >
                <span className="hidden sm:inline">Submission History</span>
                <span className="sm:hidden">History</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="submit" className="mt-4 sm:mt-6">
            <Card className="bg-white/70 backdrop-blur-xl border-0 shadow-xl">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-lg sm:text-xl font-bold text-gray-900">Submit Your Work</CardTitle>
                <CardDescription className="text-sm sm:text-base text-gray-600">
                  Upload your assignments and track your progress
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0">
                <SubmissionForm onSubmit={handleSubmission} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Improved Submission History section for mobile */}
          <TabsContent value="history" className="mt-4 sm:mt-6">
            <Card className="bg-white/70 backdrop-blur-xl border-0 shadow-xl">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-lg sm:text-xl font-bold text-gray-900">Your Submissions</CardTitle>
                <CardDescription className="text-sm sm:text-base text-gray-600">
                  View and manage all your submitted work
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0 sm:p-6 sm:pt-0">
                {/* Wrap in scroll container for mobile */}
                <div className="overflow-x-auto">
                  <SubmissionHistory submissions={submissions} loading={loading} onRefresh={loadSubmissions} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default StudentDashboard;