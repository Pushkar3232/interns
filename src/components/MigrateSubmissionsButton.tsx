import {
  getFirestore,
  collection,
  getDocs,
  doc,
  setDoc,
} from "firebase/firestore";
import { useState } from "react";

export default function MigrateUsersButton() {
  const [migrating, setMigrating] = useState(false);
  const [status, setStatus] = useState("");

  const handleMigrate = async () => {
    setMigrating(true);
    setStatus("Starting user profile migration...");

    const db = getFirestore();
    const courses = [
      "Web Development",
      "Data Analysis",
      "Mobile Application Development"
    ];

    try {
      for (const course of courses) {
        const studentsSnapshot = await getDocs(collection(db, `users/${course}/students`));
        for (const studentDoc of studentsSnapshot.docs) {
          const data = studentDoc.data();

          // Move this data to users/{uid}
          await setDoc(doc(db, `users/${studentDoc.id}`), {
            ...data,
            course,  // preserve their course
            migratedAt: new Date()
          });

          console.log(`✅ Migrated user ${studentDoc.id} from ${course}`);
        }
      }
      setStatus("✅ User migration complete!");
    } catch (err) {
      console.error(err);
      setStatus(`❌ Migration error: ${err instanceof Error ? err.message : "unknown error"}`);
    } finally {
      setMigrating(false);
    }
  };

  return (
    <div className="p-4">
      <button
        onClick={handleMigrate}
        disabled={migrating}
        className="bg-blue-600 text-white rounded px-4 py-2"
      >
        {migrating ? "Migrating..." : "Migrate Users to users/{uid}"}
      </button>
      <p className="mt-2 text-gray-600">{status}</p>
    </div>
  );
}
