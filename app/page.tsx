"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { toast } from "react-hot-toast";
import { auth, db } from "@/lib/firebase";
import { Eye, EyeOff, Loader2 } from "lucide-react";

export default function AdminLoginPage() {
  const [isClient, setIsClient] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const router = useRouter();

  useEffect(() => {
    setIsClient(true);

    // Check if user is already authenticated
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        // Verify if the user is an admin
        try {
          const adminRef = doc(db, "admins", user.uid);
          const adminSnap = await getDoc(adminRef);

          if (adminSnap.exists() && adminSnap.data().isAdmin === true) {
            router.push("/admin");
            return;
          }
        } catch (error) {
          console.error("Error verifying admin status:", error);
        }
      }

      setLoadingAuth(false);
    });

    return () => unsubscribe();
  }, [router]);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleLogin = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      // Check if the user is an admin in Firestore
      const adminRef = doc(db, "admins", user.uid);
      const adminSnap = await getDoc(adminRef);

      if (adminSnap.exists() && adminSnap.data().isAdmin === true) {
        toast.success("Login successful!");
        router.push("/admin"); // Redirect after login
      } else {
        await auth.signOut(); // Logout non-admin users
        toast.error("Access Denied: You are not an admin.");
      }
    } catch (error) {
      console.error("Error signing in:", error);
      toast.error("Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  // Show loading state while checking authentication
  if (loadingAuth) {
    return (
      <div className='flex items-center justify-center min-h-screen bg-slate-900 px-4'>
        <div className='flex flex-col items-center text-white'>
          <Loader2 className='h-10 w-10 animate-spin mb-2' />
          <p>Checking authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <div className='relative flex items-center justify-center min-h-screen bg-slate-900 px-4 py-6'>
      {isClient && (
        <div className='absolute inset-0 -z-10'>
          <div className='absolute inset-0 bg-slate-900/70'></div>
        </div>
      )}

      <Card className='w-full max-w-md shadow-2xl bg-white/95 backdrop-blur-md'>
        <CardContent className='pt-6 px-4 sm:px-6 md:px-8'>
          <div className='text-center mb-6 mt-2'>
            <h2 className='text-xl sm:text-2xl font-bold text-slate-800'>
              Admin Login
            </h2>
            <p className='text-xs sm:text-sm text-slate-500 mt-1'>
              Sign in to access admin dashboard
            </p>
          </div>

          <form onSubmit={handleLogin} className='space-y-5'>
            <div>
              <label className='block text-sm font-medium text-slate-700 mb-1.5'>
                Email
              </label>
              <Input
                type='email'
                placeholder='admin@example.com'
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className='h-10 sm:h-11'
                required
                disabled={loading}
              />
            </div>

            <div>
              <label className='block text-sm font-medium text-slate-700 mb-1.5'>
                Password
              </label>
              <div className='relative'>
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder='••••••••'
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className='h-10 sm:h-11 pr-10'
                  required
                  disabled={loading}
                />
                <button
                  type='button'
                  className='absolute inset-y-0 right-0 flex items-center px-3 text-slate-500 hover:text-slate-700'
                  onClick={togglePasswordVisibility}
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className='h-4 w-4' />
                  ) : (
                    <Eye className='h-4 w-4' />
                  )}
                </button>
              </div>
            </div>

            <Button
              type='submit'
              className='w-full h-10 sm:h-11 mt-4 text-sm sm:text-base'
              disabled={loading}
            >
              {loading ? (
                <div className='flex items-center justify-center'>
                  <Loader2 className='h-4 w-4 animate-spin mr-2' />
                  <span>Signing in...</span>
                </div>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
