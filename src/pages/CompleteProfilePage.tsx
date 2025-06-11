import { useState } from "react";
import { collection, doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase"; 
import { COLLEGES } from "@/constants/colleges";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const internshipOptions = [
  "Data Analysis",
  "Web Development",
  "Mobile Application Development",
];

export default function CompleteProfilePage() {
  
  const [user] = useAuthState(auth);

  const [name, setName] = useState("");
  const [college, setCollege] = useState(COLLEGES[0]);
  const [course, setCourse] = useState(internshipOptions[0]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await setDoc(doc(db, "users", user.uid), {
        name,
        college,
        course,
        email: user.email,
        uid: user.uid,
        createdAt: new Date(),
      });
      
      navigate("/dashboard");
    } catch (error) {
      console.error("Error saving profile:", error);
      alert("Failed to save profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <Card className="w-full max-w-lg shadow-lg">
        <CardHeader>
          <CardTitle>Complete Your Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <select
            value={college}
            onChange={(e) => setCollege(e.target.value)}
            className="w-full border p-2 rounded"
          >
            {COLLEGES.map((col) => (
              <option key={col} value={col}>
                {col}
              </option>
            ))}
          </select>
          <select
            value={course}
            onChange={(e) => setCourse(e.target.value)}
            className="w-full border p-2 rounded"
          >
            {internshipOptions.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
          <Button onClick={handleSubmit} disabled={loading} className="w-full">
            {loading ? "Saving..." : "Submit"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}