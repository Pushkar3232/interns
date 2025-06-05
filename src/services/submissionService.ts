// submissionService.ts
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  Timestamp,
  doc,
  setDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase"; // Update path based on your structure

export interface Submission {
  id?: string;
  userId: string;
  userEmail: string;
  userName: string;
  title: string;
  description?: string;
  code: string;
  language: string;
  type: "classwork" | "homework";
  status: string;
  submittedAt?: Date;
}

const submissionService = {
  // Add a new submission for a user (under /users/{userId}/submissions/)
  async addSubmission(submission: Submission) {
    const userSubmissionsRef = collection(
      db,
      "users",
      submission.userId,
      "submissions"
    );

    const dataToSave = {
      ...submission,
      submittedAt: Timestamp.now(),
    };

    await addDoc(userSubmissionsRef, dataToSave);
  },

  // Get all submissions for a specific user
  async getUserSubmissions(userId: string): Promise<Submission[]> {
    const userSubmissionsRef = collection(db, "users", userId, "submissions");

    const snapshot = await getDocs(userSubmissionsRef);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Submission),
      submittedAt: doc.data().submittedAt?.toDate(),
    }));
  },
};

export { submissionService };
