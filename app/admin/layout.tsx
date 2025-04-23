// app/admin/layout.tsx (Simplified Dashboard Layout)
"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { toast } from "react-hot-toast";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Bell, LogOut, Menu, X, Loader2, Shield } from "lucide-react";
import { doc, getDoc } from "firebase/firestore";

const sidebarLinks = [
  {
    name: "Emergency Alerts",
    href: "/admin/alerts",
    icon: <Bell className='h-5 w-5' />,
    description: "Manage and respond to emergency alerts",
  },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [adminName, setAdminName] = useState<string>("");
  const [adminEmail, setAdminEmail] = useState<string>("");
  const [adminRole, setAdminRole] = useState<string>("Administrator");
  const [lastLogin, setLastLogin] = useState<string>("");

  // Check authentication
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
          if (!user) {
            router.push("/");
            return;
          }

          // Check if user is admin
          const adminRef = doc(db, "admins", user.uid);
          const adminSnap = await getDoc(adminRef);

          if (!adminSnap.exists() || !adminSnap.data().isAdmin) {
            await signOut(auth);
            toast.error("Access denied. Not an admin account.");
            router.push("/");
            return;
          }

          // Get admin data
          const adminData = adminSnap.data();

          // Set admin information
          setAdminName(
            adminData.name ||
              user.displayName ||
              user.email?.split("@")[0] ||
              "Admin"
          );
          setAdminEmail(user.email || "");
          setAdminRole(adminData.role || "Administrator");

          // Set last login time if available
          if (user.metadata.lastSignInTime) {
            const lastLoginDate = new Date(user.metadata.lastSignInTime);
            setLastLogin(lastLoginDate.toLocaleString());
          }

          setLoading(false);
        });

        return () => unsubscribe();
      } catch (error) {
        console.error("Authentication error:", error);
        toast.error("Authentication error. Please try again.");
        router.push("/");
      }
    };

    checkAuth();
  }, [router]);

  // Responsive sidebar handling
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };

    // Initialize sidebar state based on screen size
    handleResize();

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleLogout = async () => {
    try {
      setLoading(true);
      await signOut(auth);
      toast.success("Logged out successfully!");
      router.push("/");
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Error logging out");
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className='flex items-center justify-center h-screen bg-gray-100'>
        <div className='flex flex-col items-center'>
          <Loader2 className='h-10 w-10 animate-spin text-primary mb-2' />
          <p className='text-gray-600'>Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className='flex h-screen bg-gray-50'>
      {/* Mobile Sidebar Toggle */}
      <button
        className='md:hidden fixed top-4 left-4 z-50 p-2 rounded-md bg-white shadow-md'
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label={sidebarOpen ? "Close menu" : "Open menu"}
      >
        {sidebarOpen ? <X className='h-5 w-5' /> : <Menu className='h-5 w-5' />}
      </button>

      {/* Sidebar Overlay for Mobile */}
      {sidebarOpen && (
        <div
          className='md:hidden fixed inset-0 bg-black/50 z-40'
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "fixed md:static z-40 h-full bg-white shadow-lg transition-all duration-300 ease-in-out",
          sidebarOpen ? "left-0" : "-left-full md:left-0",
          "w-72 md:w-64 lg:w-72"
        )}
      >
        <div className='flex flex-col h-full'>
          {/* Logo and Brand */}
          <div className='p-4 mb-2 border-b'>
            <div className='flex justify-center'>
              <Image
                src='/assets/images/logo/news-resq-logo.png'
                width={180}
                height={60}
                quality={100}
                alt='ResQ Logo'
                priority
                style={{ filter: "brightness(0) invert(0)" }}
              />
            </div>
          </div>

          {/* Admin Profile */}
          <div className='px-4 py-4 mb-4 border-b'>
            <div className='flex items-center space-x-3'>
              <div className='p-2 rounded-full bg-primary/10 text-primary'>
                <Shield className='h-6 w-6' />
              </div>
              <div className='flex-1 min-w-0'>
                <p className='font-medium text-gray-900 truncate'>
                  {adminName}
                </p>
                <p className='text-sm text-gray-500 truncate'>{adminRole}</p>
              </div>
            </div>
            {adminEmail && (
              <p className='text-xs text-gray-500 mt-2 truncate'>
                {adminEmail}
              </p>
            )}
            {lastLogin && (
              <p className='text-xs text-gray-500 mt-1'>
                Last login: {lastLogin}
              </p>
            )}
          </div>

          {/* Navigation */}
          <nav className='flex-1 overflow-y-auto px-3'>
            <div className='text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 mb-2'>
              Main
            </div>
            <ul className='space-y-1.5 mb-6'>
              {sidebarLinks.map((link) => {
                const isActive =
                  pathname === link.href ||
                  pathname?.startsWith(`${link.href}/`);

                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors",
                        "hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/20",
                        isActive
                          ? "bg-primary/10 text-primary font-medium"
                          : "text-gray-600"
                      )}
                      onClick={() => {
                        if (window.innerWidth < 768) {
                          setSidebarOpen(false);
                        }
                      }}
                    >
                      {link.icon}
                      <span>{link.name}</span>
                      {isActive && (
                        <span className='ml-auto w-1.5 h-1.5 rounded-full bg-primary' />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Logout Button */}
          <div className='p-4 border-t mt-auto'>
            <Button
              onClick={handleLogout}
              variant='destructive'
              className='w-full flex items-center justify-center gap-2'
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className='h-4 w-4 animate-spin' />
                  <span>Logging out...</span>
                </>
              ) : (
                <>
                  <LogOut className='h-4 w-4' />
                  <span>Logout</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className='flex-1 flex flex-col overflow-hidden'>
        {/* Top header */}
        <header className='bg-white shadow-sm border-b h-16 flex items-center px-6 sticky top-0 z-10'>
          <h1 className='text-xl font-semibold text-gray-800'>
            {sidebarLinks.find(
              (link) =>
                pathname === link.href || pathname?.startsWith(`${link.href}/`)
            )?.name || "Admin Dashboard"}
          </h1>
        </header>

        {/* Page content */}
        <main className='flex-1 overflow-auto bg-gray-50'>{children}</main>

        {/* Footer */}
        <footer className='bg-white p-4 border-t text-center text-sm text-gray-500'>
          <p>
            © {new Date().getFullYear()} ResQ Admin Dashboard. All rights
            reserved.
          </p>
        </footer>
      </div>
    </div>
  );
}
