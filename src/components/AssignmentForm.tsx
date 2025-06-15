// src/components/AssignmentForm.tsx
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { addDoc, collection, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase"; // adjust if your db is exported elsewhere
import { useToast } from "@/hooks/use-toast";

const AssignmentForm = () => {
  const { toast } = useToast();
  const COURSES = ["Web Development", "Data Analysis", "Mobile Application Development"];
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: "homework",
    course: "",
    deadline: "",
  });

  const [loading, setLoading] = useState(false);

  const updateField = (key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.type || !formData.course) {
      toast({
        title: "Missing required fields",
        description: "Title, type and course are required.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, "assignments"), {
        ...formData,
        createdAt: Timestamp.now(),
        deadline: formData.deadline ? Timestamp.fromDate(new Date(formData.deadline)) : null,
        });

      toast({
        title: "Assignment Created",
        description: "The assignment has been successfully added.",
      });

      setFormData({
        title: "",
        description: "",
        type: "homework",
        course: "",
        deadline: "",
      });
    } catch (error) {
      console.error("Error creating assignment:", error);
      toast({
        title: "Error",
        description: "Failed to create assignment.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="mb-6 shadow-md">
      <CardHeader>
        <CardTitle>Create New Assignment</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Title *</Label>
            <Input
              value={formData.title}
              onChange={e => updateField("title", e.target.value)}
              required
            />
          </div>

          <div>
            <Label>Description</Label>
            <Textarea
              value={formData.description}
              onChange={e => updateField("description", e.target.value)}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Type *</Label>
              <select
                className="w-full border border-gray-300 rounded px-3 py-2"
                value={formData.type}
                onChange={e => updateField("type", e.target.value)}
              >
                <option value="homework">Homework</option>
                <option value="classwork">Classwork</option>
              </select>
            </div>

            <div>
              <Label>Course *</Label>
              <select
                className="w-full border border-gray-300 rounded px-3 py-2"
                value={formData.course}
                onChange={e => updateField("course", e.target.value)}
              >
                <option value="">-- Select Course --</option>
                {COURSES.map(course => (
                  <option key={course} value={course}>{course}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <Label>Deadline</Label>
            <Input
              type="date"
              value={formData.deadline}
              onChange={e => updateField("deadline", e.target.value)}
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600"
          >
            {loading ? "Creating..." : "Create Assignment"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default AssignmentForm;
