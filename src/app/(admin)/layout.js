"use client";

import { useAuth } from "@/context/AuthContext";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeader from "@/components/admin/AdminHeader";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

// Layout หลักสำหรับหน้าจัดการทั้งหมด
export default function AdminLayout({ children }) {
  const { loading, userProfile, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!loading && !userProfile) {
      console.log("AdminLayout: Redirecting to / because not logged in or no profile", { loading, userProfile });
      // not logged in / no profile -> send to main
      router.replace("/");
      return;
    }
    // Note: Role redirection removed to prevent loop. We handle unauthorized access by rendering a specific UI below.
  }, [loading, userProfile, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        Loading Admin Panel...
      </div>
    );
  }

  if (!userProfile) {
    return null;
  }

  // Role enforcement: allow only admin and employee to access admin area
  // If driver tries to access, redirect them to their appropriate page
  if (userProfile.role !== 'admin' && userProfile.role !== 'employee') {
    // Redirect driver to my-bookings page
    if (typeof window !== 'undefined') {
      window.location.replace('/my-bookings');
    }
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto mb-2"></div>
          <p className="text-gray-600">กำลังนำทางไปหน้าของคุณ...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex">
      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="flex-1 min-h-screen flex flex-col bg-gray-100">
        <div className="px-4 py-2 md:p-6 md:py-2 bg-white shadow-sm">
          <AdminHeader onMenuClick={() => setSidebarOpen(true)} />
        </div>
        <div className="p-4 md:p-6 flex-1 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
