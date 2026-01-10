"use client";

import { UserProvider, useUser } from "@/context/UserContext";
import { useState } from 'react';
import LiffQueryRouter from '@/components/main/LiffQueryRouter';

function MainLayoutContent({ children }) {
  const { user, loading, lineUserId, lineProfile } = useUser();
  const [phoneInput, setPhoneInput] = useState('');
  const [linking, setLinking] = useState(false);
  const [linkMessage, setLinkMessage] = useState('');

  // Loading state
  if (loading) {
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

  // User not found - needs to link account
  if (lineUserId && !user) {
    const handleLinkByPhone = async () => {
      if (!phoneInput.trim() || !lineProfile) return;

      setLinking(true);
      setLinkMessage('');

      try {
        const resp = await fetch('/api/auth/line/link', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lineId: lineUserId,
            phone: phoneInput.trim(),
            linePictureUrl: lineProfile.pictureUrl || null,
            lineDisplayName: lineProfile.displayName || null
          }),
        });

        const body = await resp.json();

        if (resp.ok && (body.customToken || body.userProfile)) {
          setLinkMessage('ผูกบัญชีสำเร็จ กำลังโหลดข้อมูล...');
          // Reload to refresh user data
          window.location.reload();
        } else {
          setLinkMessage(body.error || 'ไม่สามารถผูกบัญชีได้');
        }
      } catch (error) {
        console.error('Link error:', error);
        setLinkMessage('เกิดข้อผิดพลาดในการเชื่อมต่อ');
      }

      setLinking(false);
    };

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
              เราไม่พบบัญชีพนักงานที่เชื่อมกับ LINE นี้ ({lineProfile?.displayName || ''})
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
            onClick={handleLinkByPhone}
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

  // User found - render children (DataProvider removed)
  if (user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <LiffQueryRouter />
        {children}
      </div>
    );
  }

  // Fallback loading
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
        <p className="text-gray-600">กำลังตรวจสอบข้อมูลผู้ใช้...</p>
      </div>
    </div>
  );
}

export default function MainLayout({ children }) {
  return (
    <UserProvider>
      <MainLayoutContent>{children}</MainLayoutContent>
    </UserProvider>
  );
}
