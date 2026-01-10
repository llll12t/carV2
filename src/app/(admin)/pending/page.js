"use client";

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { getImageUrl } from '@/lib/imageHelpers';
import AlertToast from '@/components/ui/AlertToast';

export default function PendingApprovalsPage() {
    const [pendingList, setPendingList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(null);
    const [adminNote, setAdminNote] = useState('');
    const [showNoteModal, setShowNoteModal] = useState(false);
    const [selectedUsage, setSelectedUsage] = useState(null);
    const [alertState, setAlertState] = useState({ show: false, message: '', type: 'success' });

    const showAlert = (message, type = 'success') => {
        setAlertState({ show: true, message, type });
    };

    const fetchPending = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/vehicle-usage/approve');
            const data = await res.json();
            setPendingList(data.pending || []);
        } catch (e) {
            console.error('Error fetching pending:', e);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchPending();
    }, []);

    const handleAction = async (usageId, action, note = '') => {
        setProcessing(usageId);
        try {
            const res = await fetch('/api/vehicle-usage/approve', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ usageId, action, adminNote: note }),
            });
            const data = await res.json();

            if (res.ok) {
                showAlert(data.message, 'success');
                // Remove the item locally to feel faster, or refetch
                setPendingList(prev => prev.filter(item => item.id !== usageId));
            } else {
                showAlert(data.error || 'เกิดข้อผิดพลาด', 'error');
            }
        } catch (e) {
            showAlert('เกิดข้อผิดพลาดในการดำเนินการ', 'error');
        }
        setProcessing(null);
        setShowNoteModal(false);
        setAdminNote('');
        setSelectedUsage(null);
    };

    const openNoteModal = (usage) => {
        setSelectedUsage(usage);
        setShowNoteModal(true);
    };

    const formatDate = (ts) => {
        if (!ts) return '-';
        let date;
        if (ts.seconds) date = new Date(ts.seconds * 1000);
        else if (ts._seconds) date = new Date(ts._seconds * 1000);
        else date = new Date(ts);

        return date.toLocaleString('th-TH', {
            dateStyle: 'medium',
            timeStyle: 'short'
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full min-h-[400px]">
                <div className="w-10 h-10 border-4 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto">
            <AlertToast show={alertState.show} message={alertState.message} type={alertState.type} onClose={() => setAlertState(prev => ({ ...prev, show: false }))} />

            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">รอการอนุมัติการใช้งาน</h1>
                    <p className="text-sm text-gray-500 mt-1">รายการขอใช้รถที่รอการตรวจสอบจากคุณ</p>
                </div>
                <div className="bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
                    <span className="text-sm font-medium text-gray-700">รออนุมัติ {pendingList.length} รายการ</span>
                </div>
            </div>

            {pendingList.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm">
                    <div className="w-20 h-20 bg-teal-50 rounded-full flex items-center justify-center mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 text-teal-600">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">ไม่มีรายการรออนุมัติ</h3>
                    <p className="text-gray-500 mt-1">คุณได้จัดการคำขอทั้งหมดแล้ว</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6">
                    {pendingList.map(item => (
                        <div key={item.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-200">
                            <div className="p-6 flex flex-col md:flex-row gap-6">
                                {/* Left: Vehicle Image & Info */}
                                <div className="flex-shrink-0 md:w-48 lg:w-56 flex flex-col gap-3">
                                    <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-gray-100 border border-gray-100">
                                        {getImageUrl(item.vehicle) ? (
                                            <Image
                                                src={getImageUrl(item.vehicle)}
                                                alt="Vehicle"
                                                fill
                                                className="object-cover"
                                            />
                                        ) : (
                                            <div className="flex items-center justify-center h-full text-gray-300">
                                                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                            </div>
                                        )}
                                    </div>
                                    <div className="text-center md:text-left">
                                        <div className="font-semibold text-gray-900">{item.vehicleLicensePlate || item.vehicle?.licensePlate}</div>
                                        <div className="text-xs text-gray-500">{item.vehicle?.brand} {item.vehicle?.model}</div>
                                    </div>
                                </div>

                                {/* Middle: Request Details */}
                                <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                                    <div className="col-span-full pb-4 border-b border-gray-100 mb-2">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold text-sm">
                                                {(item.userName || item.user?.name || '?')[0]}
                                            </div>
                                            <div>
                                                <div className="font-medium text-gray-900">{item.userName || item.user?.name || 'ไม่ระบุชื่อ'}</div>
                                                <div className="text-xs text-gray-500">{item.user?.position || 'แผนกทั่วไป'}</div>
                                            </div>
                                            <div className="ml-auto text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded">
                                                {formatDate(item.createdAt || item.requestTime)}
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">จุดหมายปลายทาง</label>
                                        <p className="text-sm font-medium text-gray-800 mt-1">{item.destination}</p>
                                    </div>

                                    <div>
                                        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">วัตถุประสงค์</label>
                                        <p className="text-sm font-medium text-gray-800 mt-1">{item.purpose}</p>
                                    </div>
                                </div>

                                {/* Right: Actions */}
                                <div className="flex flex-row md:flex-col gap-3 justify-center md:justify-start md:w-32 flex-shrink-0 border-t md:border-t-0 md:border-l border-gray-100 pt-4 md:pt-0 md:pl-6">
                                    <button
                                        onClick={() => handleAction(item.id, 'approve')}
                                        disabled={processing === item.id}
                                        className="flex-1 md:flex-none py-2 px-4 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-lg shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        {processing === item.id ? (
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        ) : (
                                            <>
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                                อนุมัติ
                                            </>
                                        )}
                                    </button>

                                    <button
                                        onClick={() => openNoteModal(item)}
                                        disabled={processing === item.id}
                                        className="flex-1 md:flex-none py-2 px-4 bg-white border border-red-200 text-red-600 hover:bg-red-50 text-sm font-medium rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                        ปฏิเสธ
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Reject Modal */}
            {showNoteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden transform transition-all scale-100">
                        <div className="p-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-1">ระบุเหตุผลการปฏิเสธ</h3>
                            <p className="text-sm text-gray-500 mb-4">แจ้งให้ผู้ขอใช้งานทราบว่าทำไมถึงไม่อนุมัติคำขอนี้</p>

                            <textarea
                                value={adminNote}
                                onChange={(e) => setAdminNote(e.target.value)}
                                placeholder="เช่น รถไม่ว่าง, จำเป็นต้องซ่อมบำรุง..."
                                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 min-h-[120px] resize-none"
                                autoFocus
                            />

                            <div className="flex gap-3 mt-6 justify-end">
                                <button
                                    onClick={() => { setShowNoteModal(false); setAdminNote(''); }}
                                    className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition"
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    onClick={() => handleAction(selectedUsage.id, 'reject', adminNote)}
                                    disabled={processing === selectedUsage?.id}
                                    className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-700 shadow-sm shadow-red-200 transition flex items-center gap-2"
                                >
                                    {processing === selectedUsage?.id && (
                                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    )}
                                    ยืนยันปฏิเสธ
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
