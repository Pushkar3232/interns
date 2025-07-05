import { useEffect, useState } from "react";
import { doc, getDoc, Timestamp, enableIndexedDbPersistence } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { User } from "firebase/auth";
import { useFirebaseAuth } from "@/hooks/useFirebaseAuth";
import { useToast } from "@/hooks/use-toast";
import {
  getUserSubmissions,
  saveSubmission,
  hasSubmitted,
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

// enable firestore offline caching
enableIndexedDbPersistence(db).catch((err) => {
  console.warn("IndexedDB persistence could not be enabled:", err);
});

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
const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [submissionsError, setSubmissionsError] = useState<string | null>(null);
  const [submissionsFetched, setSubmissionsFetched] = useState(false);

  // const [readCount, setReadCount] = useState(0);
  // const [cacheHits, setCacheHits] = useState(0);

  const [lastVisible, setLastVisible] = useState<Date | null>(null); // for pagination
const [hasMore, setHasMore] = useState(true); // ✅ ADD THIS LINE

  const GOOGLE_CLIENT_ID = "231620518414-0p9kh2bhr3fl7shtitjpvmuerbmo6mvo.apps.googleusercontent.com";

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user?.uid) return;

      setProfileLoading(true);
      setProfileError(null);

      const cached = localStorage.getItem(`profile-${user.uid}`);
      if (cached) {
        console.log("✅ loaded profile from localStorage");
        setProfile(JSON.parse(cached));
        // setCacheHits((prev) => prev + 1);
        setProfileLoading(false);
        return;
      }

      try {
        const courses = [
          "Web Development",
          "Data Analysis",
          "Mobile Application Development",
        ];

        console.log(`🔍 checking courses for user ${user.uid}`, courses);

        try {
  const docRef = doc(db, "users", user.uid);
  const snap = await getDoc(docRef);

  if (!snap.exists()) {
    throw new Error("Profile not found");
  }

  const profileData = snap.data();
  setProfile(profileData);
  localStorage.setItem(`profile-${user.uid}`, JSON.stringify(profileData));
} catch (err) {
  console.error("❌ error loading profile:", err);
  setProfileError(err instanceof Error ? err.message : "Failed to load profile");
  toast({
    title: "Profile Error",
    description: "Failed to load your profile. Please refresh the page.",
    variant: "destructive",
  });
} finally {
  setProfileLoading(false);
}



        throw new Error("Profile not found in any course folder");
      } catch (err) {
        console.error("❌ error loading profile:", err);
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

  const PAGE_SIZE = 3;

const loadSubmissions = async (reset = false) => {
  if (!user?.uid || !profile?.course) return;

  setLoadingSubmissions(true);
  setSubmissionsError(null);

  try {
    const { submissions: submissionsFetched, lastDoc: newLastDoc } =
      await getUserSubmissions(
        user.uid,
        profile.course,
        PAGE_SIZE,
        reset ? undefined : lastDoc
      );

    if (reset) {
      setSubmissions(submissionsFetched);
    } else {
      setSubmissions((prev) => [...prev, ...submissionsFetched]);
    }

    // 🧠 Very important
    if (submissionsFetched.length < PAGE_SIZE) {
      setHasMore(false);
    } else {
      setHasMore(true);
    }

    setLastDoc(newLastDoc);
    setSubmissionsFetched(true);
  } catch (err) {
    console.error("❌ Failed to load submissions:", err);
    setSubmissionsError(err.message || "Failed to load submissions");
  } finally {
    setLoadingSubmissions(false);
  }
};



  useEffect(() => {
    if (user?.uid && profile?.course && !submissionsFetched && !loadingSubmissions) {
      console.log("🚀 auto-loading submissions for", profile.course);
      loadSubmissions();
    }
  }, [user?.uid, profile?.course, submissionsFetched, loadingSubmissions]);

  async function handleSubmit(data: { assignmentId: string; description: string; file: File }) {
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
    console.log("🚀 starting submission process");

    const token = await requestDriveAccessToken(GOOGLE_CLIENT_ID);
    const fileUrl = await uploadFileToDrive(file, token); // Drive upload step
    console.log("✅ file uploaded to drive:", fileUrl);

    const assignmentRef = doc(db, "assignments", profile.course, "items", assignmentId);
    const assignmentSnap = await getDoc(assignmentRef);

    if (!assignmentSnap.exists()) {
      toast({
        title: "Assignment not found",
        description: "Please refresh and try again",
        variant: "destructive",
      });
      return;
    }

    const assignmentData = assignmentSnap.data();
    let assignmentCreatedAt: Timestamp;
    if (assignmentData.createdAt instanceof Timestamp) {
      assignmentCreatedAt = assignmentData.createdAt;
    } else if (assignmentData.createdAt instanceof Date) {
      assignmentCreatedAt = Timestamp.fromDate(assignmentData.createdAt);
    } else {
      assignmentCreatedAt = Timestamp.now();
    }

    const already = await hasSubmitted(user.uid, profile.course, assignmentId, assignmentCreatedAt);
    if (already) {
      toast({
        title: "Already Submitted",
        description: "You've already submitted this assignment.",
        variant: "destructive",
      });
      return;
    }

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

    await saveSubmission(submission);
    toast({
      title: "Success! 🎉",
      description: "Your assignment has been submitted successfully.",
    });

    // refresh after submit
    localStorage.removeItem(`submissions-${user.uid}-${profile.course}`);
    setSubmissionsFetched(false);
    await loadSubmissions();
  } catch (error: any) {
    console.error("❌ submission error", error);

    toast({
      title: "Submission Failed",
      description: error.message || "Something went wrong. Please try again.",
      variant: "destructive",
    });

    // 📩 Send error to your WhatsApp
    const phoneNumber = "919552556876"; // replace with your WhatsApp number

    const studentName = profile?.name || "Unknown";
    const collegeName = profile?.college || "Unknown";
    const assignmentIdText = data.assignmentId || "Unknown";
    const fileName = data.file?.name || "No file";
    const userAgent = navigator.userAgent;

    const message = encodeURIComponent(
      `🚨 *Drive Upload Error Report* 🚨\n` +
      `👤 *Student:* ${studentName}\n` +
      `🏫 *College:* ${collegeName}\n` +
      `📄 *Assignment ID:* ${assignmentIdText}\n` +
      `🗂️ *File:* ${fileName}\n\n` +
      `📱 *Device Info:*\n${userAgent}\n\n` +
      `❌ *Error:*\n${error?.message || error.toString()}`
    );

    // Open WhatsApp with prefilled message
    window.open(`https://wa.me/${phoneNumber}?text=${message}`, "_blank");
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
        {/* <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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
        </div> */}

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
            {/* <TabsTrigger
              value="leaderboard"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white font-medium"
            >
              🏅 Leaderboard
            </TabsTrigger> */}
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
                      
                    </div>
                  </CardHeader>
                  <CardContent>
                    <SubmissionHistory
  submissions={submissions}
  loading={loadingSubmissions}
  hasMore={hasMore}
  onLoadMore={() => loadSubmissions(false)}
  onRefresh={() => {
  setSubmissions([]);
  setLastDoc(null);
  setHasMore(true);
  setSubmissionsFetched(false);
  loadSubmissions(true);
}}

/>


                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* 🏅 Leaderboard Tab
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
                {profile?.course ? (
                  <StudentLeaderboard
                    userId={user.uid}
                    userCourse={profile.course}
                    userEmail={user.email}
                  />
                ) : (
                  <div className="text-center py-8">
                    <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4 animate-spin" />
                    <p className="text-gray-600">Loading course information...</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent> */}
        </Tabs>
        <a
  href="https://wa.me/919552556876?text=Hi%20there%2C%20I%20am%20facing%20an%20issue%20with%20the%20application..."
  target="_blank"
  rel="noopener noreferrer"
  className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-full bg-green-500 hover:bg-green-600 text-white text-sm md:text-base font-semibold shadow-xl transition-all duration-300 ease-in-out backdrop-blur-sm"
>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="w-5 h-5 md:w-6 md:h-6"
    viewBox="0 0 24 24"
    fill="currentColor"
  >
    <path d="M20.52 3.48A11.84 11.84 0 0 0 12 0C5.4 0 0 5.4 0 12a11.9 11.9 0 0 0 1.6 5.88L0 24l6.4-1.68A11.86 11.86 0 0 0 12 24c6.6 0 12-5.4 12-12 0-3.2-1.24-6.2-3.48-8.52zM12 22c-1.9 0-3.74-.52-5.36-1.5l-.4-.24-3.8 1 1-3.64-.24-.4A10 10 0 1 1 22 12c0 5.52-4.48 10-10 10zm5.72-7.72c-.28-.14-1.64-.8-1.89-.9-.25-.1-.43-.14-.61.14s-.7.91-.86 1.1c-.16.18-.31.2-.58.07-1.02-.51-3.17-2.16-3.66-3.66-.08-.23-.01-.4.17-.58.17-.17.4-.45.6-.68.2-.23.27-.4.4-.66.13-.26.07-.49 0-.68-.07-.19-.62-1.47-.86-2.01s-.47-.49-.64-.5h-.55c-.18 0-.47.07-.72.33-.25.26-.95.94-.95 2.3s.98 2.67 1.11 2.85c.14.18 1.93 3.1 4.69 4.34.66.29 1.17.46 1.57.59.66.21 1.26.18 1.75.11.54-.08 1.65-.68 1.9-1.32.23-.61.23-1.12.16-1.23-.08-.11-.28-.19-.56-.33z" />
  </svg>
  <span className="hidden sm:inline">Chat on WhatsApp</span>
</a>


      </div>
    </div>
  );
};

export default StudentDashboard;