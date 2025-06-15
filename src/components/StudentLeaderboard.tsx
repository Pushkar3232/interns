// src/components/StudentLeaderboard.tsx
import { useEffect, useState } from "react";
import { calculateLeaderboard } from "@/services/leaderboardService.ts";
import { submissionService } from "@/services/submissionService";
import { assignmentService } from "@/services/assignmentService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Medal, Award, Users, Clock, FileText, Crown, Star, Zap, Target } from "lucide-react";

interface StudentLeaderboardProps {
  userId: string;
  userCourse: string;
  userEmail: string;
}

const StudentLeaderboard = ({ userId, userCourse, userEmail }: StudentLeaderboardProps) => {
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAllCourses, setShowAllCourses] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const [submissions, assignments] = await Promise.all([
        submissionService.getAllSubmissions(),
        assignmentService.getAllAssignments()
      ]);

      const data = calculateLeaderboard(submissions, assignments);
      setLeaderboard(data);
      setLoading(false);
    };

    loadData();
  }, []);

  const filtered = showAllCourses
    ? leaderboard
    : leaderboard.filter(entry => entry.userCourse === userCourse);

  const currentUserRank = filtered.findIndex(entry => entry.userId === userId) + 1;
  const currentUserData = filtered.find(entry => entry.userId === userId);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500" />;
      case 2:
        return <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />;
      case 3:
        return <Medal className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" />;
      default:
        return <span className="w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center text-xs sm:text-sm font-semibold text-slate-600">#{rank}</span>;
    }
  };

  const getRankBadgeColor = (rank: number) => {
    switch (rank) {
      case 1:
        return "bg-gradient-to-r from-yellow-400 to-yellow-600 text-white shadow-lg";
      case 2:
        return "bg-gradient-to-r from-gray-300 to-gray-500 text-white shadow-lg";
      case 3:
        return "bg-gradient-to-r from-amber-400 to-amber-600 text-white shadow-lg";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  const getCourseColor = (course: string) => {
    const colors = {
      "Web Development": "bg-blue-100 text-blue-700",
      "Data Analysis": "bg-green-100 text-green-700",
      "Mobile Application Development": "bg-purple-100 text-purple-700",
    };
    return colors[course as keyof typeof colors] || "bg-gray-100 text-gray-700";
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full">
            <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Leaderboard
          </h1>
        </div>
        <p className="text-slate-600 text-sm sm:text-base">See how you stack up against your peers</p>
      </div>

      {/* Your Rank Card (Mobile-First) */}
      {currentUserData && (
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 shadow-lg">
          <CardContent className="p-4 sm:p-6">
            <div className="text-center space-y-3">
              <div className="flex items-center justify-center gap-2">
                <Star className="w-5 h-5 text-yellow-500" />
                <span className="text-lg sm:text-xl font-bold text-slate-800">Your Rank</span>
              </div>
              
              <div className="flex items-center justify-center gap-4 flex-wrap">
                <div className={`inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full ${getRankBadgeColor(currentUserRank)} text-lg sm:text-xl font-bold`}>
                  {currentUserRank <= 3 ? getRankIcon(currentUserRank) : `#${currentUserRank}`}
                </div>
                <div className="text-center">
                  <p className="text-lg sm:text-xl font-semibold text-slate-900">{currentUserData.userName}</p>
                  <span className={`inline-block px-2 py-1 rounded-full text-xs sm:text-sm font-medium ${getCourseColor(currentUserData.userCourse)}`}>
                    {currentUserData.userCourse}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-slate-600">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm">Avg Time</span>
                  </div>
                  <p className="text-xl sm:text-2xl font-bold text-slate-900">{currentUserData.averageSeconds}s</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-slate-600">
                    <FileText className="w-4 h-4" />
                    <span className="text-sm">Submissions</span>
                  </div>
                  <p className="text-xl sm:text-2xl font-bold text-slate-900">{currentUserData.totalSubmissions}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Leaderboard */}
      <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-sm">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-blue-50 border-b">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle className="text-xl sm:text-2xl text-slate-900 flex items-center gap-2">
              <Award className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
              Rankings
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Label className="text-sm text-slate-700">All Courses</Label>
              <Switch
                checked={showAllCourses}
                onCheckedChange={setShowAllCourses}
                className="data-[state=checked]:bg-blue-600"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-3 p-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <Skeleton className="h-8 w-16" />
                </div>
              ))}
            </div>
          ) : (
            <>
              {/* Mobile Layout */}
              <div className="block sm:hidden">
                <div className="divide-y divide-slate-100">
                  {filtered.map((entry, index) => {
                    const isYou = entry.userId === userId;
                    const rank = index + 1;
                    return (
                      <div
                        key={entry.userId}
                        className={`p-4 transition-all duration-200 ${
                          isYou 
                            ? "bg-gradient-to-r from-yellow-50 to-amber-50 border-l-4 border-yellow-400" 
                            : "bg-white hover:bg-slate-50"
                        }`}
                      >
                        {/* Top Row - Rank and User Info */}
                        <div className="flex items-start space-x-3 mb-3">
                          <div className={`flex items-center justify-center w-10 h-10 rounded-full flex-shrink-0 ${getRankBadgeColor(rank)}`}>
                            {getRankIcon(rank)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className={`text-sm font-semibold truncate ${isYou ? 'text-amber-900' : 'text-slate-900'}`}>
                                {entry.userName} {isYou && <span className="text-yellow-600">👑</span>}
                              </p>
                            </div>
                            <p className="text-xs text-slate-500 truncate">{entry.userEmail}</p>
                            <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${getCourseColor(entry.userCourse)}`}>
                              {entry.userCourse}
                            </span>
                          </div>
                        </div>
                        
                        {/* Bottom Row - Stats */}
                        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-slate-400 flex-shrink-0" />
                            <div>
                              <p className="text-xs text-slate-500">Avg Time</p>
                              <p className="text-sm font-medium text-slate-900">{entry.averageSeconds}s</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                            <div>
                              <p className="text-xs text-slate-500">Submissions</p>
                              <p className="text-sm font-medium text-slate-900">{entry.totalSubmissions}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Desktop Layout */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-slate-100 to-slate-200 sticky top-0">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Rank</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Student</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Course</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Avg Time</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Submissions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filtered.map((entry, index) => {
                      const isYou = entry.userId === userId;
                      const rank = index + 1;
                      return (
                        <tr
                          key={entry.userId}
                          className={`transition-all duration-300 ${
                            isYou 
                              ? "bg-gradient-to-r from-yellow-50 to-amber-50 border-l-4 border-yellow-400 shadow-md" 
                              : "bg-white hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50"
                          }`}
                        >
                          <td className="px-6 py-4">
                            <div className={`inline-flex items-center justify-center w-10 h-10 rounded-full ${getRankBadgeColor(rank)}`}>
                              {getRankIcon(rank)}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-3">
                              <div className="flex-shrink-0">
                                <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                                  {entry.userName.charAt(0).toUpperCase()}
                                </div>
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <div className={`text-sm font-semibold ${isYou ? 'text-amber-900' : 'text-slate-900'}`}>
                                    {entry.userName} {isYou && <span className="text-yellow-600">👑</span>}
                                  </div>
                                </div>
                                <div className="text-sm text-slate-500">{entry.userEmail}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getCourseColor(entry.userCourse)}`}>
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
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {filtered.length === 0 && !loading && (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
                <Users className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-slate-500 text-lg">No students found</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Motivational Footer */}
      <div className="text-center space-y-2 p-4">
        <div className="flex items-center justify-center gap-1">
          <Zap className="w-4 h-4 text-yellow-500" />
          <span className="text-sm font-medium text-slate-700">Keep pushing forward!</span>
        </div>
        <p className="text-xs text-slate-500">Every submission gets you closer to the top</p>
      </div>
    </div>
  );
};

export default StudentLeaderboard;