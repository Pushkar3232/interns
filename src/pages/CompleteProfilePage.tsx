import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import { Check, User, GraduationCap, Code } from "lucide-react";

const COLLEGES = [
  "MIT",
  "Stanford University",
  "Harvard University",
  "UC Berkeley",
  "Carnegie Mellon",
  "Other"
];

const internshipOptions = [
  "Data Analysis",
  "Web Development", 
  "Mobile Application Development",
  "Machine Learning",
  "DevOps",
  "UI/UX Design"
];

export default function CompleteProfilePage() {
  const [formData, setFormData] = useState({
    name: "",
    college: "",
    course: "",
    email: "user@example.com" // Mock email
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const navigate = useNavigate();
  const { toast } = useToast();

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = "Full name is required";
    }
    if (!formData.college) {
      newErrors.college = "Please select your college";
    }
    if (!formData.course) {
      newErrors.course = "Please select your internship track";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log("Profile data:", formData);
      
      toast({
        title: "Profile Completed!",
        description: "Welcome to your internship dashboard"
      });
      
      // Navigate to dashboard (you'll need to create this route)
      navigate("/");
    } catch (error) {
      console.error("Error saving profile:", error);
      toast({
        title: "Error",
        description: "Failed to save profile. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  const isFormValid = formData.name && formData.college && formData.course;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full mb-4">
            <User className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Complete Your Profile</h1>
          <p className="text-gray-600">Tell us about yourself to get started with your internship</p>
        </div>

        <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="text-center pb-6">
            <CardTitle className="text-xl text-gray-800">Personal Information</CardTitle>
            <CardDescription>
              This information will help us personalize your experience
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Progress indicator */}
            <div className="flex items-center space-x-2 mb-6">
              <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300 ease-out"
                  style={{ width: isFormValid ? '100%' : '33%' }}
                />
              </div>
              <span className="text-sm text-gray-500 font-medium">
                {isFormValid ? '100%' : '33%'}
              </span>
            </div>

            {/* Name Field */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <User className="w-4 h-4" />
                Full Name *
              </label>
              <Input
                placeholder="Enter your full name"
                value={formData.name}
                onChange={(e) => updateFormData('name', e.target.value)}
                className={`transition-all duration-200 ${
                  errors.name 
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-200' 
                    : 'focus:border-blue-500 focus:ring-blue-200'
                }`}
              />
              {errors.name && (
                <p className="text-sm text-red-600">{errors.name}</p>
              )}
            </div>

            <Separator />

            {/* College Field */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <GraduationCap className="w-4 h-4" />
                College/University *
              </label>
              <Select 
                value={formData.college} 
                onValueChange={(value) => updateFormData('college', value)}
              >
                <SelectTrigger className={`transition-all duration-200 ${
                  errors.college 
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-200' 
                    : 'focus:border-blue-500 focus:ring-blue-200'
                }`}>
                  <SelectValue placeholder="Select your college" />
                </SelectTrigger>
                <SelectContent>
                  {COLLEGES.map((college) => (
                    <SelectItem key={college} value={college}>
                      {college}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.college && (
                <p className="text-sm text-red-600">{errors.college}</p>
              )}
            </div>

            {/* Course Field */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Code className="w-4 h-4" />
                Internship Track *
              </label>
              <Select 
                value={formData.course} 
                onValueChange={(value) => updateFormData('course', value)}
              >
                <SelectTrigger className={`transition-all duration-200 ${
                  errors.course 
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-200' 
                    : 'focus:border-blue-500 focus:ring-blue-200'
                }`}>
                  <SelectValue placeholder="Choose your internship track" />
                </SelectTrigger>
                <SelectContent>
                  {internshipOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.course && (
                <p className="text-sm text-red-600">{errors.course}</p>
              )}
            </div>

            <Separator />

            {/* Summary */}
            {isFormValid && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Check className="w-5 h-5 text-green-600" />
                  <h3 className="font-medium text-green-800">Profile Summary</h3>
                </div>
                <div className="text-sm text-green-700 space-y-1">
                  <p><strong>Name:</strong> {formData.name}</p>
                  <p><strong>College:</strong> {formData.college}</p>
                  <p><strong>Track:</strong> {formData.course}</p>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <Button 
              onClick={handleSubmit} 
              disabled={loading || !isFormValid}
              className="w-full h-12 text-base font-medium bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving Profile...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  Complete Profile
                </div>
              )}
            </Button>

            <p className="text-xs text-gray-500 text-center mt-4">
              By completing your profile, you agree to our terms of service and privacy policy.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
