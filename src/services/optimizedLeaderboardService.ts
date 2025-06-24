// src/services/optimizedLeaderboardService.ts
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  query,
  orderBy,
  limit,
  where,
  Timestamp,
  writeBatch,
  onSnapshot,
  DocumentData
} from "firebase/firestore";

const db = getFirestore();

export interface LeaderboardEntry {
  userId: string;
  userName: string;
  userEmail: string;
  userCourse: string;
  userCollege: string;
  totalSubmissions: number;
  totalResponseTime: number; // Total seconds across all submissions
  averageSeconds: number; // Calculated average
  lastSubmissionDate: Timestamp;
  rank?: number;
  updatedAt: Timestamp;
}

export interface LeaderboardStats {
  totalStudents: number;
  totalSubmissions: number;
  avgResponseTime: number;
  lastUpdated: Timestamp;
}

class OptimizedLeaderboardService {
  private cache = new Map<string, { data: LeaderboardEntry[], timestamp: number }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * 🎯 Main method: Get top 10 students (ultra-fast, minimal reads)
   */
  async getTopStudents(course: string, limitCount: number = 10): Promise<LeaderboardEntry[]> {
  try {
    console.log(`🏆 Getting top ${limitCount} students for ${course}`);

    // Check cache first
    const cacheKey = `${course}_top_${limitCount}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && this.isCacheValid(cached.timestamp)) {
      console.log("📦 Returning cached leaderboard");
      return cached.data;
    }

    // Fetch from optimized leaderboard collection
    const leaderboardRef = collection(db, "leaderboards", course, "students");
    const topQuery = query(
      leaderboardRef,
      where("totalSubmissions", ">=", 1),
      orderBy("averageSeconds", "asc"),
      orderBy("totalSubmissions", "desc"),
      limit(limitCount)
    );

    const snapshot = await getDocs(topQuery);
    console.log("🔥 Firestore query executed", topQuery);
    
    if (snapshot.empty) {
      console.log("⚠️ No documents found in leaderboard collection");
      return [];
    }

    const topStudents = snapshot.docs.map((doc, index) => ({
      ...doc.data(),
      rank: index + 1
    })) as LeaderboardEntry[];

    console.log(`✅ Fetched ${topStudents.length} students with ${snapshot.size} reads`);

    // Cache results
    this.cache.set(cacheKey, {
      data: topStudents,
      timestamp: Date.now()
    });

    return topStudents;
  } catch (error) {
    console.error("❌ Error in getTopStudents:", error);
    return [];
  }
}

  /**
   * 📊 Get leaderboard stats (1 read only)
   */
  async getLeaderboardStats(course: string): Promise<LeaderboardStats> {
    try {
      const statsRef = doc(db, "leaderboards", course, "meta", "stats");
      const statsSnap = await getDoc(statsRef);
      
      if (statsSnap.exists()) {
        return statsSnap.data() as LeaderboardStats;
      }
      
      // Fallback: calculate from leaderboard collection
      return await this.calculateStatsFromLeaderboard(course);
    } catch (error) {
      console.error("❌ Error getting stats:", error);
      return {
        totalStudents: 0,
        totalSubmissions: 0,
        avgResponseTime: 0,
        lastUpdated: Timestamp.now()
      };
    }
  }

  /**
   * 🔄 Update leaderboard when new submission is made
   * Call this after every submission to keep leaderboard current
   */
  async updateStudentLeaderboard(
    userId: string,
    userName: string,
    userEmail: string,
    userCourse: string,
    userCollege: string,
    responseTimeSeconds: number
  ): Promise<void> {
    try {
      console.log(`🔄 Updating leaderboard for ${userName} in ${userCourse}`);
         const courseId = userCourse.replace(/\s+/g, '_'); // Normalize course name
    const studentRef = doc(db, "leaderboards", courseId, "students", userId);
      
      const studentSnap = await getDoc(studentRef);

      if (studentSnap.exists()) {
        // Update existing student
        const currentData = studentSnap.data() as LeaderboardEntry;
        const newTotalSubmissions = currentData.totalSubmissions + 1;
        const newTotalResponseTime = currentData.totalResponseTime + responseTimeSeconds;
        const newAverageSeconds = Math.round(newTotalResponseTime / newTotalSubmissions);

        await updateDoc(studentRef, {
          totalSubmissions: newTotalSubmissions,
          totalResponseTime: newTotalResponseTime,
          averageSeconds: newAverageSeconds,
          lastSubmissionDate: Timestamp.now(),
          updatedAt: Timestamp.now()
        });

        console.log(`✅ Updated ${userName}: ${newTotalSubmissions} submissions, ${newAverageSeconds}s avg`);
      } else {
        // Create new student entry
        const newEntry: LeaderboardEntry = {
          userId,
          userName,
          userEmail,
          userCourse,
          userCollege,
          totalSubmissions: 1,
          totalResponseTime: responseTimeSeconds,
          averageSeconds: responseTimeSeconds,
          lastSubmissionDate: Timestamp.now(),
          updatedAt: Timestamp.now()
        };

        await setDoc(studentRef, newEntry);
        console.log(`🆕 Created new leaderboard entry for ${userName}`);
      }

      // Update course stats
      await this.updateCourseStats(courseId);
      
      // Clear cache to force refresh
      this.clearCache(userCourse);

    } catch (error) {
      console.error("❌ Error updating leaderboard:", error);
    }
  }


  async initializeLeaderboard(course: string): Promise<void> {
  const courseId = course.replace(/\s+/g, '_');
  const statsRef = doc(db, "leaderboards", courseId, "meta", "stats");
  
  const initialStats: LeaderboardStats = {
    totalStudents: 0,
    totalSubmissions: 0,
    avgResponseTime: 0,
    lastUpdated: Timestamp.now()
  };
  
  await setDoc(statsRef, initialStats);
  console.log(`✅ Initialized leaderboard for ${course}`);
}
  /**
   * 📈 Update course-level statistics
   */
  private async updateCourseStats(courseId: string): Promise<void> {
  try {
    const statsRef = doc(db, "leaderboards", courseId, "meta", "stats");
    
    // Get current stats snapshot
    const statsSnap = await getDoc(statsRef);
    const currentStats = statsSnap.exists() ? 
      (statsSnap.data() as LeaderboardStats) : 
      { totalStudents: 0, totalSubmissions: 0, avgResponseTime: 0 };

    // Calculate new stats - we'll keep this simple for now
    const leaderboardRef = collection(db, "leaderboards", courseId, "students");
    const snapshot = await getDocs(leaderboardRef);
    
    let totalSubmissions = 0;
    let totalResponseTime = 0;
    snapshot.docs.forEach(doc => {
      const data = doc.data() as LeaderboardEntry;
      totalSubmissions += data.totalSubmissions;
      totalResponseTime += data.totalResponseTime;
    });

    const newStats: LeaderboardStats = {
      totalStudents: snapshot.size,
      totalSubmissions,
      avgResponseTime: snapshot.size > 0 ? Math.round(totalResponseTime / snapshot.size) : 0,
      lastUpdated: Timestamp.now()
    };

    await setDoc(statsRef, newStats);
  } catch (error) {
    console.error("❌ Error updating course stats:", error);
  }
}

  /**
   * 🔄 Daily leaderboard recalculation (run via Cloud Function or cron)
   * This ensures data accuracy by recalculating from submissions
   */
  async recalculateLeaderboard(course: string): Promise<void> {
    try {
    const courseId = course.replace(/\s+/g, '_');
    const submissions = await this.getRecentSubmissions(courseId, 30);
    
    if (submissions.length === 0) {
      console.log(`No submissions found for ${course}`);
      return;
    }
      
      // Group by student and calculate stats
      const studentStats = new Map<string, {
        userId: string;
        userName: string;
        userEmail: string;
        userCourse: string;
        userCollege: string;
        submissions: any[];
        totalResponseTime: number;
        averageSeconds: number;
      }>();

      submissions.forEach(submission => {
        const { userId, userName, userEmail, userCourse, userCollege } = submission;
        const responseTime = this.calculateResponseTime(submission);
        
        if (!studentStats.has(userId)) {
          studentStats.set(userId, {
            userId,
            userName,
            userEmail,
            userCourse,
            userCollege,
            submissions: [],
            totalResponseTime: 0,
            averageSeconds: 0
          });
        }

        const student = studentStats.get(userId)!;
        student.submissions.push(submission);
        student.totalResponseTime += responseTime;
        student.averageSeconds = Math.round(student.totalResponseTime / student.submissions.length);
      });

      // Batch update leaderboard collection
      const batch = writeBatch(db);
      const leaderboardRef = collection(db, "leaderboards", courseId, "students");

      studentStats.forEach(student => {
        const studentDocRef = doc(leaderboardRef, student.userId);
        const leaderboardEntry: LeaderboardEntry = {
          userId: student.userId,
          userName: student.userName,
          userEmail: student.userEmail,
          userCourse: student.userCourse,
          userCollege: student.userCollege,
          totalSubmissions: student.submissions.length,
          totalResponseTime: student.totalResponseTime,
          averageSeconds: student.averageSeconds,
          lastSubmissionDate: Timestamp.now(),
          updatedAt: Timestamp.now()
        };

        batch.set(studentDocRef, leaderboardEntry);
      });

      await batch.commit();
      console.log(`✅ Recalculated leaderboard for ${course} with ${studentStats.size} students`);

      // Update course stats
      await this.updateCourseStats(courseId);
      
    } catch (error) {
      console.error("❌ Error recalculating leaderboard:", error);
    }
  }

  /**
   * 📅 Get recent submissions for recalculation
   */
 private async getRecentSubmissions(course: string, days: number = 30): Promise<any[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  // Convert normalized course ID back to original course name
  const originalCourse = course.replace(/_/g, ' ');
  
  const q = query(
    collectionGroup(db, "entries"),
    where("userCourse", "==", originalCourse),
    where("createdAt", ">=", Timestamp.fromDate(startDate))
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data());
}
  /**
   * ⏱️ Calculate response time from assignment creation to submission
   */
  private calculateResponseTime(submission: any): number {
  try {
    if (submission.assignmentCreatedAt && submission.createdAt) {
      const assignmentTime = submission.assignmentCreatedAt.toDate();
      const submissionTime = submission.createdAt.toDate();
      const diffMs = submissionTime.getTime() - assignmentTime.getTime();
      return Math.max(1, Math.round(diffMs / 1000)); // At least 1 second
    }
    return 300; // Default 5 minutes
  } catch (error) {
    console.error("Error calculating response time:", error);
    return 300;
  }
}

  /**
   * 📱 Get user's rank in leaderboard
   */
  async getUserRank(userId: string, course: string): Promise<{ rank: number; total: number; userData?: LeaderboardEntry }> {
    try {
      const leaderboardRef = collection(db, "leaderboards", course, "students");
      const allStudentsQuery = query(
        leaderboardRef,
        where("totalSubmissions", ">=", 1),
        orderBy("averageSeconds", "asc"),
        orderBy("totalSubmissions", "desc")
      );

      const snapshot = await getDocs(allStudentsQuery);
      const students = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as LeaderboardEntry[];
      
      const userIndex = students.findIndex(student => student.userId === userId);
      const userData = students.find(student => student.userId === userId);

      return {
        rank: userIndex + 1,
        total: students.length,
        userData
      };
    } catch (error) {
      console.error("❌ Error getting user rank:", error);
      return { rank: 0, total: 0 };
    }
  }

  /**
   * 🗑️ Cache management
   */
  private isCacheValid(timestamp: number): boolean {
    return Date.now() - timestamp < this.CACHE_DURATION;
  }

  clearCache(course?: string): void {
    if (course) {
      const keysToDelete = Array.from(this.cache.keys()).filter(key => key.startsWith(course));
      keysToDelete.forEach(key => this.cache.delete(key));
    } else {
      this.cache.clear();
    }
  }

  /**
   * 📊 Fallback stats calculation
   */
  private async calculateStatsFromLeaderboard(course: string): Promise<LeaderboardStats> {
    const leaderboardRef = collection(db, "leaderboards", course, "students");
    const snapshot = await getDocs(query(leaderboardRef, where("totalSubmissions", ">=", 1)));
    
    let totalSubmissions = 0;
    let totalResponseTime = 0;
    
    snapshot.docs.forEach(doc => {
      const data = doc.data() as LeaderboardEntry;
      totalSubmissions += data.totalSubmissions;
      totalResponseTime += data.totalResponseTime;
    });

    return {
      totalStudents: snapshot.size,
      totalSubmissions,
      avgResponseTime: snapshot.size > 0 ? Math.round(totalResponseTime / snapshot.size) : 0,
      lastUpdated: Timestamp.now()
    };
  }

  /**
   * 🔄 Real-time leaderboard updates (optional)
   */
  subscribeToLeaderboard(course: string, callback: (students: LeaderboardEntry[]) => void): () => void {
    const leaderboardRef = collection(db, "leaderboards", course, "students");
    const topQuery = query(
      leaderboardRef,
      where("totalSubmissions", ">=", 1),
      orderBy("averageSeconds", "asc"),
      orderBy("totalSubmissions", "desc"),
      limit(10)
    );

    return onSnapshot(topQuery, (snapshot) => {
      const students = snapshot.docs.map((doc, index) => ({
        ...doc.data(),
        rank: index + 1
      })) as LeaderboardEntry[];
      
      callback(students);
    });
  }
}

// Export singleton instance
export const optimizedLeaderboardService = new OptimizedLeaderboardService();
export default optimizedLeaderboardService;