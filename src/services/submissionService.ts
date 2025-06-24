import { db } from "@/lib/firebase";
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  arrayUnion,
  Timestamp,
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  collectionGroup
} from "firebase/firestore";
import { format } from "date-fns";
import { optimizedLeaderboardService } from "./optimizedLeaderboardService";

interface Submission {
  id?: string;
  assignmentId: string;
  assignmentCreatedAt: Timestamp;
  title: string;
  type: string;
  description: string;
  fileUrl: string;
  userCollege: string;
  userCourse: string;
  userEmail: string;
  userId: string;
  userName: string;
  status?: "submitted";
  createdAt?: Timestamp;
}

/**
 * 🚀 OPTIMIZED: Save submission + Update leaderboard in one go
 */
export async function saveSubmission(data: Submission) {
  const { assignmentId, assignmentCreatedAt, userId, userCourse, userName, userEmail, userCollege } = data;
  const dateString = format(assignmentCreatedAt.toDate(), "dd-MM-yyyy");
  const collectionId = `${userCourse}_${assignmentId}_${dateString}`;
  
  // 1. Save submission (as before)
  const submissionDocRef = doc(db, "submissions", collectionId, "entries", userId);
  const submissionData = { 
    ...data, 
    status: "submitted" as const, 
    createdAt: Timestamp.now() 
  };
  
  await setDoc(submissionDocRef, submissionData);
  console.log("✅ Submission saved at:", submissionDocRef.path);
  
  // 2. Update user's submissions index (as before)
  const userDocRef = doc(db, "users", userCourse, "students", userId);
  await updateDoc(userDocRef, { 
    submissions: arrayUnion(collectionId) 
  });
  console.log("📌 Updated user index");
  
  // 3. 🎯 NEW: Calculate response time and update leaderboard
  const responseTimeSeconds = calculateResponseTime(assignmentCreatedAt, submissionData.createdAt!);
  
  await optimizedLeaderboardService.updateStudentLeaderboard(
    userId,
    userName,
    userEmail,
    userCourse,
    userCollege,
    responseTimeSeconds
  );
  
  console.log(`🏆 Updated leaderboard for ${userName}: ${responseTimeSeconds}s response time`);
}

/**
 * ⏱️ Calculate response time from assignment creation to submission
 */
// function calculateResponseTime(assignmentCreatedAt: Timestamp, submissionCreatedAt: Timestamp): number {
//   try {
//     const assignmentTime = assignmentCreatedAt.toDate();
//     const submissionTime = submissionCreatedAt.toDate();
//     const diffMs = submissionTime.getTime() - assignmentTime.getTime();
//     const diffSeconds = Math.round(diffMs / 1000);
    
//     // Ensure minimum 1 second, maximum 24 hours (86400 seconds)
//     return Math.max(1, Math.min(diffSeconds, 86400));
//   } catch (error) {
//     console.error("Error calculating response time:", error);
//     return 300; // Default 5 minutes
//   }
// }

/**
 * Check if user already submitted for this assignment on that date.
 */
export async function hasSubmitted(
  userId: string,
  course: string,
  assignmentId: string,
  assignmentCreatedAt: Timestamp
): Promise<boolean> {
  const dateString = format(assignmentCreatedAt.toDate(), "dd-MM-yyyy");
  const collectionId = `${course}_${assignmentId}_${dateString}`;
  const submissionRef = doc(db, "submissions", collectionId, "entries", userId);
  const snap = await getDoc(submissionRef);
  return snap.exists();
}

/**
 * Fetch all submissions for a given user and course efficiently.
 */
export async function getUserSubmissions(
  uid: string,
  course: string
): Promise<Submission[]> {
  const userDocRef = doc(db, "users", course, "students", uid);
  const userSnap = await getDoc(userDocRef);
  
  if (!userSnap.exists()) return [];
  
  const userData = userSnap.data();
  const submissionPaths: string[] = userData.submissions || [];
  const allSubmissions: Submission[] = [];
  
  for (const collectionId of submissionPaths) {
    try {
      const submissionRef = doc(db, "submissions", collectionId, "entries", uid);
      const snap = await getDoc(submissionRef);
      if (snap.exists()) {
        allSubmissions.push({ id: snap.id, ...(snap.data() as Submission) });
      }
    } catch (err) {
      console.warn("⚠️ Skipping invalid path:", collectionId, err);
    }
  }
  
  return allSubmissions;
}

/**
 * Get all submissions for a specific course (for Admin Dashboard)
 */
