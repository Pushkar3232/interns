// src/pages/AdminDashboard.tsx
import { useEffect, useState } from "react";
import { collectionGroup, getDocs, collection, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { AlertCircle, Users, FileText, Calendar, Code, RefreshCw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Submission {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  title: string;
  description?: string;
  code: string;
  language: string;
  type: "classwork" | "homework";
  status: string;
  submittedAt?: Date;
}

interface UserGroup {
  userId: string;
  userName: string;
  userEmail: string;
  submissions: Submission[];
  totalSubmissions: number;
  latestSubmission?: Date;
}

interface AdminStats {
  totalStudents: number;
  totalSubmissions: number;
  classworkCount: number;
  homeworkCount: number;
  recentSubmissions: number;
}

const AdminDashboard = () => {
  const [groups, setGroups] = useState<UserGroup[]>([]);
  const [stats, setStats] = useState<AdminStats>({
    totalStudents: 0,
    totalSubmissions: 0,
    classworkCount: 0,
    homeworkCount: 0,
    recentSubmissions: 0,
  });
  const [loading, setLoading] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [userInput, setUserInput] = useState({ id: "", pass: "" });
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (loggedIn) {
      fetchAndGroupSubmissions();
    }
  }, [loggedIn]);

  const fetchAndGroupSubmissions = async () => {
    setLoading(true);
    setError("");
    
    try {
      console.log("[DEBUG] Starting to fetch submissions...");
      
      // Method 1: Try collectionGroup query first
      console.log("[DEBUG] Trying collectionGroup query...");
      const collectionGroupSnapshot = await getDocs(collectionGroup(db, "submissions"));
      console.log("[DEBUG] CollectionGroup query result:", collectionGroupSnapshot.size, "documents");

      if (collectionGroupSnapshot.size > 0) {
        processSubmissions(collectionGroupSnapshot);
        return;
      }

      // Method 2: If collectionGroup doesn't work, try to fetch from known users
      console.log("[DEBUG] CollectionGroup empty, trying alternative method...");
      
      // First, try to get all users (this might not work due to security rules)
      try {
        const usersSnapshot = await getDocs(collection(db, "users"));
        console.log("[DEBUG] Found users:", usersSnapshot.size);
        
        const allSubmissions: any[] = [];
        
        for (const userDoc of usersSnapshot.docs) {
          const userId = userDoc.id;
          console.log("[DEBUG] Fetching submissions for user:", userId);
          
          const userSubmissionsSnapshot = await getDocs(
            collection(db, "users", userId, "submissions")
          );
          
          console.log("[DEBUG] User", userId, "has", userSubmissionsSnapshot.size, "submissions");
          
          userSubmissionsSnapshot.docs.forEach(submissionDoc => {
            allSubmissions.push({
              ...submissionDoc,
              data: () => ({ ...submissionDoc.data(), userId })
            });
          });
        }
        
        console.log("[DEBUG] Total submissions collected:", allSubmissions.length);
        
        if (allSubmissions.length > 0) {
          // Create a mock snapshot-like object
          const mockSnapshot = {
            size: allSubmissions.length,
            docs: allSubmissions
          };
          processSubmissions(mockSnapshot);
          return;
        }
      } catch (userFetchError) {
        console.log("[DEBUG] User fetch method failed:", userFetchError);
      }

      // Method 3: Direct path approach (if you know specific user IDs)
      console.log("[DEBUG] Trying direct path approach with test data...");
      
      // You can add known user IDs here for testing
      const knownUserIds = []; // Add some known user IDs here: ["user1", "user2", ...]
      
      if (knownUserIds.length > 0) {
        const allSubmissions: any[] = [];
        
        for (const userId of knownUserIds) {
          try {
            const userSubmissionsSnapshot = await getDocs(
              collection(db, "users", userId, "submissions")
            );
            
            userSubmissionsSnapshot.docs.forEach(submissionDoc => {
              allSubmissions.push({
                ...submissionDoc,
                data: () => ({ ...submissionDoc.data(), userId })
              });
            });
          } catch (err) {
            console.log(`[DEBUG] Failed to fetch submissions for user ${userId}:`, err);
          }
        }
        
        if (allSubmissions.length > 0) {
          const mockSnapshot = {
            size: allSubmissions.length,
            docs: allSubmissions
          };
          processSubmissions(mockSnapshot);
          return;
        }
      }

      // If all methods fail
      console.log("[DEBUG] All fetch methods failed");
      setError("No submissions found. This could be due to:\n1. No data in database\n2. Firebase security rules blocking access\n3. Authentication issues");
      setGroups([]);

    } catch (err: any) {
      console.error("[DEBUG] Error in fetchAndGroupSubmissions:", err);
      setError(`Failed to fetch submissions: ${err.message}`);
      setGroups([]);
    } finally {
      setLoading(false);
    }
  };

  const processSubmissions = (snapshot: any) => {
    console.log("[DEBUG] Processing", snapshot.size, "submissions");
    
    const map = new Map<string, UserGroup>();
    let classworkCount = 0;
    let homeworkCount = 0;
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    let recentCount = 0;

    snapshot.docs.forEach((docSnap: any, index: number) => {
      const data = docSnap.data();
      console.log(`[DEBUG] Processing submission ${index + 1}:`, {
        id: docSnap.id,
        userId: data.userId,
        userName: data.userName,
        title: data.title,
        type: data.type
      });

      const submittedAt = data.submittedAt?.toDate ? data.submittedAt.toDate() : 
                         data.submittedAt ? new Date(data.submittedAt) : undefined;
      
      const sub: Submission = {
        id: docSnap.id,
        userId: data.userId || "unknown",
        userName: data.userName || "Unknown User",
        userEmail: data.userEmail || "unknown@email.com",
        title: data.title || "Untitled",
        description: data.description,
        code: data.code || "",
        language: data.language || "text",
        type: data.type || "classwork",
        status: data.status || "submitted",
        submittedAt,
      };

      // Count submissions by type
      if (sub.type === "classwork") classworkCount++;
      else homeworkCount++;

      // Count recent submissions
      if (submittedAt && submittedAt > oneWeekAgo) recentCount++;

      if (!map.has(sub.userId)) {
        map.set(sub.userId, {
          userId: sub.userId,
          userName: sub.userName,
          userEmail: sub.userEmail,
          submissions: [sub],
          totalSubmissions: 1,
          latestSubmission: submittedAt,
        });
      } else {
        const group = map.get(sub.userId)!;
        group.submissions.push(sub);
        group.totalSubmissions++;
        if (!group.latestSubmission || (submittedAt && submittedAt > group.latestSubmission)) {
          group.latestSubmission = submittedAt;
        }
      }
    });

    // Sort submissions within each group
    const groupedArray: UserGroup[] = [];
    map.forEach((group) => {
      group.submissions.sort((a, b) => {
        const aTime = a.submittedAt?.getTime() ?? 0;
        const bTime = b.submittedAt?.getTime() ?? 0;
        return bTime - aTime; // Most recent first
      });
      groupedArray.push(group);
    });

    // Sort groups by user name
    groupedArray.sort((a, b) => a.userName.localeCompare(b.userName));

    console.log("[DEBUG] Final processed groups:", groupedArray.length);
    console.log("[DEBUG] Groups data:", groupedArray.map(g => ({ 
      name: g.userName, 
      submissions: g.submissions.length 
    })));

    setGroups(groupedArray);
    setStats({
      totalStudents: groupedArray.length,
      totalSubmissions: snapshot.size,
      classworkCount,
      homeworkCount,
      recentSubmissions: recentCount,
    });
  };

  const handleLogin = () => {
    if (userInput.id === "pushkar_shinde" && userInput.pass === "v2v@pushkar141") {
      setLoggedIn(true);
    } else {
      alert("Invalid credentials");
    }
  };

  const toggleUser = (uid: string) => {
    const newSet = new Set(expandedUsers);
    newSet.has(uid) ? newSet.delete(uid) : newSet.add(uid);
    setExpandedUsers(newSet);
  };

  const filteredGroups = groups.filter(group =>
    group.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.userEmail.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (date: Date | undefined) => {
    if (!date) return "No date";
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getLanguageColor = (language: string) => {
    const colors: Record<string, string> = {
      javascript: "bg-yellow-100 text-yellow-800",
      python: "bg-blue-100 text-blue-800",
      java: "bg-red-100 text-red-800",
      cpp: "bg-purple-100 text-purple-800",
      html: "bg-orange-100 text-orange-800",
      css: "bg-pink-100 text-pink-800",
      default: "bg-gray-100 text-gray-800"
    };
    return colors[language.toLowerCase()] || colors.default;
  };

  if (!loggedIn) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-indigo-100 via-white to-blue-100">
        <Card className="w-full max-w-md p-8 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">Admin Login</CardTitle>
            <CardDescription>Enter credentials to access dashboard</CardDescription>
          </CardHeader>
          <div className="space-y-4 px-6 pb-6">
            <Input
              placeholder="Admin ID"
              value={userInput.id}
              onChange={(e) => setUserInput({ ...userInput, id: e.target.value })}
            />
            <Input
              type="password"
              placeholder="Password"
              value={userInput.pass}
              onChange={(e) => setUserInput({ ...userInput, pass: e.target.value })}
            />
            <Button className="w-full" onClick={handleLogin}>
              Login
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
                <p className="text-sm text-gray-600">Submission Management System</p>
              </div>
            </div>
            <Button
              onClick={fetchAndGroupSubmissions}
              variant="outline"
              size="sm"
              disabled={loading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">Total Students</p>
                  <p className="text-3xl font-bold">{stats.totalStudents}</p>
                </div>
                <Users className="w-8 h-8 text-blue-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm font-medium">Total Submissions</p>
                  <p className="text-3xl font-bold">{stats.totalSubmissions}</p>
                </div>
                <FileText className="w-8 h-8 text-green-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm font-medium">Classwork</p>
                  <p className="text-3xl font-bold">{stats.classworkCount}</p>
                </div>
                <Code className="w-8 h-8 text-purple-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm font-medium">Recent (7 days)</p>
                  <p className="text-3xl font-bold">{stats.recentSubmissions}</p>
                </div>
                <Calendar className="w-8 h-8 text-orange-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        {error && (
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-700 whitespace-pre-line">{error}</AlertDescription>
          </Alert>
        )}

        {/* Debug Info */}
        {loggedIn && (
          <Card className="bg-yellow-50 border-yellow-200">
            <CardContent className="p-4">
              <h3 className="font-semibold text-yellow-800 mb-2">Debug Information:</h3>
              <div className="text-sm text-yellow-700 space-y-1">
                <p>• Logged in: ✅</p>
                <p>• Total groups found: {groups.length}</p>
                <p>• Total submissions: {stats.totalSubmissions}</p>
                <p>• Check browser console for detailed logs</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Search and Filters */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4 items-center">
              <Input
                placeholder="Search students by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 h-11"
              />
              <div className="text-sm text-gray-600">
                Showing {filteredGroups.length} of {stats.totalStudents} students
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Student Submissions */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
          <CardContent className="p-6">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading submissions...</p>
              </div>
            ) : filteredGroups.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-xl text-gray-500">No submissions found</p>
                <p className="text-gray-400">Check console for debug information</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredGroups.map((group) => (
                  <div key={group.userId} className="border border-gray-200 rounded-xl bg-white shadow-sm hover:shadow-md transition-all duration-200">
                    <Collapsible>
                      <CollapsibleTrigger
                        onClick={() => toggleUser(group.userId)}
                        className="w-full px-6 py-4 flex justify-between items-center hover:bg-gray-50 rounded-xl transition-colors"
                      >
                        <div className="text-left flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                              {group.userName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <h3 className="font-semibold text-lg text-gray-900">{group.userName}</h3>
                              <p className="text-sm text-gray-600">{group.userEmail}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-500 ml-13">
                            <span className="flex items-center gap-1">
                              <FileText className="w-4 h-4" />
                              {group.totalSubmissions} submission{group.totalSubmissions !== 1 ? 's' : ''}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              Latest: {formatDate(group.latestSubmission)}
                            </span>
                          </div>
                        </div>
                        <svg
                          className={`h-5 w-5 text-gray-400 transform transition-transform duration-200 ${
                            expandedUsers.has(group.userId) ? "rotate-180" : ""
                          }`}
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </CollapsibleTrigger>

                      <CollapsibleContent className="px-6 pb-6">
                        <div className="border-t pt-4 space-y-4">
                          {group.submissions.map((sub, index) => (
                            <Card key={sub.id} className="bg-gray-50/50 border-gray-200 hover:bg-gray-50 transition-colors">
                              <CardContent className="p-5">
                                <div className="flex justify-between items-start mb-3">
                                  <div className="flex-1">
                                    <h4 className="font-semibold text-gray-900 mb-1">{sub.title}</h4>
                                    <p className="text-sm text-gray-600">{formatDate(sub.submittedAt)}</p>
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    <Badge className={getLanguageColor(sub.language)}>
                                      {sub.language.toUpperCase()}
                                    </Badge>
                                    <Badge
                                      className={
                                        sub.type === "classwork"
                                          ? "bg-blue-100 text-blue-800 border-blue-200"
                                          : "bg-purple-100 text-purple-800 border-purple-200"
                                      }
                                    >
                                      {sub.type === "classwork" ? "Classwork" : "Homework"}
                                    </Badge>
                                    <Badge className="bg-green-100 text-green-800 border-green-200">
                                      {sub.status}
                                    </Badge>
                                  </div>
                                </div>

                                {sub.description && (
                                  <div className="mb-3">
                                    <p className="text-sm text-gray-700 bg-blue-50 p-3 rounded-lg border border-blue-100">
                                      {sub.description}
                                    </p>
                                  </div>
                                )}

                                <div className="bg-gray-900 rounded-lg overflow-hidden">
                                  <div className="flex items-center justify-between px-4 py-2 bg-gray-800">
                                    <span className="text-xs text-gray-300 font-medium">
                                      {sub.language.toUpperCase()} CODE
                                    </span>
                                    <span className="text-xs text-gray-400">
                                      {sub.code.split('\n').length} lines
                                    </span>
                                  </div>
                                  <pre className="text-white p-4 overflow-x-auto text-sm leading-relaxed">
                                    <code>{sub.code}</code>
                                  </pre>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;