import { useEffect, useState } from "react";
import { submissionService, Submission } from "@/services/submissionService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { COLLEGES } from "@/constants/colleges";
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
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const [allSubmissions, setAllSubmissions] = useState<Submission[]>([]);
  const [filteredSubmissions, setFilteredSubmissions] = useState<Submission[]>([]);
  const [dayWiseData, setDayWiseData] = useState<DayStats[]>([]);

  // Filters
  const [collegeFilter, setCollegeFilter] = useState("");
  const [courseFilter, setCourseFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });

  // View state
  const [activeView, setActiveView] = useState<'overview' | 'daily' | 'analytics'>('daily');
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());

  const handleLogin = () => {
    if (username === "admin" && password === "admin123") {
      setIsLoggedIn(true);
    } else {
      alert("❌ Invalid credentials. Use admin / admin123");
    }
  };

  const processSubmissionsData = (submissions: Submission[]) => {
  const dayMap: { [day: string]: Submission[] } = {};

  submissions.forEach(sub => {
    if (sub.createdAt?.seconds) {
      const date = new Date(sub.createdAt.seconds * 1000);
      const dayKey = date.toDateString();

      if (!dayMap[dayKey]) {
        dayMap[dayKey] = [];
      }
      dayMap[dayKey].push(sub);
    }
  });

  const dayStats: DayStats[] = Object.entries(dayMap)
    .map(([date, subs]) => {
      const collegeBreakdown: { [college: string]: number } = {};
      const courseBreakdown: { [course: string]: number } = {};
      const typeBreakdown: { [type: string]: number } = {};
      const studentSubmissions: { [email: string]: Submission[] } = {};

      subs.forEach(sub => {
        // College breakdown
        const college = sub.userCollege || 'Unknown';
        collegeBreakdown[college] = (collegeBreakdown[college] || 0) + 1;

        // Course breakdown
        const course = sub.userCourse || 'Unknown';
        courseBreakdown[course] = (courseBreakdown[course] || 0) + 1;

        // Type breakdown
        const type = sub.type || 'Unknown';
        typeBreakdown[type] = (typeBreakdown[type] || 0) + 1;

        // Student submissions breakdown
        const email = sub.userEmail || 'unknown';
        if (!studentSubmissions[email]) {
          studentSubmissions[email] = [];
        }
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
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  setDayWiseData(dayStats);
};


  const loadSubmissions = async () => {
    setLoading(true);
    try {
      const all = await submissionService.getAllSubmissions();
      setAllSubmissions(all);
      setFilteredSubmissions(all);
      processSubmissionsData(all);
    } catch (error) {
      console.error('Error loading submissions:', error);
      alert('❌ Error loading submissions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      loadSubmissions();
    }
  }, [isLoggedIn]);

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

  const exportToCSV = () => {
    const headers = ['Date', 'Name', 'Email', 'College', 'Course', 'Type', 'Title', 'File URL'];
    const csvData = filteredSubmissions.map(sub => [
      sub.createdAt ? new Date(sub.createdAt.seconds * 1000).toLocaleDateString() : 'N/A',
      sub.userName || 'N/A',
      sub.userEmail || 'N/A',
      sub.userCollege || 'N/A',
      sub.userCourse || 'N/A',
      sub.type || 'N/A',
      sub.title || 'N/A',
      sub.fileUrl || 'N/A'
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `submissions_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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
            <p className="text-xs text-gray-500 text-center">
              Demo: admin / admin123
            </p>
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
              <div className="hidden sm:flex space-x-2">
                <Button
                  variant={activeView === 'daily' ? 'default' : 'outline'}
                  onClick={() => setActiveView('daily')}
                  size="sm"
                >
                  <Calendar className="w-4 h-4 mr-1" />
                  Daily View
                </Button>
                <Button
                  variant={activeView === 'overview' ? 'default' : 'outline'}
                  onClick={() => setActiveView('overview')}
                  size="sm"
                >
                  <FileText className="w-4 h-4 mr-1" />
                  Overview
                </Button>
                <Button
                  variant={activeView === 'analytics' ? 'default' : 'outline'}
                  onClick={() => setActiveView('analytics')}
                  size="sm"
                >
                  <BarChart3 className="w-4 h-4 mr-1" />
                  Analytics
                </Button>
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
                onClick={exportToCSV}
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
                value={courseFilter}
                onChange={e => setCourseFilter(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Courses</option>
                {COURSES.map(course => (
                  <option key={course} value={course}>{course}</option>
                ))}
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
        {activeView === 'daily' && (
          <div className="space-y-6">
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
        {activeView === 'overview' && (
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
        {activeView === 'analytics' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* College Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Submissions by College</CardTitle>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const collegeStats = filteredSubmissions.reduce((acc, sub) => {
                      const college = sub.userCollege || 'Unknown';
                      acc[college] = (acc[college] || 0) + 1;
                      return acc;
                    }, {} as { [key: string]: number });

                    const sortedColleges = Object.entries(collegeStats)
                      .sort(([,a], [,b]) => b - a)
                      .slice(0, 10);

                    return (
                      <div className="space-y-3">
                        {sortedColleges.map(([college, count]) => (
                          <div key={college} className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-700 truncate flex-1 mr-4">
                              {college}
                            </span>
                            <div className="flex items-center space-x-2">
                              <div className="w-24 bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-blue-600 h-2 rounded-full" 
                                  style={{ width: `${(count / Math.max(...sortedColleges.map(([,c]) => c))) * 100}%` }}
                                ></div>
                              </div>
                              <span className="text-sm font-bold text-gray-900 w-8 text-right">
                                {count}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>

              {/* Course Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Submissions by Course</CardTitle>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const courseStats = filteredSubmissions.reduce((acc, sub) => {
                      const course = sub.userCourse || 'Unknown';
                      acc[course] = (acc[course] || 0) + 1;
                      return acc;
                    }, {} as { [key: string]: number });

                    const sortedCourses = Object.entries(courseStats)
                      .sort(([,a], [,b]) => b - a);

                    return (
                      <div className="space-y-3">
                        {sortedCourses.map(([course, count]) => (
                          <div key={course} className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-700 truncate flex-1 mr-4">
                              {course}
                            </span>
                            <div className="flex items-center space-x-2">
                              <div className="w-24 bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-green-600 h-2 rounded-full" 
                                  style={{ width: `${(count / Math.max(...sortedCourses.map(([,c]) => c))) * 100}%` }}
                                ></div>
                              </div>
                              <span className="text-sm font-bold text-gray-900 w-8 text-right">
                                {count}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            </div>

            {/* Submission Timeline */}
            <Card>
              <CardHeader>
                <CardTitle>Daily Submission Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {dayWiseData.slice(0, 14).map((dayData) => (
                    <div key={dayData.date} className="flex items-center space-x-4">
                      <div className="w-24 text-sm text-gray-600 font-medium">
                        {new Date(dayData.date).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </div>
                      <div className="flex-1 flex items-center space-x-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-4 relative">
                          <div 
                            className="bg-gradient-to-r from-blue-500 to-blue-600 h-4 rounded-full flex items-center justify-center" 
                            style={{ 
                              width: `${Math.max((dayData.totalCount / Math.max(...dayWiseData.map(d => d.totalCount))) * 100, 5)}%` 
                            }}
                          >
                            <span className="text-white text-xs font-medium">
                              {dayData.totalCount}
                            </span>
                          </div>
                        </div>
                        <span className="text-sm text-gray-600 w-16 text-right">
                          {dayData.totalCount} subs
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                {dayWiseData.length > 14 && (
                  <div className="mt-4 text-center">
                    <p className="text-sm text-gray-500">
                      Showing last 14 days. Total: {dayWiseData.length} days tracked.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Average Daily</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {dayWiseData.length > 0 
                          ? Math.round(totalSubmissions / dayWiseData.length * 10) / 10
                          : 0
                        }
                      </p>
                      <p className="text-xs text-gray-500">submissions per day</p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Peak Day</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {dayWiseData.length > 0 
                          ? Math.max(...dayWiseData.map(d => d.totalCount))
                          : 0
                        }
                      </p>
                      <p className="text-xs text-gray-500">highest single day</p>
                    </div>
                    <BarChart3 className="w-8 h-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Submission Types</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {(() => {
                          const typeStats = filteredSubmissions.reduce((acc, sub) => {
                            const type = sub.type || 'unknown';
                            acc[type] = (acc[type] || 0) + 1;
                            return acc;
                          }, {} as { [key: string]: number });
                          
                          const topType = Object.entries(typeStats)
                            .sort(([,a], [,b]) => b - a)[0];
                          
                          return topType ? topType[1] : 0;
                        })()}
                      </p>
                      <p className="text-xs text-gray-500">
                        {(() => {
                          const typeStats = filteredSubmissions.reduce((acc, sub) => {
                            const type = sub.type || 'unknown';
                            acc[type] = (acc[type] || 0) + 1;
                            return acc;
                          }, {} as { [key: string]: number });
                          
                          const topType = Object.entries(typeStats)
                            .sort(([,a], [,b]) => b - a)[0];
                          
                          return topType ? `${topType[0]} (most common)` : 'no data';
                        })()}
                      </p>
                    </div>
                    <FileText className="w-8 h-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
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