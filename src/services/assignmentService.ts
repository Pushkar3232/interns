import { db } from "@/lib/firebase";
import { collection, getDocs, Timestamp, doc, setDoc } from "firebase/firestore";

export interface Assignment {
  id: string;
  title: string;
  type: string;
  course: string;
  description?: string;
  deadline?: Timestamp | any;
  createdAt?: Timestamp | Date | null;
}

export const assignmentService = {
  getAssignmentsForCourse: async (course: string): Promise<Assignment[]> => {
    try {
      console.log(`🔍 Fetching assignments for course: ${course}`);
      
      // Updated path to match your new structure: /assignments/{course}/items
      const assignmentRef = collection(db, "assignments", course, "items");
      const snapshot = await getDocs(assignmentRef);
      
      console.log(`📦 Found ${snapshot.docs.length} assignments in ${course}`);
      
      return snapshot.docs.map((doc) => {
        const data = doc.data();
        console.log(`📄 Assignment ${doc.id}:`, data);
        
        return {
          id: doc.id,
          title: data.title || "Untitled Assignment",
          type: data.type || "Unknown",
          course: course, // Add course to the returned data
          description: data.description || "",
          deadline: data.deadline,
          createdAt: data.createdAt instanceof Timestamp 
            ? data.createdAt 
            : data.createdAt?.toDate?.() 
            ? data.createdAt.toDate() 
            : null,
        };
      });
    } catch (error) {
      console.error(`❌ Error fetching assignments for ${course}:`, error);
      throw error;
    }
  },

  // NEW: Get all assignments across all courses (for admin dashboard)
  getAllAssignments: async (): Promise<Assignment[]> => {
    try {
      console.log('🔍 Fetching all assignments...');
      
      const validCourses = [
        "Mobile Application Development",
        "Web Development", 
        "Data Analysis"
      ];
      
      const allAssignments: Assignment[] = [];
      
      for (const course of validCourses) {
        try {
          const courseAssignments = await assignmentService.getAssignmentsForCourse(course);
          allAssignments.push(...courseAssignments);
        } catch (error) {
          console.warn(`⚠️ Error fetching assignments for ${course}:`, error);
        }
      }
      
      // Sort by creation date (newest first)
      allAssignments.sort((a, b) => {
        if (!a.createdAt || !b.createdAt) return 0;
        const aTime = a.createdAt instanceof Timestamp ? a.createdAt.seconds : new Date(a.createdAt).getTime() / 1000;
        const bTime = b.createdAt instanceof Timestamp ? b.createdAt.seconds : new Date(b.createdAt).getTime() / 1000;
        return bTime - aTime;
      });
      
      console.log(`✅ Total assignments loaded: ${allAssignments.length}`);
      return allAssignments;
      
    } catch (error) {
      console.error('❌ Error fetching all assignments:', error);
      throw error;
    }
  },

  // NEW: Create a new assignment
  createAssignment: async (assignmentData: Omit<Assignment, 'id' | 'createdAt'>): Promise<string> => {
    try {
      const assignmentId = `assignment_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const assignmentRef = doc(db, "assignments", assignmentData.course, "items", assignmentId);
      
      const newAssignment = {
        ...assignmentData,
        createdAt: Timestamp.now()
      };
      
      await setDoc(assignmentRef, newAssignment);
      console.log(`✅ Assignment created: ${assignmentId} in ${assignmentData.course}`);
      
      return assignmentId;
    } catch (error) {
      console.error('❌ Error creating assignment:', error);
      throw error;
    }
  },

  // Helper function to validate course names
  validateCourse: (course: string): boolean => {
    const validCourses = [
      "Mobile Application Development",
      "Web Development", 
      "Data Analysis"
    ];
    return validCourses.includes(course);
  }
};