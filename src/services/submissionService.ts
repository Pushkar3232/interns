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
  collectionGroup,
  runTransaction,
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

export async function saveSubmission(data: Submission) {
  const {
    assignmentId,
    assignmentCreatedAt,
    userId,
    userCourse,
    userName,
    userEmail,
    userCollege,
  } = data;

  const dateString = format(assignmentCreatedAt.toDate(), "dd-MM-yyyy");
  const collectionId = `${userCourse}_${assignmentId}_${dateString}`;

  const now = Timestamp.now();
  const submissionDocRef = doc(db, "submissions", collectionId, "entries", userId);
  const submissionData = {
    ...data,
    status: "submitted" as const,
    createdAt: now,
  };

  await setDoc(submissionDocRef, submissionData);
  console.log("✅ Submission saved at:", submissionDocRef.path);

  const userDocRef = doc(db, "users", userCourse, "students", userId);
  await updateDoc(userDocRef, {
    submissions: arrayUnion(collectionId),
  });
  console.log("📌 Updated user index");

  const responseTimeSeconds = calculateResponseTime(
    assignmentCreatedAt,
    submissionData.createdAt!
  );

  await optimizedLeaderboardService.updateStudentLeaderboard(
    userId,
    userName,
    userEmail,
    userCourse,
    userCollege,
    responseTimeSeconds
  );

  console.log(
    `🏆 Updated leaderboard for ${userName}: ${responseTimeSeconds}s response time`
  );
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