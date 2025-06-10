
import LoginPage from "@/components/LoginPage";
import StudentDashboard from "@/pages/StudentDashboard";
import { useFirebaseAuth } from "@/hooks/useFirebaseAuth";

const Index = () => {
  const { user, loading } = useFirebaseAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {!user ? (
        <LoginPage />
      ) : (
        <StudentDashboard user={user} />
      )}
    </div>
  );
};

export default Index;
