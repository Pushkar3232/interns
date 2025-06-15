// src/services/submissionService.ts

import { db } from "@/lib/firebase";
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  Timestamp,
  getDoc,
  orderBy,
  doc, // ← ✅ ADD THIS
} from "firebase/firestore";


export interface Submission {
  id?: string;
  userId: string;
  userEmail: string;
  userName: string;
  title: string;
  description?: string;
  fileUrl: string; // ✅ NEW
  type: "homework" | "classwork";
  status: "submitted" | "reviewed";
  createdAt?: Timestamp;
}

const addSubmission = async (data: Submission) => {
  const submissionRef = collection(db, "submissions");
  await addDoc(submissionRef, {
    ...data,
    createdAt: Timestamp.now(),
  });
};

const getUserSubmissions = async (userId: string): Promise<Submission[]> => {
  const q = query(collection(db, "submissions"), where("userId", "==", userId));
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({
    id: doc.id,
    ...(doc.data() as Submission),
  }));
};
async function hasSubmitted(userId: string, assignmentId: string): Promise<boolean> {
  const q = query(
    collection(db, "submissions"),
    where("userId", "==", userId),
    where("assignmentId", "==", assignmentId)
  );
  const snap = await getDocs(q);
  return !snap.empty;
}
export const submissionService = {
  addSubmission,
  getUserSubmissions,
  hasSubmitted,
  getAllSubmissions: async () => {
    try {
      const snapshot = await getDocs(collection(db, "submissions"));

      const submissions = await Promise.all(
        snapshot.docs.map(async (docSnap) => {
          const data = docSnap.data();
          const userId = data.userId;

          let userCollege = "";
          let userCourse = "";

          if (userId) {
            try {
              const userDoc = await getDoc(doc(db, "users", userId));
              if (userDoc.exists()) {
                const userData = userDoc.data();
                userCollege = userData.college || "N/A";
                userCourse = userData.course || "N/A";
              }
            } catch (err) {
              console.warn(`⚠️ Failed to fetch user (${userId}) info`, err);
            }
          }

          return {
            ...data,
            id: docSnap.id,
            userCollege,
            userCourse,
          };
        })
      );

      return submissions;
    } catch (error) {
      console.error("❌ Error loading all submissions:", error);
      return [];
    }
  },
};
