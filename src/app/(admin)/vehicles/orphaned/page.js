"use client";

import { useEffect, useState } from "react";
import { collection, query, where, getDocs, orderBy, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Image from 'next/image';
import AlertToast from '@/components/ui/AlertToast';

export default function OrphanedUsagePage() {
    const [orphanedUsages, setOrphanedUsages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [forceReturnLoading, setForceReturnLoading] = useState(null);

    // Alert State
    const [alertState, setAlertState] = useState({ show: false, message: '', type: 'success' });
    const showAlert = (message, type = 'success') => {
        setAlertState({ show: true, message, type });
    };

    useEffect(() => {
        fetchOrphanedUsages();
    }, []);

    const fetchOrphanedUsages = async () => {
        setLoading(true);
        try {
            // ดึง active usages ทั้งหมดที่ยังไม่คืน
            const usagesQ = query(
                collection(db, 'vehicle-usage'),
                where('status', '==', 'active'),
                orderBy('startTime', 'desc')
            );
            const usagesSnap = await getDocs(usagesQ);

            const orphaned = [];

            for (const usageDoc of usagesSnap.docs) {
                const usageData = usageDoc.data();

                // ตรวจสอบว่าผู้ใช้มีข้อมูลหรือไม่
                const hasUserInfo = usageData.userName || usageData.userId;

                // ตรวจสอบว่าเกินเวลาที่กำหนดหรือไม่ (เช่น มากกว่า 24 ชม.)
                const startTime = usageData.startTime?.toDate?.() || new Date(usageData.startTime);
                const now = new Date();
                const hoursDiff = (now - startTime) / (1000 * 60 * 60);

                // รถที่ใช้งานนานเกิน 12 ชั่วโมง หรือไม่มีข้อมูลผู้ใช้
                if (hoursDiff > 12 || !hasUserInfo) {
                    // ดึงข้อมูลรถ
                    let vehicleData = null;
                    try {
                        const vehicleDoc = await getDocs(
                            query(collection(db, 'vehicles'), where('__name__', '==', usageData.vehicleId))
                        );
                        if (!vehicleDoc.empty) {
                            vehicleData = { id: vehicleDoc.docs[0].id, ...vehicleDoc.docs[0].data() };
                        }
                    } catch (e) {
                        console.error('Failed to fetch vehicle:', e);
                    }

                    orphaned.push({
                        id: usageDoc.id,
                        ...usageData,
                        startTime,
                        hoursDiff: Math.round(hoursDiff * 10) / 10,
                        hasUserInfo,
                        vehicle: vehicleData
                    });
                }
            }

            setOrphanedUsages(orphaned);
        } catch (err) {
            console.error('Error fetching orphaned usages:', err);
        }
        setLoading(false);
    };

    const handleForceReturn = async (usage) => {
        if (!confirm(`ยืนยันบังคับคืนรถ ${usage.vehicleLicensePlate || usage.vehicle?.licensePlate || 'นี้'}?`)) {
            return;
        }

        setForceReturnLoading(usage.id);
        try {
            const response = await fetch('/api/vehicle-usage/return', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    usageId: usage.id,
                    endMileage: null, // ไม่มีข้อมูลไมล์สิ้นสุด
                }),
            });

            const data = await response.json();
            if (response.ok) {
                showAlert('บังคับคืนรถสำเร็จ', 'success');
                fetchOrphanedUsages(); // รีโหลดข้อมูล
            } else {
                showAlert(data.error || 'เกิดข้อผิดพลาด', 'error');
            }
        } catch (err) {
            console.error('Force return error:', err);
            showAlert('เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error');
        }
        setForceReturnLoading(null);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
                <span className="ml-3 text-gray-600">กำลังโหลด...</span>
            </div>
        );
    }

    return (
        <div className="relative">
            <AlertToast show={alertState.show} message={alertState.message} type={alertState.type} onClose={() => setAlertState(prev => ({ ...prev, show: false }))} />
            <div className="mb-6">
                <h1 className="text-2xl font-bold mb-2">การใช้งานที่น่าสงสัย</h1>
                <p className="text-gray-600 text-sm">
                    รายการรถที่มีการใช้งานนานเกิน 12 ชั่วโมง หรือไม่มีข้อมูลผู้ใช้งาน
                </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="text-red-600 text-sm font-medium">ไม่มีข้อมูลผู้ใช้</div>
                    <div className="text-2xl font-bold text-red-700">
                        {orphanedUsages.filter(u => !u.hasUserInfo).length}
                    </div>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <div className="text-amber-600 text-sm font-medium">ใช้งานนานเกิน 24 ชม.</div>
                    <div className="text-2xl font-bold text-amber-700">
                        {orphanedUsages.filter(u => u.hoursDiff > 24).length}
                    </div>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="text-blue-600 text-sm font-medium">รอตรวจสอบทั้งหมด</div>
                    <div className="text-2xl font-bold text-blue-700">
                        {orphanedUsages.length}
                    </div>
                </div>
            </div>

            {orphanedUsages.length === 0 ? (
                <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
                    <svg className="w-16 h-16 mx-auto text-green-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h3 className="text-lg font-semibold text-green-800">ไม่พบการใช้งานที่น่าสงสัย</h3>
                    <p className="text-green-600 mt-1">ทุกรถถูกใช้งานและคืนอย่างถูกต้อง</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {orphanedUsages.map(usage => (
                        <div
                            key={usage.id}
                            className={`bg-white rounded-xl shadow border-l-4 p-4 ${!usage.hasUserInfo ? 'border-red-500' :
                                usage.hoursDiff > 24 ? 'border-amber-500' : 'border-yellow-400'
                                }`}
                        >
                            <div className="flex flex-col md:flex-row md:items-center gap-4">
                                {/* Vehicle Info */}
                                <div className="flex items-center gap-4 flex-1">
                                    {usage.vehicle?.imageUrl ? (
                                        <Image
                                            src={usage.vehicle.imageUrl}
                                            alt={usage.vehicle.brand || ''}
                                            width={80}
                                            height={60}
                                            className="object-cover rounded border"
                                            unoptimized
                                        />
                                    ) : (
                                        <div className="w-20 h-15 bg-gray-100 rounded flex items-center justify-center text-xs text-gray-400">
                                            ไม่มีรูป
                                        </div>
                                    )}
                                    <div>
                                        <div className="font-semibold">
                                            {usage.vehicleLicensePlate || usage.vehicle?.licensePlate || 'ไม่ทราบทะเบียน'}
                                        </div>
                                        <div className="text-sm text-gray-600">
                                            {usage.vehicle?.brand} {usage.vehicle?.model}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            จุดหมาย: {usage.destination || '-'}
                                        </div>
                                    </div>
                                </div>

                                {/* User Info */}
                                <div className="flex-1">
                                    {usage.hasUserInfo ? (
                                        <div>
                                            <div className="text-sm font-medium">{usage.userName}</div>
                                            <div className="text-xs text-gray-500">{usage.userId}</div>
                                        </div>
                                    ) : (
                                        <div className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm font-medium inline-flex items-center gap-1">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                            </svg>
                                            ไม่พบข้อมูลผู้ใช้
                                        </div>
                                    )}
                                </div>

                                {/* Time Info */}
                                <div className="text-right">
                                    <div className="text-sm text-gray-600">
                                        เริ่ม: {usage.startTime.toLocaleString('th-TH')}
                                    </div>
                                    <div className={`text-sm font-medium ${usage.hoursDiff > 24 ? 'text-red-600' : usage.hoursDiff > 12 ? 'text-amber-600' : 'text-gray-600'}`}>
                                        ใช้งานมา {usage.hoursDiff} ชม.
                                    </div>
                                </div>

                                {/* Action */}
                                <button
                                    onClick={() => handleForceReturn(usage)}
                                    disabled={forceReturnLoading === usage.id}
                                    className="px-4 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                                >
                                    {forceReturnLoading === usage.id ? 'กำลังดำเนินการ...' : 'บังคับคืน'}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Refresh Button */}
            <div className="mt-6 text-center">
                <button
                    onClick={fetchOrphanedUsages}
                    className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors inline-flex items-center gap-2"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    รีเฟรชข้อมูล
                </button>
            </div>
        </div>
    );
}
