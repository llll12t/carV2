// src/app/page.js
"use client";

import { useState, useEffect } from 'react';
import { signInWithEmailAndPassword, signInWithCustomToken } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

function LoginPageContent() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [lineLoading, setLineLoading] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [deniedRole, setDeniedRole] = useState('');
  const router = useRouter();
  const { userProfile, loading: authLoading, logout } = useAuth();

  useEffect(() => {
    console.log('[Login Page] Auth state changed:', { authLoading, userProfile: userProfile ? { role: userProfile.role, uid: userProfile.uid } : null });

    if (!authLoading && userProfile) {
      console.log('[Login Page] User authenticated. Role:', userProfile.role);

      if (userProfile.role === 'admin' || userProfile.role === 'employee') {
        console.log('[Login Page] Redirecting to dashboard (Hard Reload)...');
        window.location.href = '/dashboard';
      } else {
        // Non-admin trying to access - show access denied
        console.log('[Login Page] Access denied for role:', userProfile.role);
        setAccessDenied(true);
        setDeniedRole(userProfile.role || 'driver');
      }
    }
  }, [userProfile, authLoading]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    console.log('[Login] Starting email/password login for:', email);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log('[Login] ✅ Firebase auth successful. UID:', userCredential.user.uid);
      console.log('[Login] Waiting for AuthContext to update userProfile and trigger redirect via useEffect...');
      // Don't navigate here - let useEffect handle it when userProfile is loaded
    } catch (err) {
      console.error('[Login] ❌ Login failed:', err);
      if (err.code === 'auth/invalid-credential') {
        setError('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
      } else {
        setError('เกิดข้อผิดพลาดในการเข้าสู่ระบบ');
      }
      setLoading(false); // Only set loading false on error
    }
    // Note: Don't set loading to false on success - keep it true until redirect happens
  };

  const handleLineLogin = async () => {
    setLineLoading(true);
    setError('');

    try {
      // Check if on localhost
      const isLocalhost = typeof window !== 'undefined' &&
        (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

      if (isLocalhost) {
        setError('LINE Login ไม่รองรับบน localhost กรุณาใช้ Email/Password หรือทดสอบบน Production');
        setLineLoading(false);
        return;
      }

      const liff = (await import('@line/liff')).default;
      const liffId = process.env.NEXT_PUBLIC_LIFF_ID;

      if (!liffId) {
        setError('ไม่พบ LIFF ID');
        setLineLoading(false);
        return;
      }

      await liff.init({ liffId });

      if (!liff.isLoggedIn()) {
        // Redirect to LINE login
        liff.login({ redirectUri: window.location.href });
        return;
      }

      // Get LINE profile and access token
      const profile = await liff.getProfile();
      const accessToken = liff.getAccessToken();

      // Exchange for Firebase custom token
      const response = await fetch('/api/auth/line', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken,
          lineUserId: profile.userId,
          displayName: profile.displayName,
          pictureUrl: profile.pictureUrl
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'ไม่สามารถเข้าสู่ระบบด้วย LINE ได้');
        setLineLoading(false);
        return;
      }

      // Handle needsLink case - LINE user not found in system
      if (data.needsLink) {
        setError('ไม่พบบัญชีผู้ใช้ในระบบ กรุณาติดต่อผู้ดูแลระบบเพื่อเพิ่มบัญชี');
        setLineLoading(false);
        return;
      }

      // Check role before signing in
      if (data.userProfile) {
        const role = data.userProfile.role;
        if (role !== 'admin' && role !== 'employee') {
          setAccessDenied(true);
          setDeniedRole(role || 'driver');
          setLineLoading(false);
          return;
        }
      } else {
        // No userProfile returned - something wrong
        setError('ไม่พบข้อมูลผู้ใช้ กรุณาลองใหม่');
        setLineLoading(false);
        return;
      }

      // Sign in with custom token
      await signInWithCustomToken(auth, data.customToken);
      console.log('[LINE Login] ✅ Signed in successfully. Waiting for redirect via useEffect...');
      // Don't navigate here - let useEffect handle it when userProfile is loaded

    } catch (err) {
      console.error('LINE login error:', err);

      // Better error messages
      if (err.message?.includes('invalid url') || err.message?.includes('redirect')) {
        setError('LINE Login ไม่รองรับ URL นี้ กรุณาใช้ Email/Password');
      } else if (err.message?.includes('init')) {
        setError('ไม่สามารถเชื่อมต่อ LINE ได้ กรุณาลองใหม่');
      } else {
        setError('เกิดข้อผิดพลาดในการเข้าสู่ระบบด้วย LINE');
      }
      setLineLoading(false); // Only set loading false on error
    }
    // Note: Don't set lineLoading to false on success - keep it true until redirect happens
  };

  const handleLogoutAndRetry = async () => {
    if (logout) {
      await logout();
    }
    setAccessDenied(false);
    setDeniedRole('');
  };

  // Access Denied Screen
  if (accessDenied) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">ไม่มีสิทธิ์เข้าถึง</h2>
          <p className="text-sm text-gray-600 mb-2">
            บัญชีนี้ไม่มีสิทธิ์เข้าใช้งานหน้าผู้ดูแลระบบ
          </p>
          <p className="text-xs text-gray-400 mb-6">
            (บทบาท: {deniedRole === 'driver' ? 'พนักงานขับรถ' : deniedRole})
          </p>
          <div className="space-y-2">
            <button
              onClick={handleLogoutAndRetry}
              className="w-full py-2.5 bg-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-300 transition"
            >
              ออกจากระบบแล้วลองใหม่
            </button>
            <p className="text-xs text-gray-500 mt-4">
              หากคุณเป็นพนักงานขับรถ กรุณาเข้าใช้งานผ่าน LINE App
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-teal-600 rounded-2xl mb-4">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-gray-900">ระบบจัดการยานพาหนะ</h1>
          <p className="text-sm text-gray-500 mt-1">เข้าสู่ระบบเพื่อดำเนินการต่อ</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
              อีเมล
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="example@company.com"
              autoComplete="email"
              className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-gray-50 focus:bg-white transition"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
              รหัสผ่าน
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              autoComplete="current-password"
              className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-gray-50 focus:bg-white transition"
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || lineLoading}
            className="w-full py-2.5 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50 transition flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                กำลังเข้าสู่ระบบ...
              </>
            ) : (
              'เข้าสู่ระบบ'
            )}
          </button>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-2 bg-white text-gray-400">หรือ</span>
            </div>
          </div>

          {/* LINE Login Button */}
          <button
            type="button"
            onClick={handleLineLogin}
            disabled={loading || lineLoading}
            className="w-full py-2.5 bg-[#06C755] text-white text-sm font-medium rounded-lg hover:bg-[#05b34d] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#06C755] disabled:opacity-50 transition flex items-center justify-center gap-2"
          >
            {lineLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                กำลังเชื่อมต่อ LINE...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
                </svg>
                เข้าสู่ระบบด้วย LINE
              </>
            )}
          </button>
        </form>

        {/* Note */}
        <p className="text-center text-xs text-gray-400 mt-6">
          สำหรับผู้ดูแลระบบและพนักงานเท่านั้น
        </p>
      </div>
    </main>
  );
}

// Export directly - AuthProvider is in root layout
export default LoginPageContent;
