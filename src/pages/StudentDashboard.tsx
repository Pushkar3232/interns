import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { User } from "firebase/auth";
import { useFirebaseAuth } from "@/hooks/useFirebaseAuth";
import { useToast } from "@/hooks/use-toast";
import { submissionService, Submission } from "@/services/submissionService";
import { requestDriveAccessToken, uploadFileToDrive } from "@/services/googleDriveService";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import SubmissionForm from "@/components/SubmissionForm";
import SubmissionHistory from "@/components/SubmissionHistory";
import StudentLeaderboard from "@/components/StudentLeaderboard";

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
  History
} from "lucide-react";

interface StudentDashboardProps {
  user: User;
}

const StudentDashboard = ({ user }: StudentDashboardProps) => {
  const { logout } = useFirebaseAuth();
  const { toast } = useToast();

  const [profile, setProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(true);
  

  // Fetch user profile
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user?.uid) return;
      try {
        const docRef = doc(db, "users", user.uid);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          setProfile(snap.data());
        }
      } catch (err) {
        console.error("Error loading user profile:", err);
      } finally {
        setProfileLoading(false);
      }
    };
    fetchUserProfile();
  }, [user?.uid]);

  // Fetch submissions
  const loadSubmissions = async () => {
    if (!user?.uid) return;
    setLoadingSubmissions(true);

    try {
      const userSubmissions = await submissionService.getUserSubmissions(user.uid);
      
      console.log("📦 Loaded submissions:", userSubmissions);
      setSubmissions(userSubmissions);

      toast({ title: "Submissions loaded", description: `Found ${userSubmissions.length} items` });
    } catch (err) {
      console.error("❌ Failed to load submissions:", err);
      toast({
        title: "Error",
        description: "Could not load submissions. Are extensions blocking it?",
        variant: "destructive",
      });
    } finally {
      setLoadingSubmissions(false);
    }
  };

  useEffect(() => {
    loadSubmissions();
  }, [user?.uid]);

  const handleSubmit = async (data: any) => {
    try {
      console.log("🚀 Submission started", data);

      if (!data.file) {
        toast({ title: "No file", description: "Please upload a file", variant: "destructive" });
        return;
      }

      const clientId = "231620518414-0p9kh2bhr3fl7shtitjpvmuerbmo6mvo.apps.googleusercontent.com";
      const token = await requestDriveAccessToken(clientId);
      const fileUrl = await uploadFileToDrive(data.file, token);
      console.log("📎 File URL:", fileUrl);
      const assignmentRef = doc(db, "assignments", data.assignmentId);
      const assignmentSnap = await getDoc(assignmentRef);
      const assignment = assignmentSnap.exists() ? assignmentSnap.data() : null;
      const alreadySubmitted = await submissionService.hasSubmitted(user.uid, data.assignmentId);

    const submission = {
      userId: user.uid,
      userEmail: user.email || "",
      userName: profile?.name || user.displayName || "Unknown",
      userCollege: profile?.college || "Unknown",
      userCourse: profile?.course || "Unknown",
      fileUrl,
      assignmentId: data.assignmentId,
      title: assignment.title,
      type: assignment.type,
      description: data.description || "",
      createdAt: new Date(),
      status: "submitted"
    };
      if (alreadySubmitted) {
  toast({
    title: "Already Submitted",
    description: "You have already submitted for this assignment.",
    variant: "destructive"
  });
  return;
}

      console.log("🔥 Submitting to Firestore:", submission);
      await submissionService.addSubmission(submission);
      console.log("✅ Submission saved to Firestore");

      toast({ title: "Done", description: "Submission complete." });
      await loadSubmissions();
    } catch (error) {
      console.error("❌ Submission failed:", error);
      toast({ title: "Error", description: "Submission failed. See console.", variant: "destructive" });
    }
  };

  const completedSubmissions = submissions.filter(s => s.status === 'submitted').length;
  const pendingSubmissions = submissions.filter(s => s.status === 'pending').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
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
            ) : (
              <div className="text-center py-8">
                <p className="text-red-600 font-medium">Failed to load profile information</p>
              </div>
            )}
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

          {/* <Card className="group hover:scale-105 transition-all duration-300 border-0 bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-lg hover:shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm font-medium">Pending</p>
                  <p className="text-3xl font-bold mt-1">{pendingSubmissions}</p>
                </div>
                <div className="p-3 bg-white/20 rounded-lg">
                  <Clock className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card> */}

          <Card className="group hover:scale-105 transition-all duration-300 border-0 bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-lg hover:shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm font-medium">Status</p>
                  <div className="flex items-center mt-1">
                    <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                      Active
                    </Badge>
                  </div>
                </div>
                <div className="p-3 bg-white/20 rounded-lg">
                  <TrendingUp className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Enhanced Main Tabs */}
<Tabs defaultValue="submissions" className="space-y-6">
  {/* 🔹 Main Tabs: Submissions & Leaderboard */}
  <TabsList className="grid grid-cols-2 h-12 bg-white/70 backdrop-blur-sm shadow-lg border-0">
    <TabsTrigger
      value="submissions"
      className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white font-medium"
    >
      📝 Submissions
    </TabsTrigger>
    <TabsTrigger
      value="leaderboard"
      className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white font-medium"
    >
      🏅 Leaderboard
    </TabsTrigger>
  </TabsList>

  {/* 📂 Submissions Tab */}
  <TabsContent value="submissions">
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
                <CardTitle className="text-lg text-slate-900">Submit Homework</CardTitle>
                <CardDescription className="text-slate-600">
                  Upload your code, docs, or project work
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <SubmissionForm
              onSubmit={handleSubmit}
              userCourse={profile?.course}
              userName={profile?.name}
              userEmail={user.email || ""}
              userCollege={profile?.college}
            />
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
                    Review your past uploads
                  </CardDescription>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={loadSubmissions}
                disabled={loadingSubmissions}
                className="hover:bg-blue-50 hover:border-blue-200"
              >
                {loadingSubmissions ? (
                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <TrendingUp className="w-4 h-4 mr-2" />
                )}
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <SubmissionHistory
              submissions={submissions}
              loading={loadingSubmissions}
              onRefresh={loadSubmissions}
            />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  </TabsContent>

  {/* 🏅 Leaderboard Tab */}
  <TabsContent value="leaderboard">
    <Card className="shadow-md bg-white/80 backdrop-blur rounded-xl border-0">
      <CardHeader>
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-lg">
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
          <div>
            <CardTitle className="text-lg text-slate-900">Leaderboard</CardTitle>
            <CardDescription className="text-slate-600">
              See your rank based on submissions
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <StudentLeaderboard
          userId={user.uid}
          userCourse={profile?.course}
          userEmail={user.email}
        />
      </CardContent>
    </Card>
  </TabsContent>
</Tabs>


      </div>
    </div>
  );
};

export default StudentDashboard;
