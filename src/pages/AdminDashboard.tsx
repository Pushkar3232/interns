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
import { AlertCircle, Users, FileText, Calendar, Code, RefreshCw, BookOpen, Clock, Filter } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

interface DailyGroup {
  date: string;
  displayDate: string;
  userGroups: UserGroup[];
  totalSubmissions: number;
}

interface SubjectGroup {
  subject: string;
  displayName: string;
  dailyGroups: DailyGroup[];
  totalSubmissions: number;
  totalStudents: number;
}

interface AdminStats {
  totalStudents: number;
  totalSubmissions: number;
  classworkCount: number;
  homeworkCount: number;
  recentSubmissions: number;
  subjectStats: Record<string, number>;
}

const TEACHER_ACCESS = {
  "pushkar_shinde": ["Data Analysis", "Mobile Application Development", "Web Development"], // Admin access to all subjects
  "da_teacher": ["Data Analysis"], // Data Analysis teacher
  "mad_teacher": ["Mobile Application Development"], // Mobile App Development teacher
  "webd_teacher": ["Web Development"], // Web Development teacher
};

// Subject display names (full names are already display names)
const SUBJECT_NAMES = {
  "Data Analysis": "Data Analysis",
  "Mobile Application Development": "Mobile Application Development",
  "Web Development": "Web Development"
};


