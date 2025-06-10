import { BrowserRouter, Routes, Route } from "react-router-dom";
import LoginPage from "./components/LoginPage";
import CompleteProfilePage from "./pages/CompleteProfilePage";
import StudentDashboard from "./pages/StudentDashboard";
import { useFirebaseAuth } from "./hooks/useFirebaseAuth";

function App() {
  const { user, loading } = useFirebaseAuth();

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <p className="text-gray-600 text-lg">Loading...</p>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/complete-profile" element={<CompleteProfilePage />} />
        <Route path="/dashboard" element={<StudentDashboard user={user} />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
