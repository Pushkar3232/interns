// src/services/submissionService.ts

import { db } from "@/lib/firebase";
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  Timestamp,
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

export const submissionService = {
  addSubmission,
  getUserSubmissions,
};
