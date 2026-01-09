"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { getImageUrl } from '@/lib/imageHelpers';
import { useUser } from "@/context/UserContext";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

export default function VehicleSelectionPage() {
  const { user } = useUser();
  const router = useRouter();
  const [vehicles, setVehicles] = useState([]);
  const [loadingVehicles, setLoadingVehicles] = useState(true);
  const [selectedVehicle, setSelectedVehicle] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const [destination, setDestination] = useState("");
  const [purpose, setPurpose] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // ดึงรายการรถที่พร้อมใช้งาน (status === 'available')
  useEffect(() => {
    let ignore = false;
    async function fetchVehicles() {
      const q = query(collection(db, "vehicles"), where("status", "==", "available"));
      const snapshot = await getDocs(q);
      if (!ignore) {
        const availableVehicles = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(v => v.status === 'available');
        setVehicles(availableVehicles);
        setLoadingVehicles(false);
      }
    }
    fetchVehicles();
    return () => { ignore = true; };
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function onDocClick(e) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target)) setIsOpen(false);
    }
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);


  const handleStartUsing = async (e) => {
    e.preventDefault();

    if (!user || !user.lineId) {
      setMessage("กรุณาเข้าสู่ระบบให้เรียบร้อย (userId)");
      return;
    }
    if (!selectedVehicle) {
      setMessage("กรุณาเลือกรถ (vehicleId)");
      return;
    }

    setIsLoading(true);
    try {
      const selectedVehicleData = vehicles.find(v => v.id === selectedVehicle);

      // Call API to start vehicle usage
      const response = await fetch('/api/vehicle-usage/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.lineId,
          userName: user?.name || user?.displayName || 'ไม่ระบุชื่อ',
          vehicleId: selectedVehicle,
          vehicleLicensePlate: selectedVehicleData?.licensePlate,
          // ไม่ต้องส่ง startMileage
          destination: destination || '',
          purpose: purpose || '',
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error || 'เกิดข้อผิดพลาดในการเริ่มใช้งานรถ');
        setIsLoading(false);
        return;
      }

      setMessage("เริ่มใช้งานรถสำเร็จ!");

      // ส่งข้อความ LINE Flex Message จาก user (ตรวจสอบ settings ก่อน)
      try {
        // ดึง settings ก่อน
        const settingsRes = await fetch('/api/notifications/settings');
        const settingsData = await settingsRes.json();
        const userChatEnabled = settingsData?.userChatMessage?.vehicle_borrowed !== false; // default true

        if (userChatEnabled && typeof window !== 'undefined' && window.liff && window.liff.isInClient()) {
          const now = new Date().toLocaleDateString('th-TH', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
          });
          const vehicleData = vehicles.find(v => v.id === selectedVehicle);

          await window.liff.sendMessages([{
            type: 'flex',
            altText: `เริ่มใช้รถ ${vehicleData?.licensePlate || ''}`,
            contents: {
              type: 'bubble',
              size: 'kilo',
              body: {
                type: 'box',
                layout: 'vertical',
                contents: [
                  { type: 'text', text: '🚗 เริ่มใช้รถสำเร็จ', weight: 'bold', size: 'md', color: '#0d9488' },
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
                          { type: 'text', text: vehicleData?.licensePlate || '-', size: 'sm', color: '#333333', flex: 3, align: 'end' }
                        ]
                      },
                      {
                        type: 'box',
                        layout: 'horizontal',
                        contents: [
                          { type: 'text', text: 'รถ', size: 'sm', color: '#888888', flex: 2 },
                          { type: 'text', text: `${vehicleData?.brand || ''} ${vehicleData?.model || ''}`.trim() || '-', size: 'sm', color: '#333333', flex: 3, align: 'end', wrap: true }
                        ]
                      },
                      ...(destination ? [{
                        type: 'box',
                        layout: 'horizontal',
                        contents: [
                          { type: 'text', text: 'จุดหมาย', size: 'sm', color: '#888888', flex: 2 },
                          { type: 'text', text: destination, size: 'sm', color: '#333333', flex: 3, align: 'end', wrap: true }
                        ]
                      }] : []),
                      ...(purpose ? [{
                        type: 'box',
                        layout: 'horizontal',
                        contents: [
                          { type: 'text', text: 'วัตถุประสงค์', size: 'sm', color: '#888888', flex: 2 },
                          { type: 'text', text: purpose, size: 'sm', color: '#333333', flex: 3, align: 'end', wrap: true }
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
          console.log('✅ LINE message sent successfully');
        }
      } catch (lineError) {
        console.error('Failed to send LINE message:', lineError);
        // ไม่ block flow ถ้าส่ง LINE ไม่สำเร็จ
      }

      // Reset form
      setSelectedVehicle("");
      setDestination("");
      setPurpose("");
      setIsLoading(false);

      // Navigate to my active vehicle page
      setTimeout(() => {
        router.push('/my-vehicle');
      }, 1000);

    } catch (error) {
      console.error("Error starting vehicle usage:", error);
      setMessage("เกิดข้อผิดพลาดในการเริ่มใช้งานรถ");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="gradient-bg px-6 pt-8 pb-24">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-xl font-bold text-white">เลือกรถที่ต้องการใช้งาน</h1>
        </div>
        <p className="text-teal-100 text-sm">เลือกรถที่พร้อมใช้งานและเริ่มเดินทางได้ทันที</p>
      </div>

      {/* Content */}
      <div className="px-6 -mt-16">
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <form onSubmit={handleStartUsing} className="p-6 space-y-4">

            {/* เลือกรถ */}
            <div>
              <label className="block text-sm font-medium text-teal-700 mb-1">
                เลือกรถ <span className="text-red-500">*</span>
              </label>
              <div className="relative" ref={containerRef}>
                <button
                  type="button"
                  aria-haspopup="listbox"
                  aria-expanded={isOpen}
                  onClick={() => setIsOpen(o => !o)}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3 border border-gray-300 rounded-lg bg-white text-left hover:border-teal-500 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {selectedVehicle ? (
                      (() => {
                        const sel = vehicles.find(v => v.id === selectedVehicle);
                        if (!sel) return <span className="text-gray-500">-- เลือกรถ --</span>;
                        return (
                          <>
                            {getImageUrl(sel) ? (
                              <Image src={getImageUrl(sel)} alt={`${sel.brand} ${sel.model}`} width={40} height={32} className="object-cover rounded-md border" unoptimized />
                            ) : (
                              <div className="w-10 h-8 bg-gray-200 rounded-md flex items-center justify-center text-xs text-gray-500 border">ไม่มีรูป</div>
                            )}
                            <div className="text-sm">
                              <div className="font-medium">{sel.brand} {sel.model}</div>
                              <div className="text-xs text-gray-600">{sel.licensePlate}</div>
                            </div>
                          </>
                        );
                      })()
                    ) : (
                      <span className="text-gray-500">-- เลือกรถที่ต้องการใช้งาน --</span>
                    )}
                  </div>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 011.08 1.04l-4.25 4.25a.75.75 0 01-1.06 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                  </svg>
                </button>

                {/* Dropdown list */}
                <div className={`absolute z-50 mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-auto ${isOpen ? '' : 'hidden'}`} role="listbox">
                  {loadingVehicles ? (
                    <div className="p-3 text-sm text-gray-500">กำลังโหลด...</div>
                  ) : vehicles.length === 0 ? (
                    <div className="p-3 text-sm text-gray-500">ไม่มีรถว่างในขณะนี้</div>
                  ) : (
                    vehicles.map(v => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => {
                          setSelectedVehicle(v.id);
                          setIsOpen(false);
                        }}
                        className="w-full flex items-center gap-3 p-3 text-left hover:bg-teal-50 transition-colors"
                      >
                        {getImageUrl(v) ? (
                          <Image src={getImageUrl(v)} alt={`${v.brand} ${v.model}`} width={48} height={32} className="object-cover rounded-md border" unoptimized />
                        ) : (
                          <div className="w-12 h-8 bg-gray-100 rounded-md flex items-center justify-center text-xs text-gray-500 border">ไม่มีรูป</div>
                        )}
                        <div className="flex-1 text-sm">
                          <div className="font-medium">{v.brand} {v.model}</div>
                          <div className="text-xs text-gray-600">{v.licensePlate}</div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* ไม่ต้องแสดงเลขไมล์เริ่มต้น */}

            {/* จุดหมาย */}
            <div>
              <label className="block text-sm font-medium text-teal-700 mb-1">จุดหมาย (ถ้ามี)</label>
              <input
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="ระบุจุดหมายปลายทาง"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            {/* วัตถุประสงค์ */}
            <div>
              <label className="block text-sm font-medium text-teal-700 mb-1">วัตถุประสงค์ (ถ้ามี)</label>
              <textarea
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="ระบุวัตถุประสงค์การใช้รถ..."
                rows="3"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
              />
            </div>

            {message && (
              <div className={`p-3 rounded-lg text-sm text-center ${message.includes('สำเร็จ') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !selectedVehicle}
              className="w-full py-3 bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700 transition-all disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isLoading ? 'กำลังดำเนินการ...' : 'เริ่มใช้งานรถ'}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
