"use client";

import { useState, useEffect } from "react";
import { useUser } from "@/context/UserContext";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, onSnapshot, query, collection, where, limit } from "firebase/firestore";
import MainHeader from '@/components/main/MainHeader';
import Image from 'next/image';
import { getImageUrl } from '@/lib/imageHelpers';
import SkeletonLoader from "@/components/main/SkeletonLoader"; // Import Skeleton

export default function MyVehiclePage() {
    const { user } = useUser();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState('vehicle');
    const [activeUsage, setActiveUsage] = useState(null);
    const [pendingUsage, setPendingUsage] = useState(null); // สถานะรอการอนุมัติ
    const [vehicle, setVehicle] = useState(null);
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isReturning, setIsReturning] = useState(false);
    const [endMileage, setEndMileage] = useState("");
    const [showReturnModal, setShowReturnModal] = useState(false);
    const [returnMessage, setReturnMessage] = useState("");

    useEffect(() => {
        // รอ Auth โหลดเสร็จก่อน
        if (!user) {
            // ถ้า Auth ยังไม่มา ให้ loading ค้างไว้ก่อน หรือถ้าแน่ใจว่าไม่มี user แล้วค่อยปิด
            return;
        }

        let unsubUsage = null;
        let unsubPending = null;
        let unsubVehicle = null;
        let unsubExpenses = null;

        const userId = user?.lineId;

        // 1. Realtime Listener สำหรับหา Active Usage
        const usageQuery = query(
            collection(db, 'vehicle-usage'),
            where('userId', '==', userId),
            where('status', '==', 'active'),
            limit(1)
        );

        unsubUsage = onSnapshot(usageQuery, (snapshot) => {
            if (!snapshot.empty) {
                const usageDoc = snapshot.docs[0];
                const usageData = { id: usageDoc.id, ...usageDoc.data() };

                if (usageData.startTime?.toDate) {
                    usageData.startTime = usageData.startTime.toDate().toISOString();
                }

                setActiveUsage(usageData);
                setEndMileage(usageData.startMileage?.toString() || "");

                // [OPTIMIZATION] เจอ Active Usage แล้ว ปิด Loading ทันทีเพื่อให้ UI แสดงผลก่อน
                // ข้อมูล Vehicle และ Expenses จะตามมาทีหลัง (Pop-in)
                setLoading(false);

                if (usageData.vehicleId) {
                    // 2. Realtime Listener สำหรับ Vehicle
                    const vehicleRef = doc(db, "vehicles", usageData.vehicleId);
                    unsubVehicle = onSnapshot(vehicleRef, (docSnap) => {
                        if (docSnap.exists()) {
                            setVehicle({ id: docSnap.id, ...docSnap.data() });
                        } else {
                            setVehicle({
                                id: usageData.vehicleId,
                                licensePlate: usageData.vehicleLicensePlate,
                                brand: '',
                                model: ''
                            });
                        }
                    });

                    // 3. Realtime Listener สำหรับ Expenses
                    const expensesQuery = query(
                        collection(db, 'expenses'),
                        where('usageId', '==', usageData.id)
                    );

                    unsubExpenses = onSnapshot(expensesQuery, (expSnapshot) => {
                        const expensesData = expSnapshot.docs.map(doc => {
                            const data = doc.data();
                            if (data.timestamp?.toDate) {
                                data.timestamp = data.timestamp.toDate().toISOString();
                            }
                            return { id: doc.id, ...data };
                        });
                        setExpenses(expensesData);
                    }, (error) => {
                        console.error("Error fetching expenses:", error);
                    });

                }
            } else {
                // กรณีไม่พบ Active Usage
                setActiveUsage(null);
                setVehicle(null);
                setExpenses([]);
            }
        }, (error) => {
            console.error("Error fetching active usage:", error);
        });

        // 4. Realtime Listener สำหรับ Pending Usage (รอการอนุมัติ)
        const pendingQuery = query(
            collection(db, 'vehicle-usage'),
            where('userId', '==', userId),
            where('status', '==', 'pending'),
            limit(1)
        );

        unsubPending = onSnapshot(pendingQuery, (snapshot) => {
            if (!snapshot.empty) {
                const pendingDoc = snapshot.docs[0];
                const pendingData = { id: pendingDoc.id, ...pendingDoc.data() };

                if (pendingData.requestTime?.toDate) {
                    pendingData.requestTime = pendingData.requestTime.toDate().toISOString();
                }

                setPendingUsage(pendingData);
                setLoading(false);

                // ดึงข้อมูลรถสำหรับ pending ด้วย
                if (pendingData.vehicleId && !vehicle) {
                    const vehicleRef = doc(db, "vehicles", pendingData.vehicleId);
                    onSnapshot(vehicleRef, (docSnap) => {
                        if (docSnap.exists()) {
                            setVehicle({ id: docSnap.id, ...docSnap.data() });
                        }
                    });
                }
            } else {
                setPendingUsage(null);
            }
            setLoading(false);
        }, (error) => {
            console.error("Error fetching pending usage:", error);
            setLoading(false);
        });

        return () => {
            if (unsubUsage) unsubUsage();
            if (unsubPending) unsubPending();
            if (unsubVehicle) unsubVehicle();
            if (unsubExpenses) unsubExpenses();
        };
    }, [user]);


    const handleReturnVehicle = async () => {
        if (!activeUsage) {
            setReturnMessage("ไม่พบข้อมูลการใช้งานรถ");
            return;
        }

        setIsReturning(true);
        setReturnMessage("");

        try {
            const response = await fetch('/api/vehicle-usage/return', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    usageId: activeUsage.id,
                    ...(endMileage ? { endMileage: Number(endMileage) } : {}),
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                setReturnMessage(result.error || 'เกิดข้อผิดพลาดในการส่งคืนรถ');
                setIsReturning(false);
                return;
            }

            setReturnMessage("ส่งคืนรถสำเร็จ!");

            // ส่งข้อความ LINE Flex Message จาก user (ตรวจสอบ settings ก่อน)
            try {
                // ดึง settings ก่อน
                const settingsRes = await fetch('/api/notifications/settings');
                const settingsData = await settingsRes.json();
                const userChatEnabled = settingsData?.userChatMessage?.vehicle_returned !== false; // default true

                if (userChatEnabled && typeof window !== 'undefined' && window.liff && window.liff.isInClient()) {
                    const now = new Date().toLocaleDateString('th-TH', {
                        day: '2-digit', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                    });
                    const totalExpenses = getTotalExpenses();
                    const distance = result.totalDistance || (endMileage && activeUsage?.startMileage ? Number(endMileage) - activeUsage.startMileage : null);

                    await window.liff.sendMessages([{
                        type: 'flex',
                        altText: `คืนรถ ${vehicle?.licensePlate || activeUsage?.vehicleLicensePlate || ''}`,
                        contents: {
                            type: 'bubble',
                            size: 'kilo',
                            body: {
                                type: 'box',
                                layout: 'vertical',
                                contents: [
                                    { type: 'text', text: 'คืนรถสำเร็จ', weight: 'bold', size: 'md', color: '#0d9488' },
                                    { type: 'separator', margin: 'lg' },
                                    {
                                        type: 'box',
                                        layout: 'vertical',
                                        margin: 'lg',
                                        spacing: 'sm',
                                        contents: [
                                            {
                                                type: 'box',
                                                layout: 'horizontal',
                                                contents: [
                                                    { type: 'text', text: 'ทะเบียน', size: 'sm', color: '#888888', flex: 2 },
                                                    { type: 'text', text: vehicle?.licensePlate || activeUsage?.vehicleLicensePlate || '-', size: 'sm', color: '#333333', flex: 3, align: 'end' }
                                                ]
                                            },
                                            {
                                                type: 'box',
                                                layout: 'horizontal',
                                                contents: [
                                                    { type: 'text', text: 'รถ', size: 'sm', color: '#888888', flex: 2 },
                                                    { type: 'text', text: `${vehicle?.brand || ''} ${vehicle?.model || ''}`.trim() || '-', size: 'sm', color: '#333333', flex: 3, align: 'end', wrap: true }
                                                ]
                                            },
                                            ...(distance ? [{
                                                type: 'box',
                                                layout: 'horizontal',
                                                contents: [
                                                    { type: 'text', text: 'ระยะทาง', size: 'sm', color: '#888888', flex: 2 },
                                                    { type: 'text', text: `${distance.toLocaleString()} กม.`, size: 'sm', color: '#0d9488', flex: 3, align: 'end', weight: 'bold' }
                                                ]
                                            }] : []),
                                            ...(totalExpenses > 0 ? [{
                                                type: 'box',
                                                layout: 'horizontal',
                                                contents: [
                                                    { type: 'text', text: 'ค่าใช้จ่าย', size: 'sm', color: '#888888', flex: 2 },
                                                    { type: 'text', text: `${totalExpenses.toLocaleString()} บาท`, size: 'sm', color: '#ef4444', flex: 3, align: 'end', weight: 'bold' }
                                                ]
                                            }] : [])
                                        ]
                                    },
                                    { type: 'separator', margin: 'lg' },
                                    { type: 'text', text: now, size: 'xs', color: '#AAAAAA', margin: 'lg', align: 'end' }
                                ],
                                paddingAll: '16px'
                            }
                        }
                    }]);
                    console.log('LINE return message sent successfully');
                }
            } catch (lineError) {
                console.error('Failed to send LINE message:', lineError);
                // ไม่ block flow ถ้าส่ง LINE ไม่สำเร็จ
            }

            setTimeout(() => {
                if (typeof window !== 'undefined' && window.liff && typeof window.liff.close === 'function') {
                    window.liff.close();
                } else {
                    setShowReturnModal(false);
                    setActiveUsage(null);
                    setVehicle(null);
                    setExpenses([]);
                    router.push('/vehicle-selection');
                }
            }, 1500);

        } catch (error) {
            console.error("Error returning vehicle:", error);
            setReturnMessage("เกิดข้อผิดพลาดในการส่งคืนรถ");
            setIsReturning(false);
        }
    };

    const formatDateTime = (dateString) => {
        if (!dateString) return '-';
        try {
            const date = new Date(dateString);
            return date.toLocaleString('th-TH', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            });
        } catch (e) {
            return '-';
        }
    };

    const getExpenseTypeText = (type) => {
        switch (type) {
            case 'fuel': return '⛽ เติมน้ำมัน';
            case 'fluid': return '🛢️ เปลี่ยนของเหลว';
            case 'other': return '💰 ค่าใช้จ่ายอื่นๆ';
            default: return type;
        }
    };

    const getTotalExpenses = () => {
        return expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
    };

    const handleDeleteExpense = async (expenseId) => {
        if (!expenseId) return;
        if (!window.confirm('ยืนยันการลบรายการนี้?')) return;
        try {
            const res = await fetch(`/api/expenses?id=${expenseId}`, { method: 'DELETE' });
            const result = await res.json();
            if (!result.success) {
                alert(result.error || 'เกิดข้อผิดพลาดในการลบ');
            }
        } catch (err) {
            console.error('ลบค่าใช้จ่าย error', err);
            alert('เกิดข้อผิดพลาดในการลบ');
        }
    };

    // Loading Screen with Progress Bar
    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="w-full max-w-xs px-6 text-center">
                    {/* Car Icon */}
                    <div className="w-12 h-12 bg-teal-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <svg className="w-6 h-6 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
                        </svg>
                    </div>

                    {/* Text */}
                    <p className="text-sm text-gray-600 mb-4">กำลังโหลดข้อมูลรถ...</p>

                    {/* Progress Bar */}
                    <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-teal-500 rounded-full animate-loading-bar"></div>
                    </div>
                </div>

                {/* Animation Style */}
                <style jsx>{`
                    @keyframes loading-bar {
                        0% { width: 0%; margin-left: 0%; }
                        50% { width: 60%; margin-left: 20%; }
                        100% { width: 0%; margin-left: 100%; }
                    }
                    .animate-loading-bar {
                        animation: loading-bar 1.5s ease-in-out infinite;
                    }
                `}</style>
            </div>
        );
    }

    // แสดง UI สำหรับ Pending Usage (รอการอนุมัติ)
    if (pendingUsage && !activeUsage) {
        return (
            <div className="min-h-screen bg-gray-50">
                <MainHeader userProfile={user} activeTab={activeTab} setActiveTab={setActiveTab} />
                <div className="px-4 py-2 -mt-8">
                    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                        {/* Header */}
                        <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <div className="text-white">
                                    <div className="font-bold text-lg">รอการอนุมัติ</div>
                                    <div className="text-white/80 text-sm">คำขอใช้รถกำลังรอแอดมินอนุมัติ</div>
                                </div>
                            </div>
                        </div>

                        {/* Vehicle Info */}
                        <div className="p-4">
                            <div className="flex items-center gap-4 mb-4">
                                {getImageUrl(vehicle) && (
                                    <Image
                                        src={getImageUrl(vehicle)}
                                        alt={vehicle?.licensePlate || 'รถ'}
                                        width={80}
                                        height={80}
                                        className="rounded-lg object-cover"
                                        unoptimized
                                    />
                                )}
                                <div>
                                    <div className="text-2xl font-bold text-gray-900">
                                        {vehicle?.licensePlate || pendingUsage.vehicleLicensePlate}
                                    </div>
                                    <div className="text-gray-500">
                                        {vehicle?.brand} {vehicle?.model}
                                    </div>
                                </div>
                            </div>

                            {/* Request Details */}
                            <div className="space-y-3 border-t border-gray-100 pt-4">
                                {pendingUsage.destination && (
                                    <div className="flex items-center gap-2 text-sm">
                                        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                        </svg>
                                        <span className="text-gray-600">จุดหมาย: {pendingUsage.destination}</span>
                                    </div>
                                )}
                                {pendingUsage.purpose && (
                                    <div className="flex items-center gap-2 text-sm">
                                        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        <span className="text-gray-600">วัตถุประสงค์: {pendingUsage.purpose}</span>
                                    </div>
                                )}
                                <div className="flex items-center gap-2 text-sm">
                                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span className="text-gray-600">
                                        ขอเมื่อ: {pendingUsage.requestTime ? new Date(pendingUsage.requestTime).toLocaleString('th-TH') : '-'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Waiting Animation */}
                        <div className="bg-amber-50 p-4 border-t border-amber-100">
                            <div className="flex items-center justify-center gap-3">
                                <div className="flex gap-1">
                                    <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                    <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                    <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                </div>
                                <span className="text-amber-700 font-medium">กำลังรอแอดมินอนุมัติ...</span>
                            </div>
                        </div>
                    </div>

                    {/* Info Box */}
                    <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-xl">
                        <div className="flex gap-3">
                            <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <div className="text-sm text-blue-700">
                                <p className="font-medium mb-1">คำขอของคุณอยู่ระหว่างรอการอนุมัติ</p>
                                <p>เมื่อแอดมินอนุมัติแล้ว คุณจะสามารถเริ่มใช้รถได้ทันที</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!activeUsage) {
        return (
            <div className="min-h-screen bg-gray-50">
                <MainHeader userProfile={user} activeTab={activeTab} setActiveTab={setActiveTab} />
                <div className="px-4 py-2 -mt-8">
                    <div className="bg-white rounded-xl shadow-sm p-8 text-center">
                        <svg className="w-20 h-20 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <h2 className="text-xl font-semibold text-gray-800 mb-2">ยังไม่มีรถที่กำลังใช้งาน</h2>
                        <p className="text-gray-600 mb-6">เลือกรถที่ต้องการใช้งานเพื่อเริ่มเดินทาง</p>
                        <button
                            onClick={() => router.push('/vehicle-selection')}
                            className="px-6 py-3 bg-teal-600 text-white rounded-full font-semibold hover:bg-teal-700 transition-all"
                        >
                            เลือกรถเลย
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <MainHeader userProfile={user} activeTab={activeTab} setActiveTab={setActiveTab} />

            <div className="px-4 py-2 -mt-8">
                {/* Vehicle Card */}
                <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-4">
                    <div className="flex items-center p-4 gap-4">
                        {getImageUrl(vehicle) && (
                            <Image
                                src={getImageUrl(vehicle)}
                                alt={vehicle.licensePlate}
                                width={80}
                                height={40}
                                className="w-20 h-10 object-cover rounded"
                                unoptimized
                            />
                        )}
                        <div className="flex-1">
                            <div className="flex items-center gap-1 mb-1">
                                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                                <span className="text-teal-700 text-xs font-medium">กำลังใช้งาน</span>
                            </div>
                            <h2 className="text-base font-bold text-gray-800">{vehicle ? vehicle.licensePlate : activeUsage.vehicleLicensePlate}</h2>
                            <p className="text-xs text-gray-500 mb-1">{vehicle ? `${vehicle.brand} ${vehicle.model}` : 'กำลังโหลดข้อมูลรถ...'}</p>
                            <div className="flex flex-col gap-1">
                                <div className="flex gap-2 text-xs">
                                    <span className="text-gray-600">เริ่มใช้งาน:</span>
                                    <span className="font-medium">{formatDateTime(activeUsage.startTime)}</span>
                                </div>
                                {activeUsage.destination && (
                                    <div className="flex gap-2 text-xs">
                                        <span className="text-gray-600">จุดหมาย:</span>
                                        <span className="font-medium">{activeUsage.destination}</span>
                                    </div>
                                )}
                                {activeUsage.purpose && (
                                    <div className="flex gap-2 text-xs">
                                        <span className="text-gray-600">วัตถุประสงค์:</span>
                                        <span className="font-medium">{activeUsage.purpose}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Expenses Summary */}
                <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
                    <div className="flex justify-between items-center mb-3">
                        <div className="text-sm font-semibold text-gray-800">ค่าใช้จ่ายระหว่างการใช้งาน</div>
                        <button
                            onClick={() => router.push('/expense-log')}
                            className="px-4 py-2 bg-teal-600 text-white text-sm rounded-lg hover:bg-teal-700 transition-all"
                        >
                            + บันทึกค่าใช้จ่าย
                        </button>
                    </div>

                    {expenses.length === 0 ? (
                        <p className="text-gray-500 text-sm text-center py-4">ยังไม่มีรายการค่าใช้จ่าย</p>
                    ) : (
                        <>
                            <div className="space-y-2 mb-3">
                                {expenses.map(expense => (
                                    <div key={expense.id} className="flex justify-between items-center py-2 border-b border-gray-100 group">
                                        <div>
                                            <div className="text-sm font-medium">{getExpenseTypeText(expense.type)}</div>
                                            {expense.note && <div className="text-xs text-gray-500">{expense.note}</div>}
                                            {expense.mileage && (
                                                <div className="text-xs text-gray-500">ไมล์: {expense.mileage.toLocaleString()} กม.</div>
                                            )}
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            <div className="font-medium text-teal-600">{expense.amount.toLocaleString()} ฿</div>
                                            <div className="text-xs text-gray-500">
                                                {formatDateTime(expense.timestamp).split(' ')[1]}
                                            </div>
                                            <button
                                                onClick={() => handleDeleteExpense(expense.id)}
                                                className="text-xs text-red-600 font-semibold border border-red-200 rounded px-2 py-1 mt-1 hover:bg-red-50 hover:border-red-400 transition"
                                                title="ลบรายการนี้"
                                            >
                                                ลบ
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-between items-center pt-3 border-t-2 border-gray-200">
                                <span className="font-semibold text-gray-800">รวมทั้งหมด:</span>
                                <span className="font-bold text-lg text-teal-600">{getTotalExpenses().toLocaleString()} ฿</span>
                            </div>
                        </>
                    )}
                </div>

                {/* Return Vehicle Button */}
                <button onClick={() => setShowReturnModal(true)}
                    className="w-full py-4 bg-red-700 text-white rounded-lg font-semibold hover:bg-red-700 transition-all text-sm"
                >
                    ส่งคืนรถ
                </button>
            </div>

            {/* Return Modal */}
            {showReturnModal && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-2">
                    <div className="bg-white rounded-xl shadow-lg max-w-sm w-full p-8">
                        <h3 className="text-base font-bold text-gray-800 mb-2 text-center">ส่งคืนรถ</h3>
                        <div className="space-y-2">
                            <div>
                                <h4 className="text-sm font-semibold mb-1">สรุปค่าใช้จ่าย</h4>
                                {expenses.length === 0 ? (
                                    <p className="text-gray-500 text-xs text-center py-1">ไม่มีรายการ</p>
                                ) : (
                                    <ul className="divide-y divide-gray-100 text-sm">
                                        {expenses.map(expense => (
                                            <li key={expense.id} className="flex justify-between items-center py-1">
                                                <span>{getExpenseTypeText(expense.type)}{expense.note ? ` (${expense.note})` : ''}</span>
                                                <span className="font-medium text-teal-600">{expense.amount.toLocaleString()} ฿</span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                                <div className="flex justify-between items-center pt-1 border-t border-gray-200 mt-2">
                                    <span className="font-semibold text-gray-800">รวม:</span>
                                    <span className="font-bold text-base text-teal-600">{getTotalExpenses().toLocaleString()} ฿</span>
                                </div>
                            </div>

                            {returnMessage && (
                                <div className={`p-2 rounded text-xs text-center ${returnMessage.includes('สำเร็จ') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {returnMessage}
                                </div>
                            )}

                            <div className="flex gap-4 mt-4">
                                <button
                                    onClick={() => {
                                        setShowReturnModal(false);
                                        setReturnMessage("");
                                    }}
                                    disabled={isReturning}
                                    className="flex-1 py-2 bg-gray-200 text-gray-700 rounded-full font-semibold hover:bg-gray-300 transition-all disabled:opacity-50 text-sm"
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    onClick={handleReturnVehicle}
                                    disabled={isReturning}
                                    className="flex-1 py-2 bg-red-600 text-white rounded-full font-semibold hover:bg-red-700 transition-all disabled:bg-gray-400 text-sm"
                                >
                                    {isReturning ? 'กำลังส่งคืน...' : 'ยืนยันส่งคืน'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
