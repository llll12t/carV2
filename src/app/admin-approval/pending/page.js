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
    const [actionType, setActionType] = useState(null);
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
                fetchPending();
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

    const openNoteModal = (usage, action) => {
        setSelectedUsage(usage);
        setActionType(action);
        setShowNoteModal(true);
    };

    const timeAgo = (ts) => {
        if (!ts) return '';
        try {
            let d;
            if (ts.seconds) d = new Date(ts.seconds * 1000);
            else if (ts._seconds) d = new Date(ts._seconds * 1000);
            else d = new Date(ts);
            const now = new Date();
            const diff = Math.floor((now - d) / 1000 / 60); // minutes
            if (diff < 1) return 'เมื่อสักครู่';
            if (diff < 60) return `${diff} นาทีที่แล้ว`;
            const hours = Math.floor(diff / 60);
            if (hours < 24) return `${hours} ชั่วโมงที่แล้ว`;
            const days = Math.floor(hours / 24);
            return `${days} วันที่แล้ว`;
        } catch {
            return '';
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto p-4 min-h-screen pb-24">
            <AlertToast show={alertState.show} message={alertState.message} type={alertState.type} onClose={() => setAlertState(prev => ({ ...prev, show: false }))} />

            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-xl font-bold text-gray-900">คำขออนุมัติ</h1>
                    <p className="text-sm text-gray-500">{pendingList.length} รายการรอการตรวจสอบ</p>
                </div>
                <button
                    onClick={fetchPending}
                    className="p-2.5 bg-white text-gray-600 hover:text-indigo-600 rounded-full shadow-sm border border-gray-200 hover:border-indigo-200 transition-all font-medium"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                </button>
            </div>

            {pendingList.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center bg-white rounded-2xl border border-dashed border-gray-200">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                        <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <h3 className="text-base font-semibold text-gray-900">ไม่มีรายการรออนุมัติ</h3>
                    <p className="text-sm text-gray-500 mt-1">คุณจัดการครบทั้งหมดแล้ว</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {pendingList.map(usage => (
                        <div key={usage.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden transition-shadow hover:shadow-md">
                            <div className="p-5">
                                {/* Header: User Info & Time */}
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm shadow-sm">
                                            {(usage.userName || usage.user?.name || '?')[0]}
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-gray-900 text-sm leading-tight">
                                                {usage.userName || usage.user?.name || 'ไม่ระบุชื่อ'}
                                            </h3>
                                            <p className="text-xs text-gray-500 mt-0.5">{usage.user?.position || 'ผู้ใช้งานทั่วไป'}</p>
                                        </div>
                                    </div>
                                    <span className="text-[10px] font-medium text-slate-500 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                                        {timeAgo(usage.requestTime)}
                                    </span>
                                </div>

                                {/* Content: Vehicle & Details */}
                                <div className="flex gap-4 mb-5">
                                    <div className="w-20 h-20 rounded-xl bg-slate-50 flex-shrink-0 border border-slate-100 overflow-hidden relative">
                                        {getImageUrl(usage.vehicle) ? (
                                            <Image
                                                src={getImageUrl(usage.vehicle)}
                                                alt="vehicle"
                                                fill
                                                className="object-cover"
                                                sizes="80px"
                                                unoptimized
                                            />
                                        ) : (
                                            <div className="flex items-center justify-center h-full text-slate-300">
                                                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
                                                </svg>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0 py-0.5">
                                        <div className="font-bold text-gray-800 text-sm mb-0.5 truncate">
                                            {usage.vehicleLicensePlate || usage.vehicle?.licensePlate || '-'}
                                        </div>
                                        <div className="text-xs text-gray-500 mb-2.5 truncate">
                                            {usage.vehicle?.brand} {usage.vehicle?.model}
                                        </div>

                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2 text-xs text-gray-600">
                                                <div className="w-1 h-1 rounded-full bg-gray-300"></div>
                                                <span className="truncate max-w-[150px]">{usage.destination || 'ไม่ระบุปลายทาง'}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-gray-600">
                                                <div className="w-1 h-1 rounded-full bg-gray-300"></div>
                                                <span className="truncate max-w-[150px]">{usage.purpose || 'ไม่ระบุวัตถุประสงค์'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => openNoteModal(usage, 'reject')}
                                        disabled={processing === usage.id}
                                        className="py-2.5 rounded-xl text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 active:bg-red-200 transition-colors disabled:opacity-50"
                                    >
                                        ปฏิเสธ
                                    </button>
                                    <button
                                        onClick={() => handleAction(usage.id, 'approve')}
                                        disabled={processing === usage.id}
                                        className="py-2.5 rounded-xl text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 shadow-sm shadow-indigo-200 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {processing === usage.id && (
                                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        )}
                                        <span>อนุมัติ</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Reject Note Modal */}
            {showNoteModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden transform transition-all scale-100">
                        <div className="p-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-1">เหตุผลการปฏิเสธ</h3>
                            <p className="text-sm text-gray-500 mb-4">แจ้งให้ผู้ขอทราบว่าทำไมถึงไม่อนุมัติ</p>

                            <textarea
                                value={adminNote}
                                onChange={(e) => setAdminNote(e.target.value)}
                                placeholder="เช่น รถไม่ว่าง, ใช้งานผิดประเภท..."
                                className="w-full p-3 bg-gray-50 border-0 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 min-h-[100px] resize-none"
                            />

                            <div className="grid grid-cols-2 gap-3 mt-6">
                                <button
                                    onClick={() => { setShowNoteModal(false); setAdminNote(''); }}
                                    className="py-2.5 rounded-xl text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200"
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    onClick={() => handleAction(selectedUsage.id, 'reject', adminNote)}
                                    disabled={processing === selectedUsage?.id}
                                    className="py-2.5 rounded-xl text-sm font-medium text-white bg-red-600 hover:bg-red-700 shadow-sm shadow-red-200"
                                >
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
