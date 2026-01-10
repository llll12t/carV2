"use client";

import { useAuth } from "@/context/AuthContext";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeader from "@/components/admin/AdminHeader";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

// ต้องแยก content ออกมาเพราะต้องใช้ useAuth ภายใน AuthProvider
function AdminLayoutContent({ children }) {
  const { loading, userProfile, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    console.log('[AdminLayout] Effect triggered:', {
      loading,
      hasUserProfile: !!userProfile,
      role: userProfile?.role,
      uid: userProfile?.uid
    });

    if (!loading && !userProfile) {
      console.log("[AdminLayout] ⚠️ No user profile found. Showing breakdown state.");
      // STOP AUTO REDIRECT - Show UI instead to debug
      // router.replace("/"); 
      return;
    }

    if (!loading && userProfile) {
      console.log("[AdminLayout] ✅ User authenticated in admin layout. Role:", userProfile.role);
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
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">⚠️</span>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">ไม่พบข้อมูลผู้ใช้งาน</h2>
          <p className="text-gray-600 mb-6">
            ระบบไม่สามารถดึงข้อมูลโปรไฟล์ของคุณได้ อาจเกิดจากปัญหาการเชื่อมต่อหรือ Session หมดอายุ
          </p>
          <div className="text-xs text-gray-400 bg-gray-50 p-2 rounded mb-6 text-left overflow-auto max-h-32">
            DEBUG INFO:<br />
            Loading: {String(loading)}<br />
            User Profile: {String(userProfile)}
          </div>
          <button
            onClick={() => router.replace('/')}
            className="w-full py-3 bg-teal-600 text-white font-medium rounded-xl hover:bg-teal-700 transition"
          >
            กลับไปหน้าเข้าสู่ระบบ
          </button>
        </div>
      </div>
    );
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

// Layout หลักสำหรับหน้าจัดการทั้งหมด
export default function AdminLayout({ children }) {
  return <AdminLayoutContent>{children}</AdminLayoutContent>;
}