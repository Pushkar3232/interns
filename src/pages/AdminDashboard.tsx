import { useEffect, useState } from "react";
import { submissionService, Submission,getLatestSubmissions } from "@/services/submissionService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { COLLEGES } from "@/constants/colleges";
import AssignmentForm from "@/components/AssignmentForm";
import { assignmentService } from "@/services/assignmentService";


// import AdminLeaderboard from "@/components/AdminLeaderboard";
import * as XLSX from 'xlsx';
import { 
  Calendar, 
  Download, 
  Filter, 
  LogOut, 
  RefreshCw, 
  Users, 
  FileText, 
  TrendingUp, 
  Eye,
  Search,
  BarChart3,
  Clock,
  CheckCircle,
  AlertCircle
} from "lucide-react";


const COURSES = ["Web Development", "Data Analysis", "Mobile Application Development"];

interface DayStats {
  date: string;
  submissions: Submission[];
  totalCount: number;
  collegeBreakdown: { [college: string]: number };
  courseBreakdown: { [course: string]: number };
  typeBreakdown: { [type: string]: number };
  studentSubmissions: { [email: string]: Submission[] }; // Add this line
}

const AdminDashboard = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const [allSubmissions, setAllSubmissions] = useState<Submission[]>([]);
  const [filteredSubmissions, setFilteredSubmissions] = useState<Submission[]>([]);
  const [dayWiseData, setDayWiseData] = useState<DayStats[]>([]);

  // Filters
  const [collegeFilter, setCollegeFilter] = useState("");
  const [courseFilter, setCourseFilter] = useState("Web Development"); // default
  const [typeFilter, setTypeFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });

  // View state
  const [activeTab, setActiveTab] = useState<"daily" | "overview"  | "assignments">("daily");


  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());

  const handleLogin = () => {
    if (username === "admin" && password === "admin123") {
      setIsLoggedIn(true);
    } else {
      alert("❌ Invalid credentials.");
    }
  };

 const processSubmissionsData = async (submissions: Submission[]) => {
  const dayMap: { [day: string]: Submission[] } = {};

  // 🔸 Load all assignments if not available
  let allAssignments = assignments;
  if (assignments.length === 0) {
    allAssignments = await assignmentService.getAllAssignments();
    setAssignments(allAssignments);
  }

  const assignmentMap = new Map<string, any>();
  allAssignments.forEach(a => assignmentMap.set(a.id, a));

  for (const sub of submissions) {
    // ✅ NEW: Use assignmentCreatedAt from submission data (which comes from the collection structure)
    let assignDate = "Unknown";
    
    if (sub.assignmentCreatedAt?.seconds) {
      // Use the assignmentCreatedAt timestamp from the submission
      assignDate = new Date(sub.assignmentCreatedAt.seconds * 1000).toDateString();
    } else {
      // Fallback: try to get from assignment map
      const assignment = assignmentMap.get(sub.assignmentId);
      if (assignment?.createdAt?.seconds) {
        assignDate = new Date(assignment.createdAt.seconds * 1000).toDateString();
      } else if (sub.createdAt?.seconds) {
        // Last fallback: use submission creation date
        assignDate = new Date(sub.createdAt.seconds * 1000).toDateString();
      }
    }

    if (!dayMap[assignDate]) dayMap[assignDate] = [];
    dayMap[assignDate].push(sub);
  }

  const dayStats: DayStats[] = Object.entries(dayMap).map(([date, subs]) => {
    const collegeBreakdown: { [college: string]: number } = {};
    const courseBreakdown: { [course: string]: number } = {};
    const typeBreakdown: { [type: string]: number } = {};
    const studentSubmissions: { [email: string]: Submission[] } = {};

    subs.forEach(sub => {
      const college = sub.userCollege || 'Unknown';
      const course = sub.userCourse || 'Unknown';
      const type = sub.type || 'Unknown';
      const email = sub.userEmail || 'unknown';

      collegeBreakdown[college] = (collegeBreakdown[college] || 0) + 1;
      courseBreakdown[course] = (courseBreakdown[course] || 0) + 1;
      typeBreakdown[type] = (typeBreakdown[type] || 0) + 1;

      if (!studentSubmissions[email]) studentSubmissions[email] = [];
      studentSubmissions[email].push(sub);
    });

    return {
      date,
      submissions: subs,
      totalCount: subs.length,
      collegeBreakdown,
      courseBreakdown,
      typeBreakdown,
      studentSubmissions
    };
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  setDayWiseData(dayStats);
};


  // Replace your loadSubmissions function in AdminDashboard.tsx with this:

const loadSubmissions = async () => {
  if (!courseFilter) return;

  setLoading(true);
  try {
    // ✅ Load both submissions and assignments
    const [submissions, allAssignments] = await Promise.all([
      getLatestSubmissions(courseFilter),
      assignmentService.getAllAssignments()
    ]);
    
    console.log("Got submissions:", submissions.length);
    console.log("Got assignments:", allAssignments.length);
    
    setAllSubmissions(submissions);
    setFilteredSubmissions(submissions);
    setAssignments(allAssignments); // ✅ Update assignments state
    
    processSubmissionsData(submissions);
  } catch (error) {
    console.error("Error:", error);
  } finally {
    setLoading(false);
  }
};


  useEffect(() => {
  if (isLoggedIn && courseFilter) {
    loadSubmissions();
  }
}, [isLoggedIn, courseFilter]);


  useEffect(() => {
    let filtered = allSubmissions;

    // Apply filters
    if (collegeFilter) {
      filtered = filtered.filter(sub => sub.userCollege === collegeFilter);
    }
    if (courseFilter) {
      filtered = filtered.filter(sub => sub.userCourse === courseFilter);
    }
    if (typeFilter) {
      filtered = filtered.filter(sub => sub.type === typeFilter);
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(sub => 
        sub.userName?.toLowerCase().includes(query) ||
        sub.userEmail?.toLowerCase().includes(query) ||
        sub.title?.toLowerCase().includes(query)
      );
    }
    if (dateRange.start && dateRange.end) {
      const startDate = new Date(dateRange.start);
      const endDate = new Date(dateRange.end);
      filtered = filtered.filter(sub => {
        if (sub.createdAt?.seconds) {
          const subDate = new Date(sub.createdAt.seconds * 1000);
          return subDate >= startDate && subDate <= endDate;
        }
        return false;
      });
    }

    setFilteredSubmissions(filtered);
    processSubmissionsData(filtered);
  }, [collegeFilter, courseFilter, typeFilter, searchQuery, dateRange, allSubmissions]);

  const toggleDayExpansion = (date: string) => {
    const newExpanded = new Set(expandedDays);
    if (newExpanded.has(date)) {
      newExpanded.delete(date);
    } else {
      newExpanded.add(date);
    }
    setExpandedDays(newExpanded);
  };

const exportToExcel = async () => {
  if (!XLSX) {
    alert('Excel export functionality is not available. Please try again.');
    return;
  }

  // 1. Build assignment map
  const assignmentMap = new Map<string, any>();
  const allAssignments = assignments.length > 0
    ? assignments
    : await assignmentService.getAllAssignments();
  allAssignments.forEach((a: any) => assignmentMap.set(a.id, a));

  // 2. ✅ NEW: Collect dates using assignmentCreatedAt from submissions
  const allDates = [...new Set(
    filteredSubmissions
      .map(sub => {
        // Priority 1: Use assignmentCreatedAt from submission
        if (sub.assignmentCreatedAt?.seconds) {
          return new Date(sub.assignmentCreatedAt.seconds * 1000).toDateString();
        }
        
        // Priority 2: Fallback to assignment map
        const assignment = assignmentMap.get(sub.assignmentId);
        if (assignment?.createdAt?.seconds) {
          return new Date(assignment.createdAt.seconds * 1000).toDateString();
        }
        
        return null;
      })
      .filter(Boolean) as string[]
  )].sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

  // 3. Group by course
  const courseGroups = filteredSubmissions.reduce((acc, sub) => {
    const course = sub.userCourse || 'Unknown Course';
    if (!acc[course]) {
      acc[course] = [];
    }
    acc[course].push(sub);
    return acc;
  }, {} as { [course: string]: Submission[] });

  const workbook = XLSX.utils.book_new();

  // 4. Create sheets for each course
  Object.entries(courseGroups).forEach(([courseName, courseSubmissions]) => {
    const homeworkSubmissions = courseSubmissions.filter(sub => sub.type === 'homework');
    const classworkSubmissions = courseSubmissions.filter(sub => sub.type === 'classwork');

    // Homework Sheet
    if (homeworkSubmissions.length > 0) {
      const homeworkSheet = createCourseSheet(homeworkSubmissions, allDates, 'Homework', assignmentMap);
      const homeworkSheetName = `${courseName.substring(0, 20)}_HW`.replace(/[^\w\s]/gi, '');
      XLSX.utils.book_append_sheet(workbook, homeworkSheet, homeworkSheetName);
    }

    // Classwork Sheet
    if (classworkSubmissions.length > 0) {
      const classworkSheet = createCourseSheet(classworkSubmissions, allDates, 'Classwork', assignmentMap);
      const classworkSheetName = `${courseName.substring(0, 20)}_CW`.replace(/[^\w\s]/gi, '');
      XLSX.utils.book_append_sheet(workbook, classworkSheet, classworkSheetName);
    }

    // Combined Sheet
    const combinedSheet = createCourseSheet(courseSubmissions, allDates, 'All', assignmentMap);
    const combinedSheetName = `${courseName.substring(0, 25)}`.replace(/[^\w\s]/gi, '');
    XLSX.utils.book_append_sheet(workbook, combinedSheet, combinedSheetName);
  });

  // 5. ✅ NEW: Updated summary sheet
  const summarySheet = createSummarySheet(filteredSubmissions, allDates, assignmentMap);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

  // 6. Trigger download
  const fileName = `submissions_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(workbook, fileName);
};

const createCourseSheet = (
  submissions: Submission[],
  allDates: string[],
  type: string,
  assignmentMap: Map<string, any>
) => {
  // Get unique students
  const students = [...new Set(submissions.map(sub => sub.userEmail))].sort();

  // Create student info map
  const studentInfo = submissions.reduce((acc, sub) => {
    if (sub.userEmail && !acc[sub.userEmail]) {
      acc[sub.userEmail] = {
        name: sub.userName || 'N/A',
        college: sub.userCollege || 'N/A',
        email: sub.userEmail
      };
    }
    return acc;
  }, {} as { [email: string]: { name: string; college: string; email: string } });

  // ✅ NEW: Create submission map using assignmentCreatedAt
  const submissionMap = submissions.reduce((acc, sub) => {
    if (!sub.userEmail || !sub.assignmentId) return acc;

    let date: string | null = null;
    
    // Priority 1: Use assignmentCreatedAt from submission
    if (sub.assignmentCreatedAt?.seconds) {
      date = new Date(sub.assignmentCreatedAt.seconds * 1000).toDateString();
    } else {
      // Priority 2: Fallback to assignment map
      const assignment = assignmentMap.get(sub.assignmentId);
      if (assignment?.createdAt?.seconds) {
        date = new Date(assignment.createdAt.seconds * 1000).toDateString();
      }
    }

    if (!date) return acc;

    const key = `${sub.userEmail}-${date}`;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(sub);
    return acc;
  }, {} as { [key: string]: Submission[] });

  // Build headers
  const headers = ['College Name', 'Student Name', 'Email', ...allDates];

  // Build data rows
  const data = students.map(email => {
    const info = studentInfo[email];
    const row = [info.college, info.name, info.email];

    // For each date, check if student submitted
    allDates.forEach(date => {
      const key = `${email}-${date}`;
      const daySubmissions = submissionMap[key] || [];
      if (daySubmissions.length > 0) {
        row.push(`Yes (${daySubmissions.length})`);
      } else {
        row.push('');
      }
    });

    return row;
  });

  // Create worksheet
  const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);

  // Auto-size columns
  const colWidths = headers.map((header, index) => {
    const maxLength = Math.max(
      header.length,
      ...data.map(row => String(row[index] || '').length)
    );
    return { width: Math.min(Math.max(maxLength + 2, 10), 30) };
  });
  ws['!cols'] = colWidths;

  return ws;
};
const createSummarySheet = (
  submissions: Submission[],
  allDates: string[],
  assignmentMap: Map<string, any>
) => {
  // Calculate statistics
  const totalSubmissions = submissions.length;
  const totalStudents = new Set(submissions.map(s => s.userEmail)).size;
  const totalColleges = new Set(submissions.map(s => s.userCollege)).size;

  // Course breakdown
  const courseStats = submissions.reduce((acc, sub) => {
    const course = sub.userCourse || 'Unknown';
    acc[course] = (acc[course] || 0) + 1;
    return acc;
  }, {} as { [key: string]: number });

  // College breakdown
  const collegeStats = submissions.reduce((acc, sub) => {
    const college = sub.userCollege || 'Unknown';
    acc[college] = (acc[college] || 0) + 1;
    return acc;
  }, {} as { [key: string]: number });

  // Type breakdown
  const typeStats = submissions.reduce((acc, sub) => {
    const type = sub.type || 'Unknown';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as { [key: string]: number });

  // ✅ NEW: Daily breakdown using assignmentCreatedAt
  const dailyStats = allDates.map(date => {
    const daySubmissions = submissions.filter(sub => {
      // Priority 1: Use assignmentCreatedAt from submission
      if (sub.assignmentCreatedAt?.seconds) {
        const assignDate = new Date(sub.assignmentCreatedAt.seconds * 1000).toDateString();
        return assignDate === date;
      }
      
      // Priority 2: Fallback to assignment map
      const assignment = assignmentMap.get(sub.assignmentId);
      if (assignment?.createdAt?.seconds) {
        const assignDate = new Date(assignment.createdAt.seconds * 1000).toDateString();
        return assignDate === date;
      }
      
      return false;
    });
    return [date, daySubmissions.length];
  });

  // Build summary data
  const summaryData = [
    ['SUBMISSION SUMMARY REPORT'],
    ['Generated on:', new Date().toLocaleString()],
    [''],
    ['OVERVIEW'],
    ['Total Submissions:', totalSubmissions],
    ['Total Students:', totalStudents],
    ['Total Colleges:', totalColleges],
    ['Date Range:', allDates.length > 0 ? `${allDates[0]} to ${allDates[allDates.length - 1]}` : 'No dates'],
    [''],
    ['SUBMISSIONS BY COURSE'],
    ...Object.entries(courseStats).map(([course, count]) => [course, count]),
    [''],
    ['SUBMISSIONS BY COLLEGE'],
    ...Object.entries(collegeStats).map(([college, count]) => [college, count]),
    [''],
    ['SUBMISSIONS BY TYPE'],
    ...Object.entries(typeStats).map(([type, count]) => [type, count]),
    [''],
    ['DAILY BREAKDOWN (by Assignment Creation Date)'],
    ['Date', 'Submissions'],
    ...dailyStats
  ];

  const ws = XLSX.utils.aoa_to_sheet(summaryData);

  // Auto-size columns
  ws['!cols'] = [{ width: 30 }, { width: 20 }];

  return ws;
};

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
       
        <Card className="w-full max-w-md shadow-2xl border-0">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
            <CardTitle className="text-center text-2xl font-bold flex items-center justify-center gap-2">
              🔐 Admin Portal
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
                <Input 
                  placeholder="Enter username" 
                  value={username} 
                  onChange={e => setUsername(e.target.value)}
                  className="border-2 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                <Input 
                  type="password" 
                  placeholder="Enter password" 
                  value={password} 
                  onChange={e => setPassword(e.target.value)}
                  className="border-2 focus:border-blue-500"
                  onKeyPress={e => e.key === 'Enter' && handleLogin()}
                />
              </div>
            </div>
            <Button 
              onClick={handleLogin} 
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3"
            >
              🚀 Access Dashboard
            </Button>
            
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalSubmissions = filteredSubmissions.length;
  const totalStudents = new Set(filteredSubmissions.map(s => s.userEmail)).size;
  const totalColleges = new Set(filteredSubmissions.map(s => s.userCollege)).size;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">📊 Admin Dashboard</h1>
              <div className="flex flex-wrap gap-2 mb-6">
  <Button
    variant={activeTab === "daily" ? "default" : "outline"}
    onClick={() => setActiveTab("daily")}
  >
    📆 Daily View
  </Button>
  <Button
    variant={activeTab === "overview" ? "default" : "outline"}
    onClick={() => setActiveTab("overview")}
  >
    📄 Overview
  </Button>
  
  <Button
    variant={activeTab === "assignments" ? "default" : "outline"}
    onClick={() => setActiveTab("assignments")}
  >
    📚 Assignments
  </Button>
  {/* <Button
    variant={activeTab === "leaderboard" ? "default" : "outline"}
    onClick={() => setActiveTab("leaderboard")}
  >
    🏅 Leaderboard
  </Button> */}
</div>

            </div>
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                onClick={loadSubmissions}
                disabled={loading}
                size="sm"
              >
                <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button
                variant="outline"
                onClick={exportToExcel}
                size="sm"
              >
                <Download className="w-4 h-4 mr-1" />
                Export
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsLoggedIn(false)}
                size="sm"
              >
                <LogOut className="w-4 h-4 mr-1" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">Total Submissions</p>
                  <p className="text-3xl font-bold">{totalSubmissions}</p>
                </div>
                <FileText className="w-8 h-8 text-blue-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm font-medium">Active Students</p>
                  <p className="text-3xl font-bold">{totalStudents}</p>
                </div>
                <Users className="w-8 h-8 text-green-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm font-medium">Colleges</p>
                  <p className="text-3xl font-bold">{totalColleges}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-purple-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm font-medium">Days Tracked</p>
                  <p className="text-3xl font-bold">{dayWiseData.length}</p>
                </div>
                <Calendar className="w-8 h-8 text-orange-200" />
              </div>
            </CardContent>
          </Card>
        </div>
        

        {/* Filters */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filters & Search
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search by name, email, or title..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <select
                value={collegeFilter}
                onChange={e => setCollegeFilter(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Colleges</option>
                {COLLEGES.map(college => (
                  <option key={college} value={college}>{college}</option>
                ))}
              </select>

              <select
              className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
  value={courseFilter}
  onChange={e => setCourseFilter(e.target.value)}
  
>
  <option value="Web Development">Web Development</option>
  <option value="Data Analysis">Data Analysis</option>
  <option value="Mobile Application Development">Mobile App Dev</option>
</select>


              <select
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Types</option>
                <option value="homework">Homework</option>
                <option value="classwork">Classwork</option>
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <Input
                  type="date"
                  value={dateRange.start}
                  onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <Input
                  type="date"
                  value={dateRange.end}
                  onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                />
              </div>
            </div>

            {(collegeFilter || courseFilter || typeFilter || searchQuery || dateRange.start || dateRange.end) && (
              <div className="mt-4 pt-4 border-t">
                <div className="flex flex-wrap gap-2">
                  {collegeFilter && (
                    <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center gap-1">
                      College: {collegeFilter}
                      <button onClick={() => setCollegeFilter('')} className="text-blue-600 hover:text-blue-800">×</button>
                    </span>
                  )}
                  {courseFilter && (
                    <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm flex items-center gap-1">
                      Course: {courseFilter}
                      <button onClick={() => setCourseFilter('')} className="text-green-600 hover:text-green-800">×</button>
                    </span>
                  )}
                  {typeFilter && (
                    <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm flex items-center gap-1">
                      Type: {typeFilter}
                      <button onClick={() => setTypeFilter('')} className="text-purple-600 hover:text-purple-800">×</button>
                    </span>
                  )}
                  {searchQuery && (
                    <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm flex items-center gap-1">
                      Search: {searchQuery}
                      <button onClick={() => setSearchQuery('')} className="text-orange-600 hover:text-orange-800">×</button>
                    </span>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setCollegeFilter('');
                      setCourseFilter('');
                      setTypeFilter('');
                      setSearchQuery('');
                      setDateRange({ start: '', end: '' });
                    }}
                  >
                    Clear All
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Daily View */}
        {activeTab  === 'daily' && (
          <div className="space-y-6 ">
            {dayWiseData.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No submissions found</h3>
                  <p className="text-gray-500">Try adjusting your filters or check back later.</p>
                </CardContent>
              </Card>
            ) : (
              dayWiseData.map((dayData) => (
                <Card key={dayData.date} className="overflow-hidden">
                  <CardHeader 
                    className="cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => toggleDayExpansion(dayData.date)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-5 h-5 text-blue-600" />
                          <CardTitle className="text-lg">{dayData.date}</CardTitle>
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                            {dayData.totalCount} submissions
                          </span>
                          <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full">
                            {Object.keys(dayData.collegeBreakdown).length} colleges
                          </span>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">
                        {expandedDays.has(dayData.date) ? '▼' : '►'}
                      </Button>
                    </div>

                    {/* Day Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <h4 className="font-medium text-blue-900 mb-2">Top Colleges</h4>
                        <div className="space-y-1">
                          {Object.entries(dayData.collegeBreakdown)
                            .sort(([,a], [,b]) => b - a)
                            .slice(0, 3)
                            .map(([college, count]) => (
                              <div key={college} className="flex justify-between text-sm">
                                <span className="text-blue-700 truncate">{college}</span>
                                <span className="text-blue-900 font-medium">{count}</span>
                              </div>
                            ))}
                        </div>
                      </div>

                      <div className="bg-green-50 p-3 rounded-lg">
                        <h4 className="font-medium text-green-900 mb-2">Courses</h4>
                        <div className="space-y-1">
                          {Object.entries(dayData.courseBreakdown)
                            .sort(([,a], [,b]) => b - a)
                            .map(([course, count]) => (
                              <div key={course} className="flex justify-between text-sm">
                                <span className="text-green-700 truncate">{course}</span>
                                <span className="text-green-900 font-medium">{count}</span>
                              </div>
                            ))}
                        </div>
                      </div>

                      <div className="bg-purple-50 p-3 rounded-lg">
                        <h4 className="font-medium text-purple-900 mb-2">Types</h4>
                        <div className="space-y-1">
                          {Object.entries(dayData.typeBreakdown)
                            .sort(([,a], [,b]) => b - a)
                            .map(([type, count]) => (
                              <div key={type} className="flex justify-between text-sm">
                                <span className="text-purple-700 capitalize">{type}</span>
                                <span className="text-purple-900 font-medium">{count}</span>
                              </div>
                            ))}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  
                  {expandedDays.has(dayData.date) && (
  <CardContent className="border-t bg-gray-50">
    <div className="space-y-4">
      {Object.entries(dayData.studentSubmissions).map(([email, submissions]) => (
        <div key={email} className="bg-white p-4 rounded-lg border shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
            <div>
              <p className="text-sm font-medium text-gray-900">
                {submissions[0].userName || 'N/A'}
              </p>
              <p className="text-sm text-gray-600 truncate">{email}</p>
            </div>
            <div>
              <p className="text-sm text-gray-700">
                {submissions[0].userCollege || 'N/A'}
              </p>
              <p className="text-sm text-gray-600">
                {submissions[0].userCourse || 'N/A'}
              </p>
            </div>
            <div className="flex items-center justify-end">
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                {submissions.length} {submissions.length === 1 ? 'submission' : 'submissions'}
              </span>
            </div>
          </div>

          <div className="border-t pt-3 space-y-3">
            {submissions.map((submission) => (
              <div key={submission.id} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                <div>
                  <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                    submission.type === 'homework' 
                      ? 'bg-blue-100 text-blue-800' 
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {submission.type || 'N/A'}
                  </span>
                </div>
                <div className="truncate">
                  <p className="text-sm font-medium text-gray-700 truncate">
                    {submission.title || 'N/A'}
                  </p>
                </div>
                <div className="text-xs text-gray-500">
                  {submission.createdAt 
                    ? new Date(submission.createdAt.seconds * 1000).toLocaleTimeString()
                    : 'N/A'
                  }
                </div>
                <div className="flex justify-end">
                  {submission.fileUrl && (
                    <a
                      href={submission.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  </CardContent>
)}
                </Card>
              ))
            )}
          </div>
        )}

        {/* Overview View */}
        {activeTab  === 'overview' && (
          <Card>
            <CardHeader>
              <CardTitle>All Submissions Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredSubmissions.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No submissions found</h3>
                    <p className="text-gray-500">Try adjusting your filters or check back later.</p>
                  </div>
                ) : (
                  filteredSubmissions.map((submission, idx) => (
                    <div key={`${submission.id}-${idx}`} className="bg-gray-50 p-4 rounded-lg border">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-center">
                        <div>
                          <p className="font-medium text-gray-900">{submission.userName || 'N/A'}</p>
                          <p className="text-sm text-gray-600">{submission.userEmail || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="font-medium text-gray-700">{submission.userCollege || 'N/A'}</p>
                          <p className="text-sm text-gray-600">{submission.userCourse || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="font-medium text-gray-700">{submission.title || 'N/A'}</p>
                          <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                            submission.type === 'homework' 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {submission.type || 'N/A'}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">
                            {submission.createdAt 
                              ? new Date(submission.createdAt.seconds * 1000).toLocaleDateString()
                              : 'N/A'
                            }
                          </p>
                          <p className="text-xs text-gray-500">
                            {submission.createdAt 
                              ? new Date(submission.createdAt.seconds * 1000).toLocaleTimeString()
                              : 'N/A'
                            }
                          </p>
                        </div>
                        <div className="flex justify-end">
                          {submission.fileUrl && (
                            <a
                              href={submission.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              View File
                            </a>
                          )}
                        </div>
                      </div>
                      
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Analytics View */}
        
        {activeTab === "assignments" && (
  <>
    <h2 className="text-xl font-bold mb-4">📚 Assignment Management</h2>
    <AssignmentForm />
    <Card className="mb-8 mt-4">
      <CardHeader>
        <CardTitle>📌 All Assignments</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {assignments.length === 0 ? (
          <p className="text-gray-500">No assignments created yet.</p>
        ) : (
          assignments.map((assignment) => (
            <div key={assignment.id} className="border p-4 rounded-md bg-white shadow-sm">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{assignment.title}</h3>
                  <p className="text-sm text-gray-500">{assignment.description || "No description"}</p>
                  <p className="text-sm text-gray-600 mt-1">
                    🏷 Type: <strong className="capitalize">{assignment.type}</strong> | 📘 Course: <strong>{assignment.course}</strong>
                  </p>
                  {assignment.deadline && (
                    <p className="text-sm text-red-600 mt-1">
                      ⏰ Deadline: {new Date(assignment.deadline.seconds * 1000).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <span className="text-xs text-gray-400">
                  Created: {new Date(assignment.createdAt.seconds * 1000).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  </>
)}

{/* {activeTab === "leaderboard" && (
  <>
    <h2 className="text-xl font-bold mb-4">🏅 Leaderboard</h2>
    <AdminLeaderboard />
  </>
)} */}
      </div>

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl">
            <div className="flex items-center space-x-3">
              <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
              <span className="text-lg font-medium">Loading submissions...</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;