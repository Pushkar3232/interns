import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useFirebaseAuth } from "@/hooks/useFirebaseAuth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

const LoginPage = () => {
  const { signInWithGoogle, loading } = useFirebaseAuth();

  const handleGoogleLogin = async () => {
  try {
    console.log("Attempting login...");
    const user = await signInWithGoogle();
    console.log("Login success:", user);

    const userRef = doc(db, "users", user.uid);
    const docSnap = await getDoc(userRef);
    console.log("User doc exists?", docSnap.exists());

    if (!docSnap.exists()) {
      window.location.href = "/complete-profile";
    } else {
      window.location.href = "/dashboard";
    }
  } catch (error) {
    console.error("Login error:", error);
  }
};


  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="w-full max-w-md space-y-6 md:space-y-8">
        {/* Logo and Header */}
        <div className="text-center">
          <div className="mx-auto w-24 h-24 md:w-28 md:h-28 bg-gradient-to-br rounded-full flex items-center justify-center mb-4 shadow-lg transform transition-transform hover:scale-105">
            <img src="/v2v.png" alt="V2V Logo" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">V2V Edtech LLP</h1>
          <p className="text-lg text-gray-700 md:text-xl">Data Analysis Internship Portal</p>
        </div>

        {/* Login Card */}
        <Card className="shadow-2xl border border-gray-200 bg-white/90 backdrop-blur-sm rounded-xl overflow-hidden transition-all duration-300 hover:shadow-3xl">
          <CardHeader className="text-center pb-4 pt-8 px-8">
            <CardTitle className="text-2xl md:text-3xl font-bold text-gray-800">Student Login</CardTitle>
            <CardDescription className="text-gray-600 mt-2 text-base md:text-lg">
              Sign in with your Google account to access your internship portal
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-8 px-8">
            <Button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full h-14 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium transition-all duration-200 shadow-lg hover:shadow-xl rounded-xl group"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-3">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-base font-medium">Signing in...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-4">
                  <svg className="w-6 h-6 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  <span className="text-base font-medium">Continue with Google</span>
                </div>
              )}
            </Button>

            <div className="mt-8 text-center">
              <p className="text-xs md:text-sm text-gray-500">
                By signing in, you agree to our 
                <a href="#" className="text-blue-600 hover:underline ml-1 mr-1">Terms of Service</a> 
                and 
                <a href="#" className="text-blue-600 hover:underline ml-1">Privacy Policy</a>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Info Section */}
        <div className="text-center">
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-5 border border-gray-200 shadow-sm transition-all hover:shadow-md">
            <h3 className="font-semibold text-gray-800 text-lg md:text-xl mb-3">3-Month Data Analysis Internship</h3>
            <p className="text-gray-600 text-sm md:text-base">
              Submit your class work and homework assignments through this portal
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
