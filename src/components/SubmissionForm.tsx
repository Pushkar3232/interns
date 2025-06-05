
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface SubmissionFormProps {
  onSubmit: (data: any) => void;
}

const SubmissionForm = ({ onSubmit }: SubmissionFormProps) => {
  const [activeTab, setActiveTab] = useState("classwork");
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    code: "",
    language: "python",
    type: "classwork"
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.code) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    // Simulate submission delay
    setTimeout(() => {
      onSubmit({
        ...formData,
        type: activeTab,
        date: new Date().toLocaleDateString()
      });
      
      // Reset form
      setFormData({
        title: "",
        description: "",
        code: "",
        language: "python",
        type: activeTab
      });
      
      setIsSubmitting(false);
    }, 1000);
  };

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-gray-900">Submit Your Work</CardTitle>
        <CardDescription>
          Submit your data analysis code and documentation for review
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
            <div className="space-y-6">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h3 className="font-semibold text-blue-900 mb-2">Class Work Submission</h3>
                <p className="text-blue-700 text-sm">
                  Submit your in-class data analysis exercises and practice problems here.
                </p>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Assignment Title *</Label>
                    <Input
                      id="title"
                      placeholder="e.g., Data Cleaning Exercise 1"
                      value={formData.title}
                      onChange={(e) => updateFormData("title", e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="language">Programming Language</Label>
                    <Select value={formData.language} onValueChange={(value) => updateFormData("language", value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="python">Python</SelectItem>
                        <SelectItem value="r">R</SelectItem>
                        <SelectItem value="sql">SQL</SelectItem>
                        <SelectItem value="javascript">JavaScript</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Brief description of your work, methodology, or findings..."
                    value={formData.description}
                    onChange={(e) => updateFormData("description", e.target.value)}
                    rows={3}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="code">Code *</Label>
                  <Textarea
                    id="code"
                    placeholder="Paste your code here..."
                    value={formData.code}
                    onChange={(e) => updateFormData("code", e.target.value)}
                    rows={12}
                    className="font-mono text-sm"
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
            </div>
          </TabsContent>

          <TabsContent value="homework">
            <div className="space-y-6">
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <h3 className="font-semibold text-purple-900 mb-2">Homework Submission</h3>
                <p className="text-purple-700 text-sm">
                  Submit your take-home assignments and project work here.
                </p>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="title-hw">Assignment Title *</Label>
                    <Input
                      id="title-hw"
                      placeholder="e.g., Weekly Data Analysis Project"
                      value={formData.title}
                      onChange={(e) => updateFormData("title", e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="language-hw">Programming Language</Label>
                    <Select value={formData.language} onValueChange={(value) => updateFormData("language", value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="python">Python</SelectItem>
                        <SelectItem value="r">R</SelectItem>
                        <SelectItem value="sql">SQL</SelectItem>
                        <SelectItem value="javascript">JavaScript</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description-hw">Description</Label>
                  <Textarea
                    id="description-hw"
                    placeholder="Brief description of your work, methodology, or findings..."
                    value={formData.description}
                    onChange={(e) => updateFormData("description", e.target.value)}
                    rows={3}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="code-hw">Code *</Label>
                  <Textarea
                    id="code-hw"
                    placeholder="Paste your code here..."
                    value={formData.code}
                    onChange={(e) => updateFormData("code", e.target.value)}
                    rows={12}
                    className="font-mono text-sm"
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
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default SubmissionForm;
