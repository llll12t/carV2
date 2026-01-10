"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

// Icons
const DashboardIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
  </svg>
);

const CarIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
  </svg>
);

const ClockIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
  </svg>
);

const AlertIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
  </svg>
);

const WrenchIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
  </svg>
);

const ChartIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
  </svg>
);

const HistoryIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
  </svg>
);

const UserGroupIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
  </svg>
);

const CogIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 0 1 0 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.212 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 0 1 0-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
  </svg>
);

const TruckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
  </svg>
);

export default function AdminSidebar({ isOpen = false, onClose = () => { } }) {
  const router = useRouter();
  const { user, userProfile, logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      router.push("/");
    } catch (err) {
      console.error("Logout failed", err);
    }
    setLoggingOut(false);
  };

  const pathname = usePathname();

  if (!userProfile) return null;
  const role = userProfile.role;
  if (role !== 'admin' && role !== 'employee') return null;

  const NavContent = ({ mobile = false }) => (
    <>
      <div className={`${mobile ? 'flex items-center justify-between mb-6' : 'mb-8'}`}>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          {mobile && <span className="text-xl">Admin Panel</span>}
          {!mobile && "Admin Panel"}
        </h2>
        {mobile && (
          <button onClick={onClose} aria-label="Close menu" className="p-2 rounded bg-white/10">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto">
        <ul className="space-y-2">
          <li>
            <Link
              href="/dashboard"
              className={`flex items-center gap-3 p-2 rounded hover:bg-white/20 ${pathname === '/dashboard' ? 'bg-white/20' : ''}`}
              onClick={mobile ? onClose : undefined}
            >
              <DashboardIcon />
              <span>ภาพรวม</span>
            </Link>
          </li>

          <li>
            <Link
              href="/vehicles"
              className={`flex items-center gap-3 p-2 rounded hover:bg-white/20 ${pathname === '/vehicles' ? 'bg-white/20' : ''}`}
              onClick={mobile ? onClose : undefined}
            >
              <CarIcon />
              <span>จัดการรถ</span>
            </Link>

            {/* Submenu for Manage Vehicles */}
            <ul className="pl-6 mt-1 space-y-1 block">
              <li>
                <Link
                  href="/vehicles/in-use"
                  className={`flex items-center gap-3 p-2 rounded hover:bg-white/20 text-sm ${pathname === '/vehicles/in-use' ? 'bg-white/20' : ''}`}
                  onClick={mobile ? onClose : undefined}
                >
                  <TruckIcon />
                  <span>รถกำลังใช้งาน</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/pending"
                  className={`flex items-center gap-3 p-2 rounded hover:bg-white/20 text-sm ${pathname === '/pending' ? 'bg-white/20' : ''}`}
                  onClick={mobile ? onClose : undefined}
                >
                  <ClockIcon />
                  <span>รอการอนุมัติ</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/vehicles/orphaned"
                  className={`flex items-center gap-3 p-2 rounded hover:bg-white/20 text-sm ${pathname === '/vehicles/orphaned' ? 'bg-white/20' : ''}`}
                  onClick={mobile ? onClose : undefined}
                >
                  <AlertIcon />
                  <span>ตรวจสอบการลืมคืน</span>
                </Link>
              </li>
            </ul>
          </li>

          <li>
            <div className="my-2 border-t border-white/10 opacity-50"></div>
          </li>

          <li>
            <Link
              href="/maintenance"
              className={`flex items-center gap-3 p-2 rounded hover:bg-white/20 ${pathname === '/maintenance' ? 'bg-white/20' : ''}`}
              onClick={mobile ? onClose : undefined}
            >
              <WrenchIcon />
              <span>ส่งซ่อม</span>
            </Link>
          </li>
          <li>
            <Link
              href="/vehicles-analysis"
              className={`flex items-center gap-3 p-2 rounded hover:bg-white/20 ${pathname === '/vehicles-analysis' ? 'bg-white/20' : ''}`}
              onClick={mobile ? onClose : undefined}
            >
              <ChartIcon />
              <span>วิเคราะห์การใช้งานรถ</span>
            </Link>
          </li>
          <li>
            <Link
              href="/trip-history"
              className={`flex items-center gap-3 p-2 rounded hover:bg-white/20 ${pathname === '/trip-history' ? 'bg-white/20' : ''}`}
              onClick={mobile ? onClose : undefined}
            >
              <HistoryIcon />
              <span>ประวัติการใช้</span>
            </Link>
          </li>
          <li>
            <Link
              href="/users"
              className={`flex items-center gap-3 p-2 rounded hover:bg-white/20 ${pathname === '/users' ? 'bg-white/20' : ''}`}
              onClick={mobile ? onClose : undefined}
            >
              <UserGroupIcon />
              <span>จัดการผู้ใช้งาน</span>
            </Link>
          </li>
          <li>
            <Link
              href="/settings"
              className={`flex items-center gap-3 p-2 rounded hover:bg-white/20 ${pathname === '/settings' ? 'bg-white/20' : ''}`}
              onClick={mobile ? onClose : undefined}
            >
              <CogIcon />
              <span>การตั้งค่า</span>
            </Link>
          </li>
        </ul>
      </nav>
    </>
  );

  const desktop = (
    <aside className="hidden md:flex w-64 p-4 text-white bg-gradient-to-b from-[#075b50] to-[#002629] shrink-0 flex-col justify-between h-screen sticky top-0 overflow-hidden">
      <div className="h-full flex flex-col">
        <NavContent />
      </div>
    </aside>
  );

  const mobile = (
    <div className={`fixed inset-0 z-50 md:hidden ${isOpen ? '' : 'pointer-events-none'}`} aria-hidden={!isOpen}>
      <div
        className={`fixed inset-0 bg-black/40 transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />
      <aside className={`fixed left-0 top-0 w-64 h-[100vh] p-4 bg-gradient-to-b from-[#075b50] to-[#002629] text-white transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'} overflow-y-auto`}>
        <NavContent mobile={true} />
      </aside>
    </div>
  );

  return (
    <>
      {desktop}
      {mobile}
    </>
  );
}
