// src/components/AdminLeaderboard.tsx
import { useEffect, useState } from "react";
import { calculateLeaderboard } from "@/services/leaderboardService.ts";
import { submissionService } from "@/services/submissionService";
import { assignmentService } from "@/services/assignmentService";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Medal, Award, Users, Clock, FileText, Filter, Crown } from "lucide-react";

const AdminLeaderboard = () => {
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState("All");
  const COURSES = ["Web Development", "Data Analysis", "Mobile Application Development"];

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [submissions, assignments] = await Promise.all([
        submissionService.getAllSubmissions(),
        assignmentService.getAllAssignments(),
      ]);
      const lb = calculateLeaderboard(submissions, assignments);
      setLeaderboard(lb);
      setLoading(false);
    };

    load();
  }, []);

  useEffect(() => {
    if (selectedCourse === "All") {
      setFiltered(leaderboard);
    } else {
      setFiltered(leaderboard.filter(entry => entry.userCourse === selectedCourse));
    }
  }, [selectedCourse, leaderboard]);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-5 h-5 text-yellow-500" />;
      case 2:
        return <Trophy className="w-5 h-5 text-gray-400" />;
      case 3:
        return <Medal className="w-5 h-5 text-amber-600" />;
      default:
        return <span className="w-5 h-5 flex items-center justify-center text-sm font-semibold text-slate-600">#{rank}</span>;
    }
  };

  const getRankBadgeColor = (rank: number) => {
    switch (rank) {
      case 1:
        return "bg-gradient-to-r from-yellow-400 to-yellow-600 text-white shadow-lg shadow-yellow-200";
      case 2:
        return "bg-gradient-to-r from-gray-300 to-gray-500 text-white shadow-lg shadow-gray-200";
      case 3:
        return "bg-gradient-to-r from-amber-400 to-amber-600 text-white shadow-lg shadow-amber-200";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  const getRowAnimation = (index: number) => {
    return {
      animationDelay: `${index * 0.1}s`,
    };
  };

  const getCourseColor = (course: string) => {
    const colors = {
      "Web Development": "bg-blue-100 text-blue-800 border-blue-200",
      "Data Analysis": "bg-green-100 text-green-800 border-green-200",
      "Mobile Application Development": "bg-purple-100 text-purple-800 border-purple-200",
    };
    return colors[course as keyof typeof colors] || "bg-gray-100 text-gray-800 border-gray-200";
  };

  return (
    <div className="min-h-screen bg-gradient-to-brp-6">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full shadow-lg">
              <Trophy className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Admin Leaderboard
            </h1>
          </div>
          <p className="text-slate-600 text-lg">Track student performance and achievements</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-lg">    
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-600 font-medium">Total Students</p>
                  <p className="text-2xl font-bold text-slate-900">{leaderboard.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 rounded-lg">
                  <FileText className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-600 font-medium">Total Submissions</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {leaderboard.reduce((sum, entry) => sum + entry.totalSubmissions, 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Clock className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-600 font-medium">Avg Response Time</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {leaderboard.length > 0 
                      ? Math.round(leaderboard.reduce((sum, entry) => sum + entry.averageSeconds, 0) / leaderboard.length)
                      : 0}s
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Leaderboard Card */}
        <Card className="shadow-2xl border-0 bg-white/90 backdrop-blur-sm overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-blue-50 border-b">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <CardTitle className="text-2xl text-slate-900 flex items-center gap-2">
                <Award className="w-6 h-6 text-blue-600" />
                Rankings
              </CardTitle>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-600" />
                <select
                  value={selectedCourse}
                  onChange={(e) => setSelectedCourse(e.target.value)}
                  className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm hover:shadow-md transition-all duration-200"
                >
                  <option value="All">All Courses</option>
                  {COURSES.map((course) => (
                    <option key={course} value={course}>{course}</option>
                  ))}
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-1/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                    <Skeleton className="h-8 w-20" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-slate-100 to-slate-200 sticky top-0 z-10">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Rank</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Student</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Course</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Avg Time</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Submissions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filtered.map((entry, index) => (
                      <tr 
                        key={entry.userId} 
                        className="bg-white hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-300 animate-fade-in-up group cursor-pointer"
                        style={getRowAnimation(index)}
                      >
                        <td className="px-6 py-4">
                          <div className={`inline-flex items-center justify-center w-10 h-10 rounded-full ${getRankBadgeColor(index + 1)} transition-transform duration-200 group-hover:scale-110`}>
                            {getRankIcon(index + 1)}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-3">
                            <div className="flex-shrink-0">
                              <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-lg">
                                {entry.userName.charAt(0).toUpperCase()}
                              </div>
                            </div>
                            <div>
                              <div className="text-sm font-semibold text-slate-900">{entry.userName}</div>
                              <div className="text-sm text-slate-500">{entry.userEmail}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getCourseColor(entry.userCourse)}`}>
                            {entry.userCourse}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4 text-slate-400" />
                            <span className="text-sm font-medium text-slate-900">{entry.averageSeconds}s</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1">
                            <FileText className="w-4 h-4 text-slate-400" />
                            <span className="text-sm font-medium text-slate-900">{entry.totalSubmissions}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filtered.length === 0 && (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
                      <Users className="w-8 h-8 text-slate-400" />
                    </div>
                    <p className="text-slate-500 text-lg">No students found for the selected course</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <style jsx>{`
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.6s ease-out forwards;
          opacity: 0;
        }
      `}</style>
    </div>
  );
};

export default AdminLeaderboard;