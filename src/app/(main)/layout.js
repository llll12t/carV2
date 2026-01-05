"use client";

import { useAuth } from "@/context/AuthContext";
import { DataProvider } from "@/context/DataContext";
import useLiffAuth from '@/hooks/useLiffAuth';
import { useState, useEffect } from 'react';
import LiffQueryRouter from '@/components/main/LiffQueryRouter';

export default function MainLayout({ children }) {
  const { user, userProfile, loading: authLoading, setUserProfileFromAuth } = useAuth();
  // ดึง error: liffAuthError ออกมาใช้งาน
  const { loading: liffLoading, needsLink, linkProfile, linkByPhone, error: liffAuthError, userProfile: liffUserProfile } = useLiffAuth();
  const [phoneInput, setPhoneInput] = useState('');
  const [linking, setLinking] = useState(false);
  const [linkMessage, setLinkMessage] = useState('');

  useEffect(() => {
    if (liffUserProfile && setUserProfileFromAuth) {
      console.log('Setting userProfile from LIFF auth:', liffUserProfile);
      setUserProfileFromAuth(liffUserProfile);
    }
  }, [liffUserProfile, setUserProfileFromAuth]);

  if (liffLoading || authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-full max-w-xs px-6 text-center">
          {/* Car Icon */}
          <div className="w-14 h-14 bg-teal-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
            </svg>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-teal-500 rounded-full"
              style={{
                animation: 'loading-progress 1.5s ease-in-out infinite'
              }}
            />
          </div>
        </div>

        <style jsx>{`
          @keyframes loading-progress {
            0% { width: 0%; margin-left: 0%; }
            50% { width: 60%; margin-left: 20%; }
            100% { width: 0%; margin-left: 100%; }
          }
        `}</style>
      </div>
    );
  }

  // -------------------------------------------------------
  // [ส่วนที่เพิ่ม] ถ้ามี Error จาก LIFF/API ให้แสดงออกมาเลย
  // -------------------------------------------------------
  if (liffAuthError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 max-w-sm w-full text-center">
          <div className="w-14 h-14 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">ไม่สามารถเชื่อมต่อได้</h3>
          <p className="text-sm text-gray-600 mb-4">
            {typeof liffAuthError === 'string' ? liffAuthError : 'กรุณาเข้าใช้งานผ่าน LINE App'}
          </p>

          <div className="space-y-2">
            <button
              onClick={() => window.location.reload()}
              className="w-full px-4 py-2.5 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition"
            >
              ลองใหม่
            </button>
            <a
              href="/"
              className="block w-full px-4 py-2.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition"
            >
              เข้าสู่ระบบด้วย Email
            </a>
          </div>

          <p className="text-xs text-gray-400 mt-4">
            สำหรับผู้ดูแลระบบ สามารถเข้าผ่านหน้า Login ได้
          </p>
        </div>
      </div>
    );
  }

  // ... (โค้ดส่วน needsLink และ return ปกติ ด้านล่างเหมือนเดิม) ...
  if (needsLink) {
    // ... (คงเดิม)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
          <div className="mb-4">
            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-center mb-2">ผูกบัญชีด้วยหมายเลขโทรศัพท์</h2>
            <p className="text-sm text-gray-600 text-center mb-6">
              เราไม่พบบัญชีพนักงานที่เชื่อมกับ LINE นี้ ({linkProfile?.displayName || ''})
            </p>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              หมายเลขโทรศัพท์
            </label>
            <input
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value)}
              placeholder="0812345678"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              type="tel"
            />
          </div>

          {linkMessage && (
            <div className={`mb-4 p-3 rounded ${linkMessage.includes('สำเร็จ') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              <p className="text-sm">{linkMessage}</p>
            </div>
          )}

          <button
            onClick={async () => {
              setLinking(true);
              setLinkMessage('');
              const res = await linkByPhone(phoneInput.trim());
              if (res.success) {
                setLinkMessage('ผูกบัญชีสำเร็จ กำลังโหลดข้อมูล...');
              } else {
                setLinkMessage(res.error || 'ไม่สามารถผูกบัญชีได้');
              }
              setLinking(false);
            }}
            className="w-full px-4 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            disabled={linking || !phoneInput.trim()}
          >
            {linking ? 'กำลังผูกบัญชี...' : 'ผูกบัญชี'}
          </button>

          <p className="text-xs text-gray-500 text-center mt-4">
            ถ้าคุณยังไม่ลงทะเบียนในระบบ โปรดติดต่อผู้ดูแล
          </p>
        </div>
      </div>
    );
  }

  if (userProfile) {
    return (
      <DataProvider userId={userProfile.uid}>
        <div className="min-h-screen bg-gray-50">
          <LiffQueryRouter />
          {children}
        </div>
      </DataProvider>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
        <p className="text-gray-600">กำลังตรวจสอบข้อมูลผู้ใช้...</p>
      </div>
    </div>
  );
}

