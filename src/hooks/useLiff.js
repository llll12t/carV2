"use client";

import { useState, useEffect } from 'react';

const useLiff = (liffId) => {
    const [liffObject, setLiffObject] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isInClient, setIsInClient] = useState(false);

    useEffect(() => {
        const initializeLiff = async () => {
            if (!liffId) {
                setError("LIFF ID is not provided.");
                setLoading(false);
                return;
            }

            try {
                const liff = (await import('@line/liff')).default;

                // Init LIFF first
                await liff.init({ liffId });

                // Check if we're in LIFF client (LINE app browser)
                const inClient = liff.isInClient();
                setIsInClient(inClient);

                // Handle liff.state redirect
                const params = new URLSearchParams(window.location.search);
                let redirectPath = params.get('liff.state');
                if (redirectPath) {
                    try {
                        let decoded = redirectPath;
                        for (let i = 0; i < 3; i++) {
                            const prev = decoded;
                            try { decoded = decodeURIComponent(decoded); } catch (e) { break; }
                            if (decoded === prev) break;
                        }
                        const nestedMatch = decoded.match(/liff\.state=([^&]+)/);
                        if (nestedMatch && nestedMatch[1]) {
                            try { decoded = decodeURIComponent(nestedMatch[1]); } catch (e) { }
                        }
                        decoded = decoded.split('?')[0].trim();
                        let targetPath = decoded;
                        if (!targetPath.startsWith('/')) targetPath = '/' + targetPath;

                        const currentPath = window.location.pathname || '/';
                        if (targetPath.startsWith('/confirm') && currentPath !== targetPath) {
                            window.location.replace(targetPath);
                            return;
                        }
                    } catch (e) {
                        console.warn('Failed to normalize liff.state', e);
                    }
                }

                if (!liff.isLoggedIn()) {
                    // Need to login
                    liff.login({
                        scope: 'profile openid chat_message.write'
                    });
                    return;
                }

                // Logged in successfully
                setLiffObject(liff);
                setLoading(false);

            } catch (err) {
                console.error("LIFF initialization failed", err);

                // Better error message based on error type
                let errorMessage = 'การเชื่อมต่อ LINE ไม่สมบูรณ์';

                if (err.message?.includes('client features') || err.message?.includes('liff.init')) {
                    errorMessage = 'กรุณาเข้าใช้งานผ่าน LINE App (ไม่รองรับการเข้าจาก browser ปกติ)';
                } else if (err.code === 'INVALID_ID_TOKEN') {
                    errorMessage = 'Session หมดอายุ กรุณาปิดแล้วเปิด LINE ใหม่';
                } else if (err.message) {
                    errorMessage = `${errorMessage}: ${err.message}`;
                }

                setError(errorMessage);
                setLoading(false);
            }
        };

        initializeLiff();
    }, [liffId]);

    return { liff: liffObject, profile, loading, error, isInClient };
};

export default useLiff;
