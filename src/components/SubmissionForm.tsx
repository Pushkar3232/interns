import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { assignmentService } from "@/services/assignmentService"; // make sure this exists

interface SubmissionFormProps {
  onSubmit: (data: any) => Promise<void>;
  userCourse: string;
  userName: string;
  userEmail: string;
  userCollege: string;
}

const SubmissionForm = ({ onSubmit, userCourse, userName, userEmail, userCollege }: SubmissionFormProps) => {
  const { toast } = useToast();
  const [assignments, setAssignments] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    assignmentId: "",
    description: "",
    file: null as File | null,
  });

useEffect(() => {
  if (userCourse) {
    assignmentService.getAssignmentsForCourse(userCourse).then((results) => {
      const now = Date.now();
      console.log("📦 All Assignments:", results);

      const activeAssignments = results.filter((a) => {
  if (!a.deadline) return true; // No deadline = visible

  let deadlineTime = 0;

  if (typeof a.deadline?.seconds === "number") {
    deadlineTime = new Date(a.deadline.seconds * 1000).getTime();
  } else {
    try {
      deadlineTime = new Date(a.deadline).getTime();
    } catch {
      return false;
    }
  }

  return deadlineTime >= Date.now();
});


      console.log("✅ Active Assignments:", activeAssignments);
      setAssignments(activeAssignments);
    });
  }
}, [userCourse]);

  const formatTimeLeft = (deadline: any) => {
  if (!deadline?.seconds) return "";

  const now = Date.now();
  const deadlineTime = new Date(deadline.seconds * 1000).getTime();
  const diff = deadlineTime - now;

  if (diff <= 0) return "⛔ Closed";

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `⏰ ${days}d ${hours % 24}h`;
  if (hours > 0) return `⏰ ${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `⏰ ${minutes}m`;
  return "⏰ Soon";
};

  // Mobile-friendly title truncation
  const formatAssignmentTitle = (title: string, type: string, deadline: any) => {
    const timeLeft = formatTimeLeft(deadline);
    const isMobile = window.innerWidth < 768;
    
    if (isMobile) {
      // For mobile: show first 15 chars of title + type + time
      const shortTitle = title.length > 15 ? title.slice(0, 15) + "..." : title;
      return `${shortTitle} (${type}) ${timeLeft}`;
    } else {
      // For desktop: show more characters
      const shortTitle = title.length > 35 ? title.slice(0, 35) + "..." : title;
      return `${shortTitle} (${type}) — ${timeLeft}`;
    }
  };

  const updateField = (key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.assignmentId || !formData.file) {
      toast({
        title: "Validation Error",
        description: "Please select an assignment and upload a file.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit({
        userName,
        userEmail,
        userCollege,
        userCourse,
        assignmentId: formData.assignmentId,
        description: formData.description,
        file: formData.file,
        createdAt: new Date(), // timestamp with seconds
      });

      toast({
        title: "Submitted!",
        description: "Your submission has been uploaded successfully.",
      });

      setFormData({
        assignmentId: "",
        description: "",
        file: null,
      });
    } catch (error) {
      console.error("Submission error:", error);
      toast({
        title: "Submission Failed",
        description: "There was an issue uploading your submission. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-gray-900">Submit Your Work</CardTitle>
        <CardDescription>
          Select an assignment and upload your file (PDF or DOC)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="assignment">Assignment *</Label>
            <select
              id="assignment"
              className="w-full px-3 py-3 text-sm sm:text-base rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white appearance-none cursor-pointer min-h-[48px] leading-tight"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                backgroundPosition: 'right 0.5rem center',
                backgroundRepeat: 'no-repeat',
                backgroundSize: '1.5em 1.5em',
                paddingRight: '2.5rem'
              }}
              value={formData.assignmentId}
              onChange={(e) => updateField("assignmentId", e.target.value)}
              required
            >
              <option value="">-- Select Assignment --</option>
              {assignments.map((assignment) => (
                <option key={assignment.id} value={assignment.id}>
                  {formatAssignmentTitle(assignment.title, assignment.type, assignment.deadline)}
                </option>
              ))}
            </select>
            
            {/* Show full title of selected assignment on mobile */}
            {formData.assignmentId && (
              <div className="mt-2 p-2 bg-blue-50 rounded-md sm:hidden">
                <p className="text-xs text-blue-700 font-medium">
                  Selected: {assignments.find(a => a.id === formData.assignmentId)?.title}
                </p>
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              placeholder="Write any notes or description (optional)"
              value={formData.description}
              onChange={(e) => updateField("description", e.target.value)}
              rows={3}
              className="text-sm sm:text-base"
            />
          </div>

          <div>
            <Label htmlFor="file">Upload File (PDF/DOC) *</Label>
            <Input
              id="file"
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={(e) => updateField("file", e.target.files?.[0] || null)}
              required
              className="text-sm sm:text-base min-h-[48px] cursor-pointer"
            />
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 h-12 text-base font-medium"
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Submitting...
              </div>
            ) : (
              "Submit Assignment"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default SubmissionForm;