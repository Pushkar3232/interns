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
import SubmissionForm from "@/components/SubmissionForm";
import SubmissionHistory from "@/components/SubmissionHistory";


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
      setSubmissions(userSubmissions);
      toast({ title: "Submissions loaded", description: `Found ${userSubmissions.length} items` });
    } catch (err) {
      toast({ title: "Error", description: "Could not load submissions", variant: "destructive" });
    } finally {
      setLoadingSubmissions(false);
    }
  };

  useEffect(() => {
    loadSubmissions();
  }, [user?.uid]);

  
const handleSubmit = async (data: any) => {
  if (!data.file) {
    toast({ title: "File Missing", description: "Please upload a file", variant: "destructive" });
    return;
  }

  try {
    // ✅ Use your real OAuth client ID here
  const accessToken = await requestDriveAccessToken("231620518414-0p9kh2bhr3fl7shtitjpvmuerbmo6mvo.apps.googleusercontent.com");
    

    const fileUrl = await uploadFileToDrive(data.file, accessToken);
    console.log("✅ File uploaded to Drive:", fileUrl);

    const newSubmission = {
      userId: user.uid,
      userEmail: user.email || "",
      userName: profile?.name || user.displayName || "Unknown",
      title: data.title,
      description: data.description || "",
      fileUrl: fileUrl,
      type: data.type || "homework",
      status: "submitted",
    };

    console.log("🔥 SUBMITTING TO FIRESTORE:", newSubmission);

    await submissionService.addSubmission(newSubmission);
    toast({ title: "Success", description: "Submission uploaded!" });
    await loadSubmissions();
  } catch (error) {
    toast({
      title: "Error",
      description: "Failed to submit. Check console logs.",
      variant: "destructive",
    });
    console.error("❌ Submission failed:", error);
  }
};



  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100 p-4 sm:p-6 lg:p-8">
      {/* Top Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Student Dashboard</h1>
          <p className="text-sm text-gray-600">Welcome to your internship portal</p>
        </div>
        <Button variant="outline" onClick={logout}>Logout</Button>
      </div>

      {/* Profile Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-xl">👤 Profile</CardTitle>
          <CardDescription>Details from your registration</CardDescription>
        </CardHeader>
        <CardContent>
          {profileLoading ? (
            <p className="text-gray-500">Loading profile...</p>
          ) : profile ? (
            <div className="grid sm:grid-cols-2 gap-4">
              <p><strong>Name:</strong> {profile.name}</p>
              <p><strong>Email:</strong> {user.email}</p>
              <p><strong>College:</strong> {profile.college}</p>
              <p><strong>Course:</strong> {profile.course}</p>
            </div>
          ) : (
            <p className="text-red-500">Failed to load profile</p>
          )}
        </CardContent>
      </Card>

      {/* Stats Section */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <p className="text-gray-600 text-sm">Total Submissions</p>
            <p className="text-2xl font-bold text-gray-900">{submissions.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-gray-600 text-sm">Homework Submitted</p>
            <p className="text-2xl font-bold text-gray-900">
              {submissions.filter(s => s.type === 'homework').length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-gray-600 text-sm">Status: </p>
            <p className="text-2xl font-bold text-green-600">Active</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="submit" className="space-y-4">
        <TabsList className="w-full grid grid-cols-2">
          <TabsTrigger value="submit">Submit Homework</TabsTrigger>
          <TabsTrigger value="history">Submission History</TabsTrigger>
        </TabsList>

        <TabsContent value="submit">
          <Card>
            <CardHeader>
              <CardTitle>Submit Your Homework</CardTitle>
              <CardDescription>Upload your code, documentation, or findings</CardDescription>
            </CardHeader>
            <CardContent>
              <SubmissionForm onSubmit={handleSubmit} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Your Submissions</CardTitle>
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
    </div>
  );
};

export default StudentDashboard;
