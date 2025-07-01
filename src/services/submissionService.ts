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
  startAfter, // 👈 ADD THIS LINE
  collectionGroup,
  runTransaction,
  writeBatch,
  arrayRemove,
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

// Helper function to validate submission path format
function isValidSubmissionPath(path: string): boolean {
  // New format: {course}_{assignmentId}_{date}
  const pathPattern = /^[^_]+_[^_]+_\d{2}-\d{2}-\d{4}$/;
  return pathPattern.test(path);
}


export async function saveSubmission(submission: {
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
}) {
  try {
    const createdAt = Timestamp.now();

    const createdDate = submission.assignmentCreatedAt.toDate().toLocaleDateString("en-GB"); // DD/MM/YYYY
    const formattedDate = createdDate.replace(/\//g, "-"); // convert to DD-MM-YYYY

    const submissionId = `${submission.assignmentId}_${submission.userId}`;
    const path = `submissions/${submission.userCourse}_${submission.assignmentId}_${formattedDate}/entries/${submissionId}`;

    const data = {
      ...submission,
      createdAt,
      status: "submitted",
    };

    await setDoc(doc(db, path), data);

    console.log("✅ Submission saved to:", path);
  } catch (err) {
    console.error("❌ Failed to save submission:", err);
    throw err;
  }
}

function calculateResponseTime(
  assignmentCreatedAt: Timestamp,
  submissionCreatedAt: Timestamp
): number {
  try {
    const assignmentTime = assignmentCreatedAt.toDate();
    const submissionTime = submissionCreatedAt.toDate();
    const diffMs = submissionTime.getTime() - assignmentTime.getTime();
    const diffSeconds = Math.round(diffMs / 1000);
    return Math.max(1, Math.min(diffSeconds, 86400));
  } catch (error) {
    console.error("Error calculating response time:", error);
    return 300;
  }
}

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

export async function getUserSubmissions(
  uid: string,
  course: string,
  pageSize = 3,
  lastDoc?: QueryDocumentSnapshot
): Promise<{ submissions: Submission[]; lastDoc: QueryDocumentSnapshot | null }> {
  const baseQuery = query(
    collectionGroup(db, "entries"),
    where("userId", "==", uid),
    where("userCourse", "==", course),
    orderBy("createdAt", "desc"),
    ...(lastDoc ? [startAfter(lastDoc)] : []),
    limit(pageSize)
  );

  const snap = await getDocs(baseQuery);
  const submissions: Submission[] = snap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate() ?? null,
  }));

  return {
  submissions,
  lastDoc: snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null,
};
}

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
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
}
/**
 * Fetches admin submissions from the 'entries' subcollection.
 * - If `filterDate` is passed: fetches only that day's submissions.
 * - If no date is passed: fetches all (use carefully).
 */
export async function getAdminSubmissions(filterDate?: Date) {
  const entriesGroup = collectionGroup(db, "entries");

  let q;

  if (filterDate) {
    // 🔹 Only today's entries
    const startOfDay = new Date(filterDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(filterDate);
    endOfDay.setHours(23, 59, 59, 999);

    q = query(
      entriesGroup,
      where("createdAt", ">=", Timestamp.fromDate(startOfDay)),
      where("createdAt", "<=", Timestamp.fromDate(endOfDay))
    );
  } else {
    // ⚠️ Fallback: all entries (use only for "All" button)
    q = query(entriesGroup, limit(1000)); // 🔹 Optional: cap to avoid heavy reads
  }

  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as any),
  }));
}


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

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Submission),
    }));
  } catch (error) {
    console.error(`Error fetching submissions for ${collectionId}:`, error);
    return [];
  }
}

export async function getSubmissionStats(course: string) {
  try {
    const submissions = await getLatestSubmissions(course);

    const stats = {
      totalSubmissions: submissions.length,
      totalStudents: new Set(submissions.map((s) => s.userEmail)).size,
      totalColleges: new Set(submissions.map((s) => s.userCollege)).size,
      homeworkCount: submissions.filter((s) => s.type === "homework").length,
      classworkCount: submissions.filter((s) => s.type === "classwork").length,
      collegeBreakdown: submissions.reduce((acc, sub) => {
        const college = sub.userCollege || "Unknown";
        acc[college] = (acc[college] || 0) + 1;
        return acc;
      }, {} as { [key: string]: number }),
      dailyBreakdown: submissions.reduce((acc, sub) => {
        if (sub.assignmentCreatedAt?.seconds) {
          const date = new Date(sub.assignmentCreatedAt.seconds * 1000).toDateString();
          acc[date] = (acc[date] || 0) + 1;
        }
        return acc;
      }, {} as { [key: string]: number }),
    };

    return stats;
  } catch (error) {
    console.error("Error getting submission stats:", error);
    throw error;
  }
}


export const submissionService = {
  saveSubmission,
  hasSubmitted,
  getUserSubmissions,
  getLatestSubmissions,
  getAssignmentSubmissions,
  getSubmissionStats,
};

export default submissionService;