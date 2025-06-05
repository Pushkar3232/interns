
import { useState } from "react";
import LoginPage from "@/components/LoginPage";
import StudentDashboard from "@/components/StudentDashboard";

const Index = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [studentData, setStudentData] = useState(null);

  const handleLogin = (userData: any) => {
    setStudentData(userData);
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setStudentData(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {!isLoggedIn ? (
        <LoginPage onLogin={handleLogin} />
      ) : (
        <StudentDashboard studentData={studentData} onLogout={handleLogout} />
      )}
    </div>
  );
};

export default Index;