export async function getLatestSubmissions(course: string) {
  const entries = collectionGroup(db, "entries");
  const q = query(
    entries,
    where("userCourse", "==", course),
    orderBy("createdAt", "desc"),
    orderBy("__name__", "asc")
  );

  const snap = await getDocs(q);
  console.log("💡 submissions found:", snap.size);
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
}

/**
 * Get submissions for a specific assignment and date (optimized)
 */
export async function getAssignmentSubmissions(
  course: string,
  assignmentId: string,
  assignmentDate: Date
): Promise<Submission[]> {
  const dateString = format(assignmentDate, "dd-MM-yyyy");
  const collectionId = `${course}_${assignmentId}_${dateString}`;
  
  try {
    const entriesRef = collection(db, "submissions", collectionId, "entries");
    const snapshot = await getDocs(entriesRef);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...(doc.data() as Submission)
    }));
  } catch (error) {
    console.error(`Error fetching submissions for ${collectionId}:`, error);
    return [];
  }
}

/**
 * Get submission statistics for admin dashboard (optimized)
 */
export async function getSubmissionStats(course: string) {
  try {
    const submissions = await getLatestSubmissions(course);
    
    const stats = {
      totalSubmissions: submissions.length,
      totalStudents: new Set(submissions.map(s => s.userEmail)).size,
      totalColleges: new Set(submissions.map(s => s.userCollege)).size,
      homeworkCount: submissions.filter(s => s.type === 'homework').length,
      classworkCount: submissions.filter(s => s.type === 'classwork').length,
      collegeBreakdown: submissions.reduce((acc, sub) => {
        const college = sub.userCollege || 'Unknown';
        acc[college] = (acc[college] || 0) + 1;
        return acc;
      }, {} as { [key: string]: number }),
      dailyBreakdown: submissions.reduce((acc, sub) => {
        if (sub.assignmentCreatedAt?.seconds) {
          const date = new Date(sub.assignmentCreatedAt.seconds * 1000).toDateString();
          acc[date] = (acc[date] || 0) + 1;
        }
        return acc;
      }, {} as { [key: string]: number })
    };
    
    return stats;
  } catch (error) {
    console.error('Error getting submission stats:', error);
    throw error;
  }
}

/**
 * 🔄 MIGRATION: One-time function to populate leaderboard from existing submissions
 * Run this once to migrate existing data to the new leaderboard structure
 */
// export async function migrateToOptimizedLeaderboard(course: string) {
//   console.log(`🔄 Starting migration for ${course}`);
  
//   try {
//     // Get all existing submissions for the course
//     const submissions = await getLatestSubmissions(course);
    
//     // Group by user and calculate stats
//     const userStats = new Map<string, {
//       userId: string;
//       userName: string;
//       userEmail: string;
//       userCourse: string;
//       userCollege: string;
//       totalSubmissions: number;
//       totalResponseTime: number;
//       averageSeconds: number;
//     }>();

//     submissions.forEach(submission => {
//       const { userId, userName, userEmail, userCourse, userCollege } = submission;
//       const responseTime = calculateResponseTime(submission.assignmentCreatedAt, submission.createdAt);
      
//       if (!userStats.has(userId)) {
//         userStats.set(userId, {
//           userId,
//           userName,
//           userEmail,
//           userCourse,
//           userCollege,
//           totalSubmissions: 0,
//           totalResponseTime: 0,
//           averageSeconds: 0
//         });
//       }

//       const user = userStats.get(userId)!;
//       user.totalSubmissions++;
//       user.totalResponseTime += responseTime;
//       user.averageSeconds = Math.round(user.totalResponseTime / user.totalSubmissions);
//     });

//     // Update leaderboard for each user
//     for (const [userId, stats] of userStats) {
//       await optimizedLeaderboardService.updateStudentLeaderboard(
//         stats.userId,
//         stats.userName,
//         stats.userEmail,
//         stats.userCourse,
//         stats.userCollege,
//         0 // We'll set the correct average in the next step
//       );
      
//       // Update with correct stats
//       const studentRef = doc(db, "leaderboards", course, "students", userId);
//       await updateDoc(studentRef, {
//         totalSubmissions: stats.totalSubmissions,
//         totalResponseTime: stats.totalResponseTime,
//         averageSeconds: stats.averageSeconds
//       });
//     }

//     console.log(`✅ Migration completed for ${course}: ${userStats.size} students migrated`);
//   } catch (error) {
//     console.error(`❌ Migration failed for ${course}:`, error);
//   }
// }

// Export all functions and create service object
export const submissionService = {
  saveSubmission,
  hasSubmitted,
  getUserSubmissions,
  getLatestSubmissions,
  getAssignmentSubmissions,
  getSubmissionStats,
  // migrateToOptimizedLeaderboard
};

export default submissionService;