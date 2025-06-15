// src/utils/leaderboardUtils.ts
import { Timestamp } from "firebase/firestore";

interface Submission {
  userId: string;
  userName: string;
  userEmail: string;
  userCourse: string;
  assignmentId: string;
  createdAt: Timestamp | Date;
}

interface Assignment {
  id: string;
  createdAt: Timestamp | Date;
}

interface LeaderboardEntry {
  userId: string;
  userName: string;
  userEmail: string;
  userCourse: string;
  averageSeconds: number;
  totalSubmissions: number;
}

export function calculateLeaderboard(
  submissions: Submission[],
  assignments: Assignment[]
): LeaderboardEntry[] {
  const assignmentMap: Record<string, Assignment> = {};
  assignments.forEach(a => {
    assignmentMap[a.id] = a;
  });

  const studentTimes: Record<string, { totalSeconds: number; count: number; userData: Submission }> = {};

  for (const sub of submissions) {
    const assignment = assignmentMap[sub.assignmentId];
    if (!assignment) continue;

    const subTime = sub.createdAt instanceof Timestamp
      ? sub.createdAt.toDate().getTime()
      : new Date(sub.createdAt).getTime();

    const assignTime = assignment.createdAt instanceof Timestamp
      ? assignment.createdAt.toDate().getTime()
      : new Date(assignment.createdAt).getTime();

    const timeDiffSeconds = Math.max(0, Math.floor((subTime - assignTime) / 1000));

    if (!studentTimes[sub.userId]) {
      studentTimes[sub.userId] = {
        totalSeconds: 0,
        count: 0,
        userData: sub
      };
    }

    studentTimes[sub.userId].totalSeconds += timeDiffSeconds;
    studentTimes[sub.userId].count += 1;
  }

  const leaderboard: LeaderboardEntry[] = Object.entries(studentTimes).map(([userId, data]) => ({
    userId,
    userName: data.userData.userName,
    userEmail: data.userData.userEmail,
    userCourse: data.userData.userCourse,
    averageSeconds: Math.round(data.totalSeconds / data.count),
    totalSubmissions: data.count
  }));

  // sort by averageSeconds ascending
  leaderboard.sort((a, b) => {
  if (b.totalSubmissions !== a.totalSubmissions) {
    return b.totalSubmissions - a.totalSubmissions; // more submissions = higher rank
  }
  return a.averageSeconds - b.averageSeconds; // same count → faster wins
});


  return leaderboard;
}
