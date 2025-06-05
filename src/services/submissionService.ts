
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  Timestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface Submission {
  id?: string;
  userId: string;
  userEmail: string;
  userName: string;
  title: string;
  description: string;
  code: string;
  language: string;
  type: 'classwork' | 'homework';
  submittedAt: Date;
  status: string;
}

export const submissionService = {
  // Add a new submission
  async addSubmission(submission: Omit<Submission, 'id' | 'submittedAt'>) {
    try {
      const docRef = await addDoc(collection(db, 'submissions'), {
        ...submission,
        submittedAt: Timestamp.now(),
      });
      return docRef.id;
    } catch (error) {
      console.error('Error adding submission:', error);
      throw error;
    }
  },

  // Get submissions for a specific user
  async getUserSubmissions(userId: string): Promise<Submission[]> {
    try {
      const q = query(
        collection(db, 'submissions'),
        where('userId', '==', userId),
        orderBy('submittedAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const submissions: Submission[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        submissions.push({
          id: doc.id,
          userId: data.userId,
          userEmail: data.userEmail,
          userName: data.userName,
          title: data.title,
          description: data.description,
          code: data.code,
          language: data.language,
          type: data.type,
          submittedAt: data.submittedAt.toDate(),
          status: data.status,
        });
      });
      
      return submissions;
    } catch (error) {
      console.error('Error getting user submissions:', error);
      throw error;
    }
  },

  // Get all submissions (for admin)
  async getAllSubmissions(): Promise<Submission[]> {
    try {
      const q = query(
        collection(db, 'submissions'),
        orderBy('submittedAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const submissions: Submission[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        submissions.push({
          id: doc.id,
          userId: data.userId,
          userEmail: data.userEmail,
          userName: data.userName,
          title: data.title,
          description: data.description,
          code: data.code,
          language: data.language,
          type: data.type,
          submittedAt: data.submittedAt.toDate(),
          status: data.status,
        });
      });
      
      return submissions;
    } catch (error) {
      console.error('Error getting all submissions:', error);
      throw error;
    }
  }
};
