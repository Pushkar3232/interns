import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface SubmissionFormProps {
  onSubmit: (data: any) => Promise<void>;
}

const SubmissionForm = ({ onSubmit }: SubmissionFormProps) => {
  const [activeTab, setActiveTab] = useState("classwork");
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    file: null as File | null,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.file) {
      toast({
        title: "Validation Error",
        description: "Title and file are required.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit({
        ...formData,
        type: activeTab,
      });

      setFormData({
        title: "",
        description: "",
        file: null,
      });

      toast({
        title: "Submission Successful",
        description: `Your ${activeTab} has been submitted successfully!`,
      });
    } catch (error) {
      console.error("Submission error:", error);
      toast({
        title: "Submission Failed",
        description: "Failed to submit your work. Please try again.",
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
          Upload your assignment as a PDF or Word document
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="classwork" className="flex items-center gap-2">
              <span className="text-lg">📚</span>
              Class Work
            </TabsTrigger>
            <TabsTrigger value="homework" className="flex items-center gap-2">
              <span className="text-lg">🏠</span>
              Homework
            </TabsTrigger>
          </TabsList>

          <TabsContent value="classwork">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Assignment Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g., Classwork Report"
                  value={formData.title}
                  onChange={(e) => updateFormData("title", e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Optional description of your submission"
                  value={formData.description}
                  onChange={(e) => updateFormData("description", e.target.value)}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="file">Upload File (PDF/DOC) *</Label>
                <Input
                  id="file"
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => updateFormData("file", e.target.files?.[0] || null)}
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 h-12"
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Submitting...
                  </div>
                ) : (
                  "Submit Class Work"
                )}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="homework">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title-hw">Assignment Title *</Label>
                <Input
                  id="title-hw"
                  placeholder="e.g., Homework 1"
                  value={formData.title}
                  onChange={(e) => updateFormData("title", e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description-hw">Description</Label>
                <Textarea
                  id="description-hw"
                  placeholder="Optional description of your homework"
                  value={formData.description}
                  onChange={(e) => updateFormData("description", e.target.value)}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="file-hw">Upload File (PDF/DOC) *</Label>
                <Input
                  id="file-hw"
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => updateFormData("file", e.target.files?.[0] || null)}
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 h-12"
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Submitting...
                  </div>
                ) : (
                  "Submit Homework"
                )}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default SubmissionForm;
