"use client";

import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot, doc, getDoc, getDocs, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Image from 'next/image';
import AlertToast from '@/components/ui/AlertToast';

function getStatusLabel(status) {
  switch (status) {
    case "in-use": return "กำลังถูกใช้งาน";
    case "on-trip": return "อยู่ระหว่างเดินทาง";
    default: return "ไม่ทราบสถานะ";
  }
}

export default function VehiclesInUsePage() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [forceReturnModal, setForceReturnModal] = useState(null);
  const [forceReturnLoading, setForceReturnLoading] = useState(false);
  const [endMileage, setEndMileage] = useState('');

  // Alert State
  const [alertState, setAlertState] = useState({ show: false, message: '', type: 'success' });
  const showAlert = (message, type = 'success') => {
    setAlertState({ show: true, message, type });
  };

  useEffect(() => {
    const q = query(
      collection(db, "vehicles"),
      where("status", "in", ["in-use", "on-trip"])
    );

    const unsubscribe = onSnapshot(q, async (qs) => {
      const list = [];
      for (const docSnap of qs.docs) {
        const data = { id: docSnap.id, ...docSnap.data() };
        // fetch active vehicle-usage for this vehicle
        try {
          const usageQ = query(
            collection(db, 'vehicle-usage'),
            where('vehicleId', '==', data.id),
            where('status', '==', 'active')
          );
          const usageSnap = await getDocs(usageQ);
          if (!usageSnap.empty) {
            const usageDoc = usageSnap.docs[0];
            const usageData = usageDoc.data();
            // set driver name from userName field in vehicle-usage
            data.driver = { name: usageData.userName };
            data.activeUsageId = usageDoc.id;
            data.activeUsage = {
              id: usageDoc.id,
              ...usageData,
              startTime: usageData.startTime?.toDate?.() || new Date(usageData.startTime)
            };

            // fetch expenses for this usage
            const expensesQ = query(
              collection(db, 'expenses'),
              where('usageId', '==', usageDoc.id),
              orderBy('timestamp', 'desc')
            );
            const expensesSnap = await getDocs(expensesQ);
            const expenses = expensesSnap.docs.map(doc => ({
              id: doc.id,
              ...doc.data(),
              timestamp: doc.data().timestamp?.toDate?.() || new Date(doc.data().timestamp)
            }));
            data.expenses = expenses;
            data.totalExpenses = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
          }
        } catch (e) {
          console.error('Failed to fetch active vehicle-usage for driver', e);
        }
        list.push(data);
      }
      setVehicles(list);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // ฟังก์ชันบังคับคืนรถโดยแอดมิน
  const handleForceReturn = async () => {
    if (!forceReturnModal) return;

    setForceReturnLoading(true);
    try {
      const response = await fetch('/api/vehicle-usage/return', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usageId: forceReturnModal.activeUsageId,
          endMileage: endMileage ? Number(endMileage) : null,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        showAlert('บังคับคืนรถสำเร็จ', 'success');
        setForceReturnModal(null);
        setEndMileage('');
      } else {
        showAlert(data.error || 'เกิดข้อผิดพลาด', 'error');
      }
    } catch (err) {
      console.error('Force return error:', err);
      showAlert('เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error');
    }
    setForceReturnLoading(false);
  };

  if (loading) return <p className="text-gray-600">กำลังโหลด...</p>;

  if (vehicles.length === 0) {
    return <div className="bg-white rounded-xl shadow p-6">ไม่มีรถที่กำลังใช้งานอยู่</div>;
  }

  return (
    <div className="relative">
      <AlertToast show={alertState.show} message={alertState.message} type={alertState.type} onClose={() => setAlertState(prev => ({ ...prev, show: false }))} />
      <h1 className="text-2xl font-bold mb-4">รถที่กำลังใช้งาน</h1>
      <p className="text-gray-600 text-sm mb-4">
        รถที่แสดงด้านล่างกำลังถูกใช้งานอยู่ หากผู้ใช้ลืมคืนรถ แอดมินสามารถบังคับคืนได้
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {vehicles.map(v => (
          <div key={v.id} className="bg-white rounded-xl shadow p-4 flex flex-col">
            <div className="flex items-center gap-4">
              {v.imageUrl ? (
                <Image src={v.imageUrl} alt={v.brand + ' ' + v.model} width={112} height={80} className="object-cover rounded-md border" unoptimized />
              ) : (
                <div className="w-28 h-20 bg-gray-100 rounded-md flex items-center justify-center text-sm text-gray-500 border">ไม่มีรูป</div>
              )}
              <div className="flex-1">
                <div className="font-semibold">{v.brand} {v.model}</div>
                <div className="text-sm text-gray-600">ทะเบียน: <span className="font-medium">{v.licensePlate || '-'}</span></div>
                <div className="text-sm text-gray-600">ประเภท: <span className="font-medium">{v.type || '-'}</span></div>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2 py-1 rounded-full bg-yellow-100 text-yellow-800 text-sm">{getStatusLabel(v.status)}</span>
                <div className="text-right">
                  {/* คนขับที่กำลังใช้งาน: แสดงชื่อ userName หรือชื่อจริงของ driver */}
                  {v.driver?.name ? (
                    <div className="text-sm">คนขับ: <span className="font-medium">{v.driver.name}</span></div>
                  ) : v.driver?.displayName ? (
                    <div className="text-sm">คนขับ: <span className="font-medium">{v.driver.displayName}</span></div>
                  ) : v.booking?.driverName ? (
                    <div className="text-sm">คนขับ: <span className="font-medium">{v.booking.driverName}</span></div>
                  ) : (
                    <div className="text-sm text-red-500 font-medium">คนขับ: ไม่พบข้อมูล</div>
                  )}
                </div>
              </div>

              {/* ข้อมูลการใช้งาน */}
              {v.activeUsage && (
                <div className="bg-amber-50 border border-amber-200 rounded p-3 text-sm">
                  <div className="font-medium text-amber-800 mb-2">ข้อมูลการใช้งานปัจจุบัน</div>
                  <div className="space-y-1 text-xs text-amber-700">
                    <div>เริ่มใช้งาน: {v.activeUsage.startTime?.toLocaleString('th-TH') || '-'}</div>
                    <div>จุดหมาย: {v.activeUsage.destination || '-'}</div>
                    <div>วัตถุประสงค์: {v.activeUsage.purpose || '-'}</div>
                    {v.activeUsage.startMileage && (
                      <div>ไมล์เริ่มต้น: {v.activeUsage.startMileage.toLocaleString()} กม.</div>
                    )}
                  </div>
                </div>
              )}

              {v.booking && (
                <div className="bg-gray-50 border border-gray-100 rounded p-3 text-sm">
                  <div className="font-medium text-sm mb-1">รายละเอียดการเดินทาง</div>
                  <div className="text-xs text-gray-600">ผู้จอง: {v.booking.requester?.name || v.booking.requester?.email || v.booking.userEmail || v.booking.userId || 'ไม่ระบุ'}</div>
                  <div className="text-xs text-gray-600">ต้นทาง: {v.booking.origin || '-'}</div>
                  <div className="text-xs text-gray-600">ปลายทาง: {v.booking.destination || '-'}</div>
                  <div className="text-xs text-gray-600">วัตถุประสงค์: {v.booking.purpose || '-'}</div>
                  <div className="text-xs text-gray-600">วันเริ่ม: {v.booking.startDateTime ? new Date(v.booking.startDateTime.seconds * 1000).toLocaleString('th-TH') : v.booking.startDate ? new Date(v.booking.startDate.seconds ? v.booking.startDate.seconds * 1000 : v.booking.startDate).toLocaleString('th-TH') : '-'}</div>
                  <div className="text-xs text-gray-600">วันสิ้นสุด: {v.booking.endDateTime ? new Date(v.booking.endDateTime.seconds * 1000).toLocaleString('th-TH') : v.booking.endDate ? new Date(v.booking.endDate.seconds ? v.booking.endDate.seconds * 1000 : v.booking.endDate).toLocaleString('th-TH') : '-'}</div>
                  <div className="text-xs text-gray-600">ทะเบียนรถ: {v.booking.vehicleLicensePlate || v.booking.vehicleId || '-'}</div>
                  <div className="text-xs text-gray-600">คนขับ: {v.booking.driverName || v.booking.driverId || '-'}</div>
                  {v.booking.notes && <div className="text-xs text-gray-600">หมายเหตุ: {v.booking.notes}</div>}
                </div>
              )}

            </div>

            {/* ค่าใช้จ่ายระหว่างการใช้งาน */}
            {v.expenses && v.expenses.length > 0 && (
              <div className="mt-4 bg-blue-50 border border-blue-200 rounded p-3">
                <div className="font-medium text-sm mb-2 text-blue-900">ค่าใช้จ่ายระหว่างการใช้งาน</div>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {v.expenses.map(exp => (
                    <div key={exp.id} className="flex justify-between items-start text-xs">
                      <div className="flex-1">
                        <span className="font-medium">
                          {exp.type === 'fuel' ? 'เติมน้ำมัน' :
                            exp.type === 'fluid' ? 'เปลี่ยนของเหลว' :
                              exp.title || 'อื่นๆ'}
                        </span>
                        {exp.note && <span className="text-gray-600 ml-1">({exp.note})</span>}
                        {exp.mileage && <div className="text-gray-600">ไมล์: {exp.mileage.toLocaleString()} กม.</div>}
                      </div>
                      <span className="font-semibold text-teal-700 ml-2">{exp.amount.toLocaleString()} ฿</span>
                    </div>
                  ))}
                </div>
                <div className="mt-2 pt-2 border-t border-blue-300 flex justify-between items-center">
                  <span className="text-sm font-semibold text-blue-900">รวมทั้งหมด:</span>
                  <span className="text-sm font-bold text-teal-700">{v.totalExpenses.toLocaleString()} ฿</span>
                </div>
              </div>
            )}

            {/* ปุ่มบังคับคืนรถ */}
            {v.activeUsageId && (
              <button
                onClick={() => {
                  setForceReturnModal(v);
                  setEndMileage(v.activeUsage?.startMileage?.toString() || '');
                }}
                className="mt-4 w-full py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                บังคับคืนรถ (Admin)
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Modal บังคับคืนรถ */}
      {forceReturnModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4 text-red-600 flex items-center gap-2">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              บังคับคืนรถ
            </h2>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-sm text-amber-800">
              <strong>คำเตือน:</strong> การบังคับคืนรถจะทำให้สถานะรถเปลี่ยนเป็น "พร้อมใช้งาน" ทันที โดยไม่รอให้ผู้ใช้คืนเอง
            </div>

            <div className="space-y-3 mb-4">
              <div>
                <span className="text-sm text-gray-600">ทะเบียน:</span>
                <span className="font-semibold ml-2">{forceReturnModal.licensePlate}</span>
              </div>
              <div>
                <span className="text-sm text-gray-600">ผู้ใช้งาน:</span>
                <span className="font-semibold ml-2">{forceReturnModal.driver?.name || 'ไม่พบข้อมูล'}</span>
              </div>
              <div>
                <span className="text-sm text-gray-600">เริ่มใช้งานเมื่อ:</span>
                <span className="font-semibold ml-2">
                  {forceReturnModal.activeUsage?.startTime?.toLocaleString('th-TH') || '-'}
                </span>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                เลขไมล์สิ้นสุด (ไม่บังคับ)
              </label>
              <input
                type="number"
                value={endMileage}
                onChange={(e) => setEndMileage(e.target.value)}
                placeholder="ระบุเลขไมล์สิ้นสุด"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setForceReturnModal(null);
                  setEndMileage('');
                }}
                className="flex-1 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleForceReturn}
                disabled={forceReturnLoading}
                className="flex-1 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {forceReturnLoading ? 'กำลังดำเนินการ...' : 'ยืนยันบังคับคืน'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