const AdminDashboard = () => {
  const [subjectGroups, setSubjectGroups] = useState<SubjectGroup[]>([]);
  const [stats, setStats] = useState<AdminStats>({
    totalStudents: 0,
    totalSubmissions: 0,
    classworkCount: 0,
    homeworkCount: 0,
    recentSubmissions: 0,
    subjectStats: {}
  });
  const [loading, setLoading] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState("");
  const [userInput, setUserInput] = useState({ id: "", pass: "" });
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set());
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [selectedDateRange, setSelectedDateRange] = useState<string>("all");
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

      // If all methods fail
      console.log("[DEBUG] All fetch methods failed");
      setError("No submissions found. This could be due to:\n1. No data in database\n2. Firebase security rules blocking access\n3. Authentication issues");
      setSubjectGroups([]);

    } catch (err: any) {
      console.error("[DEBUG] Error in fetchAndGroupSubmissions:", err);
      setError(`Failed to fetch submissions: ${err.message}`);
      setSubjectGroups([]);
    } finally {
      setLoading(false);
    }
  };

  const processSubmissions = (snapshot: any) => {
    console.log("[DEBUG] Processing", snapshot.size, "submissions");
    
    // Get allowed subjects for current user
    const allowedSubjects = TEACHER_ACCESS[currentUser as keyof typeof TEACHER_ACCESS] || [];
    
    const subjectMap = new Map<string, Map<string, Map<string, UserGroup>>>();
    let classworkCount = 0;
    let homeworkCount = 0;
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    let recentCount = 0;
    const subjectStats: Record<string, number> = {};

    snapshot.docs.forEach((docSnap: any, index: number) => {
      const data = docSnap.data();
      console.log(`[DEBUG] Processing submission ${index + 1}:`, {
        id: docSnap.id,
        userId: data.userId,
        userName: data.userName,
        title: data.title,
        type: data.type,
        language: data.language
      });

      const submittedAt = data.submittedAt?.toDate ? data.submittedAt.toDate() : 
                         data.submittedAt ? new Date(data.submittedAt) : new Date();
      
      const sub: Submission = {
        id: docSnap.id,
        userId: data.userId || "unknown",
        userName: data.userName || "Unknown User",
        userEmail: data.userEmail || "unknown@email.com",
        title: data.title || "Untitled",
        description: data.description,
        code: data.code || "",
        language: data.language || "DA", // Default to DA if no language specified
        type: data.type || "classwork",
        status: data.status || "submitted",
        submittedAt,
      };

      // Filter by user's allowed subjects
      if (allowedSubjects.length > 0 && !allowedSubjects.includes(sub.language)) {
        return; // Skip this submission if user doesn't have access
      }

      // Count submissions by type
      if (sub.type === "classwork") classworkCount++;
      else homeworkCount++;

      // Count recent submissions
      if (submittedAt && submittedAt > oneWeekAgo) recentCount++;

      // Count by subject
      subjectStats[sub.language] = (subjectStats[sub.language] || 0) + 1;

      // Create date key (YYYY-MM-DD)
      const dateKey = submittedAt.toISOString().split('T')[0];
      
      // Initialize subject map if doesn't exist
      if (!subjectMap.has(sub.language)) {
        subjectMap.set(sub.language, new Map<string, Map<string, UserGroup>>());
      }
      
      // Initialize date map if doesn't exist
      const subjectData = subjectMap.get(sub.language)!;
      if (!subjectData.has(dateKey)) {
        subjectData.set(dateKey, new Map<string, UserGroup>());
      }
      
      // Initialize user group if doesn't exist
      const dateData = subjectData.get(dateKey)!;
      if (!dateData.has(sub.userId)) {
        dateData.set(sub.userId, {
          userId: sub.userId,
          userName: sub.userName,
          userEmail: sub.userEmail,
          submissions: [sub],
          totalSubmissions: 1,
          latestSubmission: submittedAt,
        });
      } else {
        const group = dateData.get(sub.userId)!;
        group.submissions.push(sub);
        group.totalSubmissions++;
        if (!group.latestSubmission || submittedAt > group.latestSubmission) {
          group.latestSubmission = submittedAt;
        }
      }
    });

    // Convert maps to arrays and sort
    const subjectGroupsArray: SubjectGroup[] = [];
    
    subjectMap.forEach((dateMap, subject) => {
      const dailyGroups: DailyGroup[] = [];
      let subjectTotalSubmissions = 0;
      const uniqueStudents = new Set<string>();
      
      // Sort dates in descending order (most recent first)
      const sortedDates = Array.from(dateMap.keys()).sort((a, b) => b.localeCompare(a));
      
      sortedDates.forEach(dateKey => {
        const userMap = dateMap.get(dateKey)!;
        const userGroups: UserGroup[] = [];
        let dayTotalSubmissions = 0;
        
        userMap.forEach((group) => {
          // Sort submissions within each group
          group.submissions.sort((a, b) => {
            const aTime = a.submittedAt?.getTime() ?? 0;
            const bTime = b.submittedAt?.getTime() ?? 0;
            return bTime - aTime; // Most recent first
          });
          
          userGroups.push(group);
          dayTotalSubmissions += group.totalSubmissions;
          subjectTotalSubmissions += group.totalSubmissions;
          uniqueStudents.add(group.userId);
        });
        
        // Sort user groups by name
        userGroups.sort((a, b) => a.userName.localeCompare(b.userName));
        
        // Format display date
        const date = new Date(dateKey);
        const displayDate = date.toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        });
        
        dailyGroups.push({
          date: dateKey,
          displayDate,
          userGroups,
          totalSubmissions: dayTotalSubmissions,
        });
      });
      
      subjectGroupsArray.push({
        subject,
        displayName: SUBJECT_NAMES[subject as keyof typeof SUBJECT_NAMES] || subject,
        dailyGroups,
        totalSubmissions: subjectTotalSubmissions,
        totalStudents: uniqueStudents.size,
      });
    });

    // Sort subjects alphabetically
    subjectGroupsArray.sort((a, b) => a.displayName.localeCompare(b.displayName));

    console.log("[DEBUG] Final processed subject groups:", subjectGroupsArray.length);
    console.log("[DEBUG] Subject groups data:", subjectGroupsArray.map(sg => ({ 
      subject: sg.subject,
      displayName: sg.displayName,
      dailyGroups: sg.dailyGroups.length,
      totalSubmissions: sg.totalSubmissions,
      totalStudents: sg.totalStudents
    })));

    setSubjectGroups(subjectGroupsArray);
    
    // Calculate total unique students across all subjects
    const allUniqueStudents = new Set<string>();
    subjectGroupsArray.forEach(sg => {
      sg.dailyGroups.forEach(dg => {
        dg.userGroups.forEach(ug => {
          allUniqueStudents.add(ug.userId);
        });
      });
    });

    setStats({
      totalStudents: allUniqueStudents.size,
      totalSubmissions: snapshot.size,
      classworkCount,
      homeworkCount,
      recentSubmissions: recentCount,
      subjectStats,
    });
  };

  const handleLogin = () => {
    // Check all possible teacher credentials
    const teachers = {
      "pushkar_shinde": "v2v@pushkar141", // Admin
      "da_teacher": "da123", // Data Analysis teacher
      "mad_teacher": "mad123", // Mobile App Development teacher
      "webd_teacher": "webd123", // Web Development teacher
    };

    const foundTeacher = Object.entries(teachers).find(
      ([id, pass]) => userInput.id === id && userInput.pass === pass
    );

    if (foundTeacher) {
      setCurrentUser(foundTeacher[0]);
      setLoggedIn(true);
    } else {
      alert("Invalid credentials");
    }
  };

  const toggleSubject = (subject: string) => {
    const newSet = new Set(expandedSubjects);
    newSet.has(subject) ? newSet.delete(subject) : newSet.add(subject);
    setExpandedSubjects(newSet);
  };

  const toggleDay = (key: string) => {
    const newSet = new Set(expandedDays);
    newSet.has(key) ? newSet.delete(key) : newSet.add(key);
    setExpandedDays(newSet);
  };

  const toggleUser = (uid: string) => {
    const newSet = new Set(expandedUsers);
    newSet.has(uid) ? newSet.delete(uid) : newSet.add(uid);
    setExpandedUsers(newSet);
  };

  // Filter subject groups based on search term and selected filters
  const filteredSubjectGroups = subjectGroups
    .filter(sg => selectedSubject === "all" || sg.subject === selectedSubject)
    .map(sg => ({
      ...sg,
      dailyGroups: sg.dailyGroups
        .filter(dg => {
          if (selectedDateRange === "all") return true;
          const date = new Date(dg.date);
          const now = new Date();
          const daysDiff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
          
          switch (selectedDateRange) {
            case "today": return daysDiff === 0;
            case "week": return daysDiff <= 7;
            case "month": return daysDiff <= 30;
            default: return true;
          }
        })
        .map(dg => ({
          ...dg,
          userGroups: dg.userGroups.filter(ug =>
            ug.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            ug.userEmail.toLowerCase().includes(searchTerm.toLowerCase())
          )
        }))
        .filter(dg => dg.userGroups.length > 0)
    }))
    .filter(sg => sg.dailyGroups.length > 0);

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
      "DA": "bg-blue-100 text-blue-800 border-blue-200",
      "MAD": "bg-green-100 text-green-800 border-green-200",
      "WebD": "bg-purple-100 text-purple-800 border-purple-200",
      default: "bg-gray-100 text-gray-800"
    };
    return colors[language] || colors.default;
  };

  const getSubjectColor = (subject: string) => {
    const colors: Record<string, string> = {
      "DA": "from-blue-500 to-blue-600",
      "MAD": "from-green-500 to-green-600",
      "WebD": "from-purple-500 to-purple-600",
    };
    return colors[subject] || "from-gray-500 to-gray-600";
  };

  if (!loggedIn) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-indigo-100 via-white to-blue-100">
        <Card className="w-full max-w-md p-8 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">Teacher Login</CardTitle>
            <CardDescription>Enter credentials to access your dashboard</CardDescription>
          </CardHeader>
          <div className="space-y-4 px-6 pb-6">
            <Input
              placeholder="Teacher ID"
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
            <div className="text-xs text-gray-500 space-y-1">
              <p>Demo credentials:</p>
              <p>• Admin: pushkar_shinde / v2v@pushkar141</p>
              <p>• DA Teacher: da_teacher / da123</p>
              <p>• MAD Teacher: mad_teacher / mad123</p>
              <p>• WebD Teacher: webd_teacher / webd123</p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  const allowedSubjects = TEACHER_ACCESS[currentUser as keyof typeof TEACHER_ACCESS] || [];
  const isAdmin = currentUser === "pushkar_shinde";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {isAdmin ? "Admin Dashboard" : `${currentUser.toUpperCase()} Dashboard`}
                </h1>
                <p className="text-sm text-gray-600">
                  {isAdmin ? "All Subjects Management" : `${allowedSubjects.join(", ")} Submissions`}
                </p>
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

        {/* Subject Stats */}
        {Object.keys(stats.subjectStats).length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(stats.subjectStats).map(([subject, count]) => (
              <Card key={subject} className={`bg-gradient-to-r ${getSubjectColor(subject)} text-white border-0`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white/80 text-sm font-medium">
                        {SUBJECT_NAMES[subject as keyof typeof SUBJECT_NAMES]}
                      </p>
                      <p className="text-2xl font-bold">{count}</p>
                    </div>
                    <BookOpen className="w-6 h-6 text-white/60" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {error && (
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-700 whitespace-pre-line">{error}</AlertDescription>
          </Alert>
        )}

        {/* Search and Filters */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4 items-center">
              <Input
                placeholder="Search students by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 h-11"
              />
              
              {isAdmin && (
                <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by subject" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Subjects</SelectItem>
                    {Object.entries(SUBJECT_NAMES).map(([key, name]) => (
                      <SelectItem key={key} value={key}>{name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              
              <Select value={selectedDateRange} onValueChange={setSelectedDateRange}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by date" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Dates</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">Last 7 Days</SelectItem>
                  <SelectItem value="month">Last 30 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Subject Sections */}
        <div className="space-y-6">
          {loading ? (
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <CardContent className="p-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading submissions...</p>
                </div>
              </CardContent>
            </Card>
          ) : filteredSubjectGroups.length === 0 ? (
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <CardContent className="p-12">
                <div className="text-center">
                  <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-xl text-gray-500">No submissions found</p>
                  <p className="text-gray-400">Try adjusting your filters or check console for debug information</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            filteredSubjectGroups.map((subjectGroup) => (
              <Card key={subjectGroup.subject} className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                <Collapsible>
                  <CollapsibleTrigger
                    onClick={() => toggleSubject(subjectGroup.subject)}
                    className="w-full"
                  >
                    <CardHeader className="hover:bg-gray-50 transition-colors cursor-pointer">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 bg-gradient-to-r ${getSubjectColor(subjectGroup.subject)} rounded-lg flex items-center justify-center`}>
                            <BookOpen className="w-6 h-6 text-white" />
                          </div>
                          <div className="text-left">
                            <CardTitle className="text-xl">{subjectGroup.displayName}</CardTitle>
                            <CardDescription className="flex items-center gap-4">
                              <span className="flex items-center gap-1">
                                <Users className="w-4 h-4" />
                                {subjectGroup.totalStudents} students
                              </span>
                              <span className="flex items-center gap-1">
                                <FileText className="w-4 h-4" />
                                {subjectGroup.totalSubmissions} submissions
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                {subjectGroup.dailyGroups.length} days
                              </span>
                            </CardDescription>
                          </div>
                        </div>
                        <svg
                          className={`h-5 w-5 text-gray-400 transform transition-transform duration-200 ${
                            expandedSubjects.has(subjectGroup.subject) ? "rotate-180" : ""
                          }`}
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <CardContent className="space-y-4">
                      {subjectGroup.dailyGroups.map((dailyGroup) => (
                        <Card key={`${subjectGroup.subject}-${dailyGroup.date}`} className="bg-gray-50/50 border-gray-200">
                          <Collapsible>
                            <CollapsibleTrigger
                              onClick={() => toggleDay(`${subjectGroup.subject}-${dailyGroup.date}`)}
                              className="w-full"
                            >
                              <CardHeader className="hover:bg-gray-100/50 transition-colors cursor-pointer">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gradient-to-r from-gray-500 to-gray-600 rounded-lg flex items-center justify-center">
                                      <Clock className="w-5 h-5 text-white" />
                                    </div>
                                    <div className="text-left">
                                      <CardTitle className="text-lg">{dailyGroup.displayDate}</CardTitle>
                                      <CardDescription className="flex items-center gap-3">
                                        <span className="flex items-center gap-1">
                                          <Users className="w-4 h-4" />
                                          {dailyGroup.userGroups.length} students
                                        </span>
                                        <span className="flex items-center gap-1">
                                          <FileText className="w-4 h-4" />
                                          {dailyGroup.totalSubmissions} submissions
                                        </span>
                                      </CardDescription>
                                    </div>
                                  </div>
                                  <svg
                                    className={`h-4 w-4 text-gray-400 transform transition-transform duration-200 ${
                                      expandedDays.has(`${subjectGroup.subject}-${dailyGroup.date}`) ? "rotate-180" : ""
                                    }`}
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                  >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                  </svg>
                                </div>
                              </CardHeader>
                            </CollapsibleTrigger>

                            <CollapsibleContent>
                              <CardContent className="space-y-3">
                                {dailyGroup.userGroups.map((group) => (
                                  <Card key={`${subjectGroup.subject}-${dailyGroup.date}-${group.userId}`} className="bg-white border-gray-200 hover:shadow-md transition-all duration-200">
                                    <Collapsible>
                                      <CollapsibleTrigger
                                        onClick={() => toggleUser(`${subjectGroup.subject}-${dailyGroup.date}-${group.userId}`)}
                                        className="w-full px-4 py-3 flex justify-between items-center hover:bg-gray-50 transition-colors"
                                      >
                                        <div className="text-left flex-1">
                                          <div className="flex items-center gap-3 mb-1">
                                            <div className={`w-8 h-8 bg-gradient-to-r ${getSubjectColor(subjectGroup.subject)} rounded-full flex items-center justify-center text-white font-semibold text-sm`}>
                                              {group.userName.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                              <h4 className="font-semibold text-gray-900">{group.userName}</h4>
                                              <p className="text-xs text-gray-600">{group.userEmail}</p>
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-3 text-xs text-gray-500 ml-11">
                                            <span className="flex items-center gap-1">
                                              <FileText className="w-3 h-3" />
                                              {group.totalSubmissions} submission{group.totalSubmissions !== 1 ? 's' : ''}
                                            </span>
                                            <span className="flex items-center gap-1">
                                              <Clock className="w-3 h-3" />
                                              Latest: {formatDate(group.latestSubmission)}
                                            </span>
                                          </div>
                                        </div>
                                        <svg
                                          className={`h-4 w-4 text-gray-400 transform transition-transform duration-200 ${
                                            expandedUsers.has(`${subjectGroup.subject}-${dailyGroup.date}-${group.userId}`) ? "rotate-180" : ""
                                          }`}
                                          xmlns="http://www.w3.org/2000/svg"
                                          fill="none"
                                          viewBox="0 0 24 24"
                                          stroke="currentColor"
                                        >
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                      </CollapsibleTrigger>

                                      <CollapsibleContent className="px-4 pb-4">
                                        <div className="border-t pt-3 space-y-3">
                                          {group.submissions.map((sub) => (
                                            <Card key={sub.id} className="bg-gray-50/50 border-gray-200 hover:bg-gray-50 transition-colors">
                                              <CardContent className="p-4">
                                                <div className="flex justify-between items-start mb-3">
                                                  <div className="flex-1">
                                                    <h5 className="font-semibold text-gray-900 mb-1">{sub.title}</h5>
                                                    <p className="text-xs text-gray-600">{formatDate(sub.submittedAt)}</p>
                                                  </div>
                                                  <div className="flex flex-wrap gap-1">
                                                    <Badge className={getLanguageColor(sub.language)} size="sm">
                                                      {sub.language}
                                                    </Badge>
                                                    <Badge
                                                      className={
                                                        sub.type === "classwork"
                                                          ? "bg-blue-100 text-blue-800 border-blue-200"
                                                          : "bg-purple-100 text-purple-800 border-purple-200"
                                                      }
                                                      size="sm"
                                                    >
                                                      {sub.type === "classwork" ? "Classwork" : "Homework"}
                                                    </Badge>
                                                    <Badge className="bg-green-100 text-green-800 border-green-200" size="sm">
                                                      {sub.status}
                                                    </Badge>
                                                  </div>
                                                </div>

                                                {sub.description && (
                                                  <div className="mb-3">
                                                    <p className="text-xs text-gray-700 bg-blue-50 p-2 rounded border border-blue-100">
                                                      {sub.description}
                                                    </p>
                                                  </div>
                                                )}

                                                <div className="bg-gray-900 rounded-lg overflow-hidden">
                                                  <div className="flex items-center justify-between px-3 py-2 bg-gray-800">
                                                    <span className="text-xs text-gray-300 font-medium">
                                                      {sub.language} CODE
                                                    </span>
                                                    <span className="text-xs text-gray-400">
                                                      {sub.code.split('\n').length} lines
                                                    </span>
                                                  </div>
                                                  <pre className="text-white p-3 overflow-x-auto text-xs leading-relaxed max-h-64 overflow-y-auto">
                                                    <code>{sub.code}</code>
                                                  </pre>
                                                </div>
                                              </CardContent>
                                            </Card>
                                          ))}
                                        </div>
                                      </CollapsibleContent>
                                    </Collapsible>
                                  </Card>
                                ))}
                              </CardContent>
                            </CollapsibleContent>
                          </Collapsible>
                        </Card>
                      ))}
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            ))
          )}
        </div>

        {/* Debug Info */}
        {loggedIn && (
          <Card className="bg-yellow-50 border-yellow-200">
            <CardContent className="p-4">
              <h3 className="font-semibold text-yellow-800 mb-2">Debug Information:</h3>
              <div className="text-sm text-yellow-700 space-y-1">
                <p>• Current User: {currentUser}</p>
                <p>• Allowed Subjects: {allowedSubjects.join(", ")}</p>
                <p>• Total Subject Groups: {subjectGroups.length}</p>
                <p>• Filtered Subject Groups: {filteredSubjectGroups.length}</p>
                <p>• Total Submissions: {stats.totalSubmissions}</p>
                <p>• Check browser console for detailed logs</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;