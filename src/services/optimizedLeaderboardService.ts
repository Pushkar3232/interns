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
  totalResponseTime: number;
  averageSeconds: number;
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
  private readonly CACHE_DURATION = 5 * 60 * 1000;

  private isCacheValid(timestamp: number): boolean {
    return Date.now() - timestamp < this.CACHE_DURATION;
  }

  async getTopStudents(course: string, limitCount: number = 10): Promise<LeaderboardEntry[]> {
    try {
      const cacheKey = `${course}_top_${limitCount}`;
      const cached = this.cache.get(cacheKey);
      if (cached && this.isCacheValid(cached.timestamp)) {
        return cached.data;
      }

      const leaderboardRef = collection(db, "leaderboards", course, "students");
      const topQuery = query(
        leaderboardRef,
        where("totalSubmissions", ">=", 1),
        orderBy("totalSubmissions", "desc"),  // Most submissions first
        orderBy("averageSeconds", "asc"),     // Then sort by least avg time
        limit(limitCount)
      );


      const snapshot = await getDocs(topQuery);
      if (snapshot.empty) return [];

      const topStudents = snapshot.docs.map((doc, index) => ({
        ...doc.data(),
        rank: index + 1
      })) as LeaderboardEntry[];

      this.cache.set(cacheKey, { data: topStudents, timestamp: Date.now() });
      return topStudents;
    } catch (error) {
      console.error("Error in getTopStudents:", error);
      return [];
    }
  }

  async getUserRank(userId: string, course: string): Promise<{ rank: number; total: number; userData?: LeaderboardEntry }> {
    try {
      const leaderboardRef = collection(db, "leaderboards", course, "students");
      const userDocRef = doc(db, "leaderboards", course, "students", userId);
      const userSnap = await getDoc(userDocRef);

      if (!userSnap.exists()) return { rank: 0, total: 0 };

      const data = userSnap.data() as LeaderboardEntry;
      const userAverage = data.averageSeconds;
      const userTotalSubs = data.totalSubmissions;

      const lessAvgQuery = query(
        leaderboardRef,
        where("averageSeconds", "<", userAverage)
      );
      const lessCountSnap = await getDocs(lessAvgQuery);
      let rank = lessCountSnap.size + 1;

      const tieQuery = query(
        leaderboardRef,
        where("averageSeconds", "==", userAverage),
        where("totalSubmissions", ">", userTotalSubs)
      );
      const tieCountSnap = await getDocs(tieQuery);
      rank += tieCountSnap.size;

      const totalQuery = query(leaderboardRef, where("totalSubmissions", ">=", 1));
      const totalSnap = await getDocs(totalQuery);
      const totalStudents = totalSnap.size;

      return { rank, total: totalStudents, userData: { ...data, rank } };
    } catch (error) {
      console.error("Error getting user rank:", error);
      return { rank: 0, total: 0 };
    }
  }

  async updateStudentLeaderboard(
    userId: string,
    userName: string,
    userEmail: string,
    userCourse: string,
    userCollege: string,
    responseTimeSeconds: number
  ): Promise<void> {
    try {
      const courseId = userCourse.replace(/\s+/g, '_');
      const studentRef = doc(db, "leaderboards", courseId, "students", userId);
      const studentSnap = await getDoc(studentRef);

      if (studentSnap.exists()) {
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
      } else {
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
      }

      await this.updateCourseStats(courseId);
      this.clearCache(userCourse);

    } catch (error) {
      console.error("Error updating leaderboard:", error);
    }
  }

  async getLeaderboardStats(course: string): Promise<LeaderboardStats> {
    try {
      const statsRef = doc(db, "leaderboards", course, "meta", "stats");
      const statsSnap = await getDoc(statsRef);
      if (statsSnap.exists()) return statsSnap.data() as LeaderboardStats;
      return await this.calculateStatsFromLeaderboard(course);
    } catch (error) {
      console.error("Error getting stats:", error);
      return {
        totalStudents: 0,
        totalSubmissions: 0,
        avgResponseTime: 0,
        lastUpdated: Timestamp.now()
      };
    }
  }

  private async updateCourseStats(courseId: string): Promise<void> {
    try {
      const statsRef = doc(db, "leaderboards", courseId, "meta", "stats");
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
      console.error("Error updating course stats:", error);
    }
  }

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

  clearCache(course?: string): void {
    if (course) {
      const keysToDelete = Array.from(this.cache.keys()).filter(key => key.startsWith(course));
      keysToDelete.forEach(key => this.cache.delete(key));
    } else {
      this.cache.clear();
    }
  }
}

export const optimizedLeaderboardService = new OptimizedLeaderboardService();
export default optimizedLeaderboardService;