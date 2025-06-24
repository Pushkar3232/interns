import { useEffect, useState } from "react";
import { doc, getDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";  
import { User } from "firebase/auth";
import { useFirebaseAuth } from "@/hooks/useFirebaseAuth";
import { useToast } from "@/hooks/use-toast";
import {
  getUserSubmissions,
  saveSubmission,
  hasSubmitted
} from "@/services/submissionService";

import { requestDriveAccessToken, uploadFileToDrive } from "@/services/googleDriveService";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import SubmissionForm from "@/components/SubmissionForm";
import SubmissionHistory from "@/components/SubmissionHistory";
import { Analytics } from "@vercel/analytics/react";

import {
  User as UserIcon,
  LogOut,
  FileText,
  BookOpen,
  TrendingUp,
  Calendar,
  GraduationCap,
  Mail,
  School,
  CheckCircle2,
  Clock,
  Upload,
  History,
  RefreshCw,
  AlertCircle,
} from "lucide-react";

interface StudentDashboardProps {
  user: User;
}

interface Submission {
  id: string;
  assignmentId: string;
  assignmentCreatedAt: Date | null;
  title: string;
  type: string;
  description: string;
  fileUrl: string;
  userCollege: string;
  userCourse: string;
  userEmail: string;
  userId: string;
  userName: string;
  createdAt: Date | null;
  status: "submitted" | "pending";
}

const StudentDashboard = ({ user }: StudentDashboardProps) => {
  const { logout } = useFirebaseAuth();
  const { toast } = useToast();

  const [profile, setProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [submissionsError, setSubmissionsError] = useState<string | null>(null);
  const [submissionsFetched, setSubmissionsFetched] = useState(false);

  const GOOGLE_CLIENT_ID = "231620518414-0p9kh2bhr3fl7shtitjpvmuerbmo6mvo.apps.googleusercontent.com";

  // Fetch user profile (by scanning known course folders)
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user?.uid) return;
      
      setProfileLoading(true);
      setProfileError(null);
      
      try {
        const courses = [
          "Web Development",
          "Data Analysis", 
          "Mobile Application Development"
        ];

        console.log(`🔍 Searching for user ${user.uid} in courses:`, courses);

        for (const course of courses) {
          try {
            const docRef = doc(db, "users", course, "students", user.uid);
            console.log(`🔍 Checking path: ${docRef.path}`);
            
            const snap = await getDoc(docRef);
            if (snap.exists()) {
              const data = snap.data();
              console.log(`✅ Found user profile in ${course}:`, data);
              setProfile({ ...data, course });
              setProfileLoading(false);
              return;
            } else {
              console.log(`❌ User not found in ${course}`);
            }
          } catch (courseError) {
            console.warn(`⚠️ Error checking course ${course}:`, courseError);
          }
        }

        throw new Error("User profile not found in any course folder");
      } catch (err) {
        console.error("❌ Error loading user profile:", err);
        setProfileError(err instanceof Error ? err.message : "Failed to load profile");
        toast({
          title: "Profile Error",
          description: "Failed to load your profile. Please refresh the page.",
          variant: "destructive",
        });
      } finally {
        setProfileLoading(false);
      }
    };

    fetchUserProfile();
  }, [user?.uid, toast]);

  // Load submissions when profile is available
  const loadSubmissions = async () => {
    if (!user?.uid || !profile?.course) {
      console.log("⚠️ Cannot load submissions - missing user ID or course");
      return;
    }

    setLoadingSubmissions(true);
    setSubmissionsError(null);

    try {
      console.log(`🔍 Loading submissions for user ${user.uid} in course ${profile.course}`);
      
      const userSubmissions = await getUserSubmissions(user.uid, profile.course);
      
      console.log(`✅ Loaded ${userSubmissions.length} submissions`);
      setSubmissions(userSubmissions);
      setSubmissionsFetched(true);
      
      if (userSubmissions.length > 0) {
        toast({
          title: "Submissions Loaded",
          description: `Found ${userSubmissions.length} submission${userSubmissions.length !== 1 ? 's' : ''}`,
        });
      }
    } catch (err) {
      console.error("❌ Failed to load submissions:", err);
      setSubmissionsError(err instanceof Error ? err.message : "Failed to load submissions");
      toast({
        title: "Error Loading Submissions",
        description: "Failed to load your submissions. Please try refreshing.",
        variant: "destructive",
      });
    } finally {
      setLoadingSubmissions(false);
    }
  };

  // Auto-load submissions when profile is ready
  useEffect(() => {
    if (user?.uid && profile?.course && !submissionsFetched && !loadingSubmissions) {
      console.log("🚀 Auto-loading submissions for:", profile.course);
      loadSubmissions();
    }
  }, [user?.uid, profile?.course, submissionsFetched, loadingSubmissions]);

  async function handleSubmit(data: {
    assignmentId: string;
    description: string;
    file: File;
  }) {
    const { assignmentId, description, file } = data;

    if (!file) {
      toast({
        title: "No file",
        description: "Please upload a file",
        variant: "destructive",
      });
      return;
    }

    if (!profile?.course) {
      toast({
        title: "Error",
        description: "Course information not found",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log("🚀 Starting submission process...");
      
      // Step 1: Upload the file to Google Drive
      const token = await requestDriveAccessToken(GOOGLE_CLIENT_ID);
      const fileUrl = await uploadFileToDrive(file, token);
      console.log("✅ File uploaded to Drive:", fileUrl);

      // Step 2: Fetch assignment data using the NEW course-based structure
      const assignmentRef = doc(db, "assignments", profile.course, "items", assignmentId);
      const assignmentSnap = await getDoc(assignmentRef);

      if (!assignmentSnap.exists()) {
        console.error("❌ Assignment not found at path:", assignmentRef.path);
        toast({
          title: "Error",
          description: "Assignment not found. Please refresh and try again.",
          variant: "destructive",
        });
        return;
      }

      const assignmentData = assignmentSnap.data();
      console.log("📄 Assignment data:", assignmentData);

      // Handle different timestamp formats
      let assignmentCreatedAt: Timestamp;
      if (assignmentData.createdAt instanceof Timestamp) {
        assignmentCreatedAt = assignmentData.createdAt;
      } else if (assignmentData.createdAt instanceof Date) {
        assignmentCreatedAt = Timestamp.fromDate(assignmentData.createdAt);
      } else {
        console.warn("⚠️ Assignment createdAt missing, using current timestamp");
        assignmentCreatedAt = Timestamp.now();
      }

      // Step 3: Check if user already submitted
      const already = await hasSubmitted(
        user.uid,
        profile.course,
        assignmentId,
        assignmentCreatedAt
      );

      if (already) {
        toast({
          title: "Already Submitted",
          description: "You've already submitted this assignment.",
          variant: "destructive",
        });
        return;
      }

      // Step 4: Build submission object
      const submission = {
        assignmentId,
        assignmentCreatedAt,
        title: assignmentData.title || "Untitled Assignment",
        type: assignmentData.type || "Unknown",
        description: description || "",
        fileUrl,
        userCollege: profile.college || "Unknown College",
        userCourse: profile.course,
        userEmail: user.email!,
        userId: user.uid,
        userName: profile.name || "Unknown User",
      };

      console.log("📦 Submission object:", submission);

      // Step 5: Save the submission
      await saveSubmission(submission);

      toast({ 
        title: "Success! 🎉", 
        description: "Your assignment has been submitted successfully." 
      });
      
      console.log("✅ Submission completed successfully");
      
      // Step 6: Refresh submissions list
      setSubmissionsFetched(false); // Reset the flag to force reload
      await loadSubmissions();
      
    } catch (error) {
      console.error("❌ Submission error:", error);
      
      if (error.message?.includes("permissions")) {
        toast({
          title: "Permission Error",
          description: "Unable to access Google Drive. Please try again.",
          variant: "destructive",
        });
      } else if (error.message?.includes("network")) {
        toast({
          title: "Network Error", 
          description: "Please check your internet connection and try again.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Submission Failed",
          description: "Something went wrong. Please try again or contact support.",
          variant: "destructive",
        });
      }
    }
  }

  const completedSubmissions = submissions.filter((s) => s.status === "submitted").length;
  const pendingSubmissions = submissions.filter((s) => s.status === "pending").length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <Analytics/>
      {/* Background decoration */}
      <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] -z-10" />
      
      <div className="relative z-10 p-4 sm:p-6 lg:p-8">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 space-y-4 sm:space-y-0">
          <div className="space-y-1">
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-slate-900 via-blue-800 to-indigo-800 bg-clip-text text-transparent">
              Student Dashboard
            </h1>
            <p className="text-slate-600 text-lg">Welcome to your internship portal</p>
          </div>
          <Button 
            variant="outline" 
            onClick={async () => {
              await logout();
              window.location.href = "/";
            }}
            className="group hover:bg-red-50 hover:border-red-200 hover:text-red-700 transition-all duration-200"
          >
            <LogOut className="w-4 h-4 mr-2 group-hover:text-red-500" />
            Logout
          </Button>
        </div>

        {/* Profile Section */}
        <Card className="mb-8 shadow-lg hover:shadow-xl transition-all duration-300 border-0 bg-white/70 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
                <UserIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl text-slate-900">Profile Information</CardTitle>
                <CardDescription className="text-slate-600">Your registration details</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {profileLoading ? (
              <div className="grid sm:grid-cols-2 gap-6">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-6 w-32" />
                  </div>
                ))}
              </div>
            ) : profileError ? (
              <div className="text-center py-8">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <p className="text-red-600 font-medium mb-2">Failed to load profile information</p>
                <p className="text-sm text-gray-600 mb-4">{profileError}</p>
                <Button 
                  onClick={() => window.location.reload()} 
                  variant="outline"
                  size="sm"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh Page
                </Button>
              </div>
            ) : profile ? (
              <div className="grid sm:grid-cols-2 gap-6">
                <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded-lg">
                  <UserIcon className="w-5 h-5 text-slate-600" />
                  <div>
                    <p className="text-sm font-medium text-slate-600">Name</p>
                    <p className="text-slate-900 font-semibold">{profile.name}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded-lg">
                  <Mail className="w-5 h-5 text-slate-600" />
                  <div>
                    <p className="text-sm font-medium text-slate-600">Email</p>
                    <p className="text-slate-900 font-semibold">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded-lg">
                  <School className="w-5 h-5 text-slate-600" />
                  <div>
                    <p className="text-sm font-medium text-slate-600">College</p>
                    <p className="text-slate-900 font-semibold">{profile.college}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded-lg">
                  <GraduationCap className="w-5 h-5 text-slate-600" />
                  <div>
                    <p className="text-sm font-medium text-slate-600">Course</p>
                    <p className="text-slate-900 font-semibold">{profile.course}</p>
                  </div>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Enhanced Stats Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="group hover:scale-105 transition-all duration-300 border-0 bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg hover:shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">Total Submissions</p>
                  <p className="text-3xl font-bold mt-1">{submissions.length}</p>
                </div>
                <div className="p-3 bg-white/20 rounded-lg">
                  <FileText className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="group hover:scale-105 transition-all duration-300 border-0 bg-gradient-to-br from-green-500 to-green-600 text-white shadow-lg hover:shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm font-medium">Completed</p>
                  <p className="text-3xl font-bold mt-1">{completedSubmissions}</p>
                </div>
                <div className="p-3 bg-white/20 rounded-lg">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="group hover:scale-105 transition-all duration-300 border-0 bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-lg hover:shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm font-medium">Status</p>
                  <div className="flex items-center mt-1">
                    <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                      {profile?.course ? 'Active' : 'Loading...'}
                    </Badge>
                  </div>
                </div>
                <div className="p-3 bg-white/20 rounded-lg">
                  <TrendingUp className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="group hover:scale-105 transition-all duration-300 border-0 bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-lg hover:shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm font-medium">Course</p>
                  <p className="text-lg font-bold mt-1">{profile?.course || 'Loading...'}</p>
                </div>
                <div className="p-3 bg-white/20 rounded-lg">
                  <BookOpen className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Submissions Section - Simplified without tabs */}
        <div className="space-y-6">
          <Tabs defaultValue="upload" className="space-y-4">
            <TabsList className="grid grid-cols-2 h-10 bg-white/80 backdrop-blur-md shadow border-0">
              <TabsTrigger
                value="upload"
                className="data-[state=active]:bg-blue-500 data-[state=active]:text-white text-sm font-medium"
              >
                📤 Upload
              </TabsTrigger>
              <TabsTrigger
                value="history"
                className="data-[state=active]:bg-blue-500 data-[state=active]:text-white text-sm font-medium"
              >
                📄 History
              </TabsTrigger>
            </TabsList>

            {/* 📤 Upload Tab Content */}
            <TabsContent value="upload">
              <Card className="shadow-md bg-white/80 backdrop-blur rounded-xl border-0">
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg">
                      <Upload className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg text-slate-900">Submit</CardTitle>
                      <CardDescription className="text-slate-600">
                        Upload your code, docs, or project work
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {profile?.course ? (
                    <SubmissionForm
                      onSubmit={handleSubmit}
                      userCourse={profile.course}
                      userName={profile.name}
                      userEmail={user.email || ""}
                      userCollege={profile.college}
                    />
                  ) : (
                    <div className="text-center py-8">
                      <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4 animate-spin" />
                      <p className="text-gray-600">Loading course information...</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* 📄 History Tab Content */}
            <TabsContent value="history">
              <Card className="shadow-md bg-white/80 backdrop-blur rounded-xl border-0">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-gradient-to-br from-purple-500 to-violet-600 rounded-lg">
                        <History className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-lg text-slate-900">Submission History</CardTitle>
                        <CardDescription className="text-slate-600">
                          Review your past uploads ({submissions.length} submissions)
                        </CardDescription>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSubmissionsFetched(false);
                        loadSubmissions();
                      }}
                      disabled={loadingSubmissions}
                      className="hover:bg-blue-50 hover:border-blue-200"
                    >
                      {loadingSubmissions ? (
                        <Clock className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4 mr-2" />
                      )}
                      Refresh
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <SubmissionHistory
                    submissions={submissions}
                    loading={loadingSubmissions}
                    onRefresh={() => {
                      setSubmissionsFetched(false);
                      loadSubmissions();
                    }}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;