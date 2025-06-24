// src/services/leaderboardService.ts

import {
  getFirestore,
  collection,
  getDocs,
  orderBy,
  query,
  limit,
  where,
  startAfter,
  DocumentData,
  QueryDocumentSnapshot
} from "firebase/firestore";

const db = getFirestore();

export interface LeaderboardEntry {
  id: string;
  name: string;
  email: string;
  college: string;
  course: string;
  avgMinutes: number;
  count: number;
  lastSubmissionDate?: string;
}

interface LeaderboardStats {
  totalStudents: number;
  totalSubmissions: number;
  avgResponseTime: number;
}

// Cache to reduce duplicate reads
const leaderboardCache = new Map<string, {
  data: LeaderboardEntry[];
  stats: LeaderboardStats;
  timestamp: number;
  lastDoc?: QueryDocumentSnapshot<DocumentData>;
}>();

// Cache duration: 5 minutes
const CACHE_DURATION = 5 * 60 * 1000;

const isCacheValid = (timestamp: number): boolean => {
  return Date.now() - timestamp < CACHE_DURATION;
};

export const leaderboardService = {
  // ✅ Optimized: Get only top students with Firebase ordering
  getTopStudents: async (course: string, limitCount: number = 10): Promise<LeaderboardEntry[]> => {
    try {
      console.log("🔍 Getting top students for course:", course, "limit:", limitCount);

      // Check cache first
      const cacheKey = `${course}_top_${limitCount}`;
      const cached = leaderboardCache.get(cacheKey);
      
      if (cached && isCacheValid(cached.timestamp)) {
        console.log("📦 Returning cached data for", course);
        return cached.data;
      }

      // OPTIMIZED: Use Firebase ordering and limits to reduce reads
      const studentsRef = collection(db, `users/${course}/students`); // Course-specific collection
      
      // Query with Firebase ordering - only get what we need
      const topStudentsQuery = query(
        studentsRef,
        where("count", ">=", 1), // Only students with submissions
        orderBy("avgMinutes", "asc"), // Sort by best time first
        orderBy("count", "desc"), // Secondary sort by submission count
        limit(limitCount) // CRITICAL: Limit Firebase reads
      );

      const snap = await getDocs(topStudentsQuery);
      
      const topStudents = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as LeaderboardEntry[];

      console.log(`✅ Fetched ${topStudents.length} students with ${snap.docs.length} reads for ${course}`);

      // Cache the results
      leaderboardCache.set(cacheKey, {
        data: topStudents,
        stats: { totalStudents: 0, totalSubmissions: 0, avgResponseTime: 0 }, // Will be updated separately
        timestamp: Date.now(),
        lastDoc: snap.docs[snap.docs.length - 1]
      });

      return topStudents;
    } catch (error) {
      console.error("❌ Error in getTopStudents:", error);
      
      // Fallback to original structure if new structure doesn't exist
      return await this.getTopStudentsLegacy(course, limitCount);
    }
  },

  // ✅ Fallback method for existing structure
  getTopStudentsLegacy: async (course: string, limitCount: number = 10): Promise<LeaderboardEntry[]> => {
    try {
      console.log("🔄 Using legacy structure for", course);
      
      const studentsRef = collection(db, "users");
      const courseQuery = query(
        studentsRef,
        where("course", "==", course),
        where("count", ">=", 1), // Only active students
        orderBy("avgMinutes", "asc"),
        limit(limitCount * 2) // Get a bit more to account for filtering
      );

      const snap = await getDocs(courseQuery);
      
      const students = snap.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as LeaderboardEntry))
        .slice(0, limitCount);

      console.log(`✅ Legacy: Got ${students.length} students with ${snap.docs.length} reads`);
      return students;
    } catch (error) {
      console.error("❌ Error in legacy method:", error);
      return [];
    }
  },

  // ✅ Optimized stats with aggregation
  getLeaderboardStats: async (course: string): Promise<LeaderboardStats> => {
    try {
      console.log("📊 Getting optimized stats for:", course);

      // Check cache
      const cacheKey = `${course}_stats`;
      const cached = leaderboardCache.get(cacheKey);
      
      if (cached && isCacheValid(cached.timestamp)) {
        console.log("📦 Returning cached stats for", course);
        return cached.stats;
      }

      // Try to get from course-specific collection first
      try {
        const studentsRef = collection(db, `users/${course}/students`);
        const statsQuery = query(
          studentsRef,
          where("count", ">=", 1)
        );

        const snap = await getDocs(statsQuery);
        
        const stats = this.calculateStats(snap.docs);
        
        // Update cache
        const existingCache = leaderboardCache.get(`${course}_top_10`) || {
          data: [],
          stats,
          timestamp: Date.now()
        };
        existingCache.stats = stats;
        leaderboardCache.set(cacheKey, existingCache);

        console.log("✅ Optimized stats calculated:", stats);
        return stats;
      } catch (error) {
        // Fallback to legacy structure
        return await this.getLeaderboardStatsLegacy(course);
      }
    } catch (error) {
      console.error("❌ Error in getLeaderboardStats:", error);
      return { totalStudents: 0, totalSubmissions: 0, avgResponseTime: 0 };
    }
  },

  // ✅ Legacy stats method
  getLeaderboardStatsLegacy: async (course: string): Promise<LeaderboardStats> => {
    const studentsRef = collection(db, "users");
    const courseQuery = query(
      studentsRef,
      where("course", "==", course),
      where("count", ">=", 1)
    );

    const snap = await getDocs(courseQuery);
    return this.calculateStats(snap.docs);
  },

  // ✅ Helper to calculate stats
  calculateStats: (docs: QueryDocumentSnapshot<DocumentData>[]): LeaderboardStats => {
    let totalSubmissions = 0;
    let totalTime = 0;
    let studentsWithSubmissions = 0;

    docs.forEach(doc => {
      const data = doc.data();
      if (data.count && data.count > 0) {
        totalSubmissions += data.count;
        totalTime += data.avgMinutes || 0;
        studentsWithSubmissions++;
      }
    });

    const avgResponseTime = studentsWithSubmissions > 0 
      ? totalTime / studentsWithSubmissions 
      : 0;

    return {
      totalStudents: studentsWithSubmissions,
      totalSubmissions,
      avgResponseTime: Math.round(avgResponseTime * 60)
    };
  },

  // ✅ Optimized pagination with cursor-based approach
  getMoreStudents: async (course: string, skip: number, limitCount: number = 10): Promise<LeaderboardEntry[]> => {
    try {
      console.log(`📄 Getting more students for ${course}, skip: ${skip}, limit: ${limitCount}`);

      // Use cached lastDoc for pagination
      const cacheKey = `${course}_top_10`;
      const cached = leaderboardCache.get(cacheKey);
      
      if (cached?.lastDoc && skip === 10) { // First "load more"
        const studentsRef = collection(db, `users/${course}/students`);
        
        const nextQuery = query(
          studentsRef,
          where("count", ">=", 1),
          orderBy("avgMinutes", "asc"),
          orderBy("count", "desc"),
          startAfter(cached.lastDoc), // Cursor-based pagination
          limit(limitCount)
        );

        const snap = await getDocs(nextQuery);
        
        const moreStudents = snap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as LeaderboardEntry[];

        console.log(`✅ Got ${moreStudents.length} more students with cursor pagination`);
        return moreStudents;
      }

      // Fallback to legacy method
      return await this.getMoreStudentsLegacy(course, skip, limitCount);
    } catch (error) {
      console.error("❌ Error in getMoreStudents:", error);
      return await this.getMoreStudentsLegacy(course, skip, limitCount);
    }
  },

  // ✅ Legacy method for more students
  getMoreStudentsLegacy: async (course: string, skip: number, limitCount: number = 10): Promise<LeaderboardEntry[]> => {
    const studentsRef = collection(db, "users");
    const courseQuery = query(
      studentsRef,
      where("course", "==", course),
      where("count", ">=", 1),
      orderBy("avgMinutes", "asc"),
      limit(skip + limitCount) // Not ideal, but works with current structure
    );

    const snap = await getDocs(courseQuery);
    
    const allStudents = snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as LeaderboardEntry[];

    return allStudents.slice(skip, skip + limitCount);
  },

  // ✅ Clear cache when needed
  clearCache: (course?: string) => {
    if (course) {
      // Clear specific course cache
      const keysToDelete = Array.from(leaderboardCache.keys())
        .filter(key => key.startsWith(course));
      keysToDelete.forEach(key => leaderboardCache.delete(key));
    } else {
      // Clear all cache
      leaderboardCache.clear();
    }
    console.log(`🗑️ Cache cleared for ${course || 'all courses'}`);
  },

  // ✅ Preload data for better UX
  preloadData: async (course: string) => {
    console.log("⚡ Preloading data for", course);
    await Promise.all([
      this.getTopStudents(course, 10),
      this.getLeaderboardStats(course)
    ]);
  }
};