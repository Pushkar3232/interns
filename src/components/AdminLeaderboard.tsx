// src/components/AdminLeaderboard.tsx
import { useEffect, useState, useCallback } from "react";
import { leaderboardService, LeaderboardEntry } from "@/services/leaderboardService";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Trophy, Medal, Award, Users, Clock, FileText, Filter, Crown, RefreshCw, ChevronDown } from "lucide-react";

interface LeaderboardStats {
  totalStudents: number;
  totalSubmissions: number;
  avgResponseTime: number;
}

const AdminLeaderboard = () => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [stats, setStats] = useState<LeaderboardStats>({
    totalStudents: 0,
    totalSubmissions: 0,
    avgResponseTime: 0
  });
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState("Web Development");
  const [currentPage, setCurrentPage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<number>(Date.now());
  
  const ITEMS_PER_PAGE = 10;
  
  // ✅ OPTIMIZATION: Remove "All courses" - force specific course selection
  const COURSES = [
    "Web Development", 
    "Data Analysis", 
    "Mobile Application Development"
  ];

  // ✅ OPTIMIZATION: Debounced loading to prevent multiple calls
  const loadInitialData = useCallback(async () => {
    if (!selectedCourse) return;
    
    setLoading(true);
    setStatsLoading(true);
    setCurrentPage(0);
    setError(null);
    
    try {
      console.log("🚀 Loading initial data for:", selectedCourse);
      
      // ✅ OPTIMIZATION: Load data in parallel but with error handling
      const [leaderboardData, statsData] = await Promise.allSettled([
        leaderboardService.getTopStudents(selectedCourse, ITEMS_PER_PAGE),
        leaderboardService.getLeaderboardStats(selectedCourse)
      ]);
      
      // Handle leaderboard data
      if (leaderboardData.status === 'fulfilled') {
        setLeaderboard(leaderboardData.value);
        setHasMore(leaderboardData.value.length === ITEMS_PER_PAGE);
      } else {
        console.error("Leaderboard load failed:", leaderboardData.reason);
        setLeaderboard([]);
        setError("Failed to load leaderboard data");
      }
      
      // Handle stats data
      if (statsData.status === 'fulfilled') {
        setStats(statsData.value);
      } else {
        console.error("Stats load failed:", statsData.reason);
        setStats({ totalStudents: 0, totalSubmissions: 0, avgResponseTime: 0 });
      }
      
    } catch (error) {
      console.error("Error loading initial data:", error);
      setLeaderboard([]);
      setStats({ totalStudents: 0, totalSubmissions: 0, avgResponseTime: 0 });
      setError("Failed to load data. Please try again.");
    } finally {
      setLoading(false);
      setStatsLoading(false);
      setLastRefresh(Date.now());
    }
  }, [selectedCourse]);

  // ✅ OPTIMIZATION: Load data when course changes or component mounts
  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // ✅ OPTIMIZATION: Improved load more with better error handling
  const loadMoreStudents = async () => {
    if (!hasMore || loadingMore || !selectedCourse) return;
    
    setLoadingMore(true);
    try {
      const nextPage = currentPage + 1;
      const skip = nextPage * ITEMS_PER_PAGE;
      
      console.log(`📄 Loading more students: page ${nextPage}, skip ${skip}`);
      
      const moreData = await leaderboardService.getMoreStudents(
        selectedCourse, 
        skip, 
        ITEMS_PER_PAGE
      );
      
      if (moreData.length > 0) {
        setLeaderboard(prev => {
          // Prevent duplicates
          const existingIds = new Set(prev.map(item => item.id));
          const newItems = moreData.filter(item => !existingIds.has(item.id));
          return [...prev, ...newItems];
        });
        setCurrentPage(nextPage);
        setHasMore(moreData.length === ITEMS_PER_PAGE);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error("Error loading more students:", error);
      setHasMore(false);
      setError("Failed to load more students");
    } finally {
      setLoadingMore(false);
    }
  };

  // ✅ OPTIMIZATION: Smart refresh with cache clearing
  const refreshData = async () => {
    // Clear cache for this course
    leaderboardService.clearCache(selectedCourse);
    await loadInitialData();
  };

  // ✅ OPTIMIZATION: Course change with preloading
  const handleCourseChange = async (newCourse: string) => {
    if (newCourse === selectedCourse) return;
    
    setSelectedCourse(newCourse);
    // Preload data for the new course
    leaderboardService.preloadData(newCourse);
  };

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

  const getRowAnimation = (index: number) => ({
    animationDelay: `${index * 0.1}s`,
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
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
          
          {/* ✅ Show last refresh time */}
          <div className="text-xs text-slate-500 mt-2">
            Last updated: {new Date(lastRefresh).toLocaleTimeString()}
          </div>
        </div>

        {/* ✅ OPTIMIZATION: Course Selection - No "All courses" option */}
        <div className="mb-6 flex justify-center">
          <div className="flex items-center gap-2 bg-white rounded-lg p-2 shadow-md">
            <Filter className="w-4 h-4 text-slate-600" />
            <select
              value={selectedCourse}
              onChange={(e) => handleCourseChange(e.target.value)}
              className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            >
              {COURSES.map((course) => (
                <option key={course} value={course}>{course}</option>
              ))}
            </select>
            <Button
              onClick={refreshData}
              disabled={loading}
              variant="outline"
              size="sm"
              className="ml-2"
              title="Refresh data and clear cache"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* ✅ Error display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-center">
            {error}
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-600 font-medium">Active Students</p>
                  {statsLoading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <p className="text-2xl font-bold text-slate-900">{stats.totalStudents}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 rounded-lg">
                  <FileText className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-600 font-medium">Total Submissions</p>
                  {statsLoading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <p className="text-2xl font-bold text-slate-900">{stats.totalSubmissions}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Clock className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-600 font-medium">Avg Response Time</p>
                  {statsLoading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <p className="text-2xl font-bold text-slate-900">{stats.avgResponseTime}s</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Leaderboard Table */}
        <Card className="shadow-2xl border-0 bg-white/90 backdrop-blur-sm overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-blue-50 border-b">
            <CardTitle className="text-2xl text-slate-900 flex items-center gap-2">
              <Award className="w-6 h-6 text-blue-600" /> 
              Top Performers - {selectedCourse}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-4">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full rounded" />
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-100 sticky top-0 z-10">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase">Rank</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase">Student</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase">College</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase">Avg Time</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase">Submissions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {leaderboard.map((entry, index) => (
                      <tr key={entry.email} className="bg-white group animate-fade-in-up hover:bg-slate-50" style={getRowAnimation(index)}>
                        <td className="px-6 py-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getRankBadgeColor(index + 1)}`}>
                            {getRankIcon(index + 1)}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-semibold text-slate-900">{entry.name}</div>
                          <div className="text-sm text-slate-500">{entry.email}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-slate-700">{entry.college || 'N/A'}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-medium text-slate-900">{Math.round(entry.avgMinutes * 60)}s</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-medium text-slate-900">{entry.count}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {/* ✅ OPTIMIZATION: Load More Button with better UX */}
                {hasMore && !loading && (
                  <div className="p-6 text-center border-t">
                    <Button 
                      onClick={loadMoreStudents}
                      disabled={loadingMore}
                      variant="outline"
                      className="w-full sm:w-auto"
                    >
                      {loadingMore ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-4 h-4 mr-2" />
                          Load More Students ({ITEMS_PER_PAGE} more)
                        </>
                      )}
                    </Button>
                  </div>
                )}
                
                {leaderboard.length === 0 && !loading && (
                  <div className="text-center py-12">
                    <p className="text-slate-500 text-lg">No students found for {selectedCourse}</p>
                    <Button 
                      onClick={refreshData} 
                      variant="outline" 
                      className="mt-4"
                    >
                      Try Refreshing
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* ✅ Read optimization info */}
        <div className="mt-6 text-center text-xs text-slate-500">
          Showing top {Math.min(leaderboard.length, ITEMS_PER_PAGE)} students • 
          Optimized Firebase reads • Data cached for 5 minutes
        </div>
      </div>

      <style>{`
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
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