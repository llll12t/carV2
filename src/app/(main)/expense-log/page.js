"use client";
import React from "react";

import { useState, useEffect } from "react";
import { useUser } from "@/context/UserContext";
import { useRouter } from "next/navigation";

export default function ExpenseLogPage() {
  // State สำหรับการแสกน
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState('');
  const scanIntervalRef = React.useRef(null);
  const videoRef = React.useRef(null);
  const canvasRef = React.useRef(null);

  // State สำหรับ custom modal
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmData, setConfirmData] = useState({ message: '', value: null, onConfirm: null });
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertData, setAlertData] = useState({ title: '', message: '', type: 'info' });

  // ฟังก์ชัน custom alert
  const customAlert = (title, message, type = 'info') => {
    setAlertData({ title, message, type });
    setShowAlertModal(true);
  };

  // ฟังก์ชัน custom confirm
  const customConfirm = (message, value, onConfirm) => {
    setConfirmData({ message, value, onConfirm });
    setShowConfirmModal(true);
  };

  // ฟังก์ชันเปิดกล้องและเริ่มแสกนอัตโนมัติ
  const startAutoScan = async () => {
    setIsScanning(true);
    setScanStatus('กำลังเปิดกล้อง...');

    try {
      // เปิดกล้อง
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });

      // สร้าง video element
      const video = document.createElement('video');
      video.srcObject = stream;
      video.setAttribute('autoplay', '');
      video.setAttribute('playsinline', '');
      video.play();

      // รอให้ video พร้อม
      await new Promise(resolve => {
        video.onloadedmetadata = resolve;
      });

      setScanStatus('📸 กำลังมองหาเลขไมล์...');

      // สร้าง canvas สำหรับจับภาพ
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');

      // สร้าง modal แสดงกล้อง
      const modal = document.createElement('div');
      modal.id = 'scanModal';
      modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.95);z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px;';
      modal.innerHTML = `
        <div style="color:white;margin-bottom:20px;text-align:center;">
          <p style="font-size:20px;font-weight:bold;margin-bottom:8px;">📸 แสกนเลขไมล์อัตโนมัติ</p>
          <p id="scanStatusText" style="font-size:14px;color:#93c5fd;">กำลังมองหาเลขไมล์...</p>
        </div>
        <div style="position:relative;width:100%;max-width:500px;">
          <video id="scanVideo" autoplay playsinline style="width:100%;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,0.3);"></video>
          <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);border:2px dashed #0d9488;width:80%;height:40%;border-radius:8px;pointer-events:none;"></div>
        </div>
        <div style="margin-top:24px;display:flex;gap:12px;">
          <button id="cancelScanBtn" style="padding:14px 28px;background:#6b7280;color:white;border:none;border-radius:10px;font-weight:600;font-size:16px;cursor:pointer;">✕ ยกเลิก</button>
        </div>
        <div style="color:#93c5fd;margin-top:16px;font-size:12px;text-align:center;">
          <p>💡 วางกล้องให้เห็นเลขไมล์ชัดเจนในกรอบ</p>
        </div>
      `;
      document.body.appendChild(modal);

      const modalVideo = document.getElementById('scanVideo');
      const statusText = document.getElementById('scanStatusText');
      modalVideo.srcObject = stream;

      // โหลด Tesseract worker
      setScanStatus('⏳ กำลังเตรียมเครื่องมืออ่านข้อความ...');
      statusText.textContent = 'กำลังเตรียมเครื่องมืออ่านข้อความ...';

      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker('eng', 1, {
        logger: m => {
          if (m.status === 'recognizing text') {
            const progress = Math.round(m.progress * 100);
            statusText.textContent = `กำลังวิเคราะห์ภาพ... ${progress}%`;
          }
        }
      });

      let scanCount = 0;
      let isProcessing = false;

      // ฟังก์ชันแสกนทุก 2 วินาที
      const scanFrame = async () => {
        if (isProcessing) return;

        isProcessing = true;
        scanCount++;

        try {
          // จับภาพจาก video
          ctx.drawImage(modalVideo, 0, 0);
          const imageData = canvas.toDataURL('image/jpeg', 0.95);

          statusText.textContent = `🔍 กำลังอ่านเลขไมล์... (ครั้งที่ ${scanCount})`;

          // ทำ OCR
          const { data: { text } } = await worker.recognize(imageData);

          console.log(`Scan ${scanCount}:`, text);

          // หาตัวเลขในภาพ
          const numbers = text.match(/\d+/g);

          if (numbers && numbers.length > 0) {
            // กรองเฉพาะเลข 5 หลักขึ้นไป
            const validNumbers = numbers
              .map(n => parseInt(n))
              .filter(n => n >= 10000 && n <= 9999999);

            if (validNumbers.length > 0) {
              // หาเลขที่ใหญ่ที่สุด
              const mileageValue = Math.max(...validNumbers);
              const minValue = lastFuelMileage || activeUsage?.startMileage || 0;

              if (mileageValue >= minValue) {
                // เจอเลขไมล์แล้ว!
                console.log('✅ Found valid mileage:', mileageValue);

                // หยุดแสกน
                clearInterval(scanIntervalRef.current);
                await worker.terminate();

                // ปิดกล้อง
                stream.getTracks().forEach(track => track.stop());

                // แสดง confirmation
                statusText.textContent = '✅ เจอเลขไมล์แล้ว!';
                statusText.style.color = '#10b981';

                await new Promise(resolve => setTimeout(resolve, 500));

                document.body.removeChild(modal);
                setIsScanning(false);
                setScanStatus('');

                // ยืนยันกับผู้ใช้ด้วย custom modal
                customConfirm(
                  `อ่านเลขไมล์ได้: ${mileageValue.toLocaleString()} กม.`,
                  mileageValue,
                  (value) => {
                    setMileage(value.toString());
                  }
                );

                return;
              }
            }
          }

          statusText.textContent = `🔍 กำลังมองหาเลขไมล์... (ครั้งที่ ${scanCount})`;

        } catch (error) {
          console.error('Scan error:', error);
        }

        isProcessing = false;
      };

      // เริ่มแสกนทุก 2 วินาที
      scanIntervalRef.current = setInterval(scanFrame, 2000);

      // แสกนครั้งแรกทันที
      setTimeout(scanFrame, 500);

      // ปุ่มยกเลิก
      document.getElementById('cancelScanBtn').onclick = () => {
        clearInterval(scanIntervalRef.current);
        worker.terminate();
        stream.getTracks().forEach(track => track.stop());
        document.body.removeChild(modal);
        setIsScanning(false);
        setScanStatus('');
      };

    } catch (err) {
      console.error('Camera error:', err);
      customAlert('ไม่สามารถเข้าถึงกล้อง', 'กรุณาอนุญาตการใช้งานกล้องในเบราว์เซอร์', 'error');
      setIsScanning(false);
      setScanStatus('');
    }
  };
  // State สำหรับรายการเติมน้ำมันล่าสุด
  const [latestFuelExpense, setLatestFuelExpense] = useState(null);
  const { user } = useUser();
  const router = useRouter();
  const [activeUsage, setActiveUsage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState("fuel");
  const [amount, setAmount] = useState("");
  const [mileage, setMileage] = useState("");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastFuelMileage, setLastFuelMileage] = useState(null);
  const [otherTitle, setOtherTitle] = useState(""); // State สำหรับชื่อรายการค่าใช้จ่ายอื่นๆ
  const [fluidLatest, setFluidLatest] = useState(null); // State สำหรับรายการเปลี่ยนของเหลวล่าสุด

  // Fetch active vehicle usage
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    let hasFetched = false;

    const fetchActiveUsage = async () => {
      if (hasFetched) return;
      hasFetched = true;
      try {
        const userId = user?.lineId;
        const response = await fetch(`/api/vehicle-usage/active?userId=${userId}`);
        const result = await response.json();

        if (!isMounted) return;

        if (result.success && result.usage) {
          setActiveUsage(result.usage);

          // ดึงข้อมูล vehicle และ expenses พร้อมกัน (parallel)
          const [vehicleResponse, expensesResponse] = await Promise.all([
            fetch(`/api/vehicles/${result.usage.vehicleId}`),
            fetch(`/api/expenses?vehicleId=${result.usage.vehicleId}`)
          ]);

          let vehicleCurrentMileage = null;
          if (vehicleResponse.ok) {
            const vehicleData = await vehicleResponse.json();
            if (vehicleData.currentMileage) {
              vehicleCurrentMileage = vehicleData.currentMileage;
            }
          }

          const expensesResult = await expensesResponse.json();

          if (!isMounted) return;

          if (expensesResult.success && expensesResult.expenses) {
            // ประมวลผล expenses ครั้งเดียว (optimize)
            const expensesByType = {
              all: [],
              fuel: [],
              fluid: []
            };

            // แยก expenses ตามประเภทในรอบเดียว
            expensesResult.expenses.forEach(exp => {
              if (exp.mileage) {
                expensesByType.all.push(exp);
                if (exp.type === 'fuel') expensesByType.fuel.push(exp);
                if (exp.type === 'fluid') expensesByType.fluid.push(exp);
              }
            });

            // เรียง all expenses ตามเวลา
            expensesByType.all.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

            // ตั้งค่า state ตามลำดับความสำคัญ: expenses > vehicle.currentMileage > usage.startMileage
            if (expensesByType.all.length > 0) {
              const latestMileage = expensesByType.all[0].mileage;
              setLastFuelMileage(latestMileage);
            } else if (vehicleCurrentMileage) {
              setLastFuelMileage(vehicleCurrentMileage);
            } else if (result.usage.startMileage) {
              setLastFuelMileage(result.usage.startMileage);
            }

            // ตั้งค่า fuel และ fluid expenses
            if (expensesByType.fuel.length > 0) {
              expensesByType.fuel.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
              setLatestFuelExpense(expensesByType.fuel[0]);
            } else {
              setLatestFuelExpense(null);
            }

            if (expensesByType.fluid.length > 0) {
              expensesByType.fluid.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
              setFluidLatest(expensesByType.fluid[0]);
            } else {
              setFluidLatest(null);
            }
          } else if (vehicleCurrentMileage) {
            // ถ้าไม่มี expenses เลย หรือ fetch ไม่สำเร็จ ใช้ currentMileage จาก vehicle
            setLastFuelMileage(vehicleCurrentMileage);
            setLatestFuelExpense(null);
            setFluidLatest(null);
          } else if (result.usage.startMileage) {
            // ถ้าไม่มี currentMileage ใช้ startMileage
            setLastFuelMileage(result.usage.startMileage);
            setLatestFuelExpense(null);
            setFluidLatest(null);
          }
        } else {
          // No active usage - redirect back
          setMessage("ไม่พบรถที่กำลังใช้งาน");
          setTimeout(() => router.push('/my-vehicle'), 2000);
        }
        setLoading(false);
      } catch (error) {
        console.error("Error fetching active usage:", error);
        setLoading(false);
      }
    };

    fetchActiveUsage();

    return () => {
      isMounted = false;
    };
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!amount || Number(amount) <= 0) {
      setMessage("กรุณาระบุจำนวนเงินที่ถูกต้อง");
      return;
    }

    if (type === "other" && !otherTitle.trim()) {
      setMessage("กรุณาระบุชื่อรายการค่าใช้จ่าย");
      return;
    }

    // ถ้าเป็นน้ำมันหรือเปลี่ยนถ่ายของเหลว บังคับให้กรอกเลขไมล์

    if ((type === "fuel" || type === "fluid")) {
      if (!mileage || Number(mileage) <= 0) {
        setMessage("กรุณาระบุเลขไมล์ปัจจุบัน");
        return;
      }
      // ตรวจสอบว่าเลขไมล์ใหม่ต้องไม่ต่ำกว่าเลขไมล์ล่าสุด
      const minMileage = lastFuelMileage || activeUsage?.startMileage || 0;
      if (Number(mileage) < minMileage) {
        setMessage(`เลขไมล์ต้องไม่ต่ำกว่า ${minMileage.toLocaleString()} กม.`);
        return;
      }
    }

    if (!activeUsage) {
      setMessage("ไม่พบข้อมูลการใช้งานรถ");
      return;
    }

    setIsSubmitting(true);
    setMessage("");

    try {
      const userId = user?.lineId;
      const userName = user?.displayName || user?.name || "-";
      // กำหนด type ที่จะส่งไป backend
      let submitType = type;
      if (type === "fluid") submitType = "fluid";
      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usageId: activeUsage.id,
          vehicleId: activeUsage.vehicleId,
          userId: userId,
          userName: userName,
          type: submitType,
          amount: Number(amount),
          mileage: mileage ? Number(mileage) : null,
          note: note || '',
          title: type === "other" ? otherTitle : undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error || 'เกิดข้อผิดพลาดในการบันทึกค่าใช้จ่าย');
        setIsSubmitting(false);
        return;
      }

      setMessage("บันทึกค่าใช้จ่ายสำเร็จ!");
      // Reset form
      setAmount("");
      setNote("");
      setIsSubmitting(false);

      // Navigate back to my-vehicle page
      setTimeout(() => {
        router.push('/my-vehicle');
      }, 1500);

    } catch (error) {
      console.error("Error submitting expense:", error);
      setMessage("เกิดข้อผิดพลาดในการบันทึกค่าใช้จ่าย");
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-full max-w-xs px-6 text-center">
          {/* Money Icon */}
          <div className="w-16 h-16 bg-teal-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
            </svg>
          </div>

          {/* Title */}
          <h2 className="text-lg font-semibold text-gray-800 mb-2">บันทึกค่าใช้จ่าย</h2>
          <p className="text-sm text-gray-500 mb-6">กำลังโหลดข้อมูลรถ...</p>

          {/* Progress Bar */}
          <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-teal-500 to-teal-400 rounded-full"
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Minimal Header */}
      <div className="gradient-bg">
        <div className="flex items-center gap-2">
          <button onClick={() => router.back()} className="p-1 hover:bg-white/20 rounded-lg -ml-1">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-sm font-medium text-white">บันทึกค่าใช้จ่าย</h1>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 -mt-8">
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <form onSubmit={handleSubmit} className="p-4 space-y-3">
            {/* Vehicle Info - ทะเบียน */}
            {activeUsage && (
              <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                <span className="font-semibold text-gray-800 text-sm">{activeUsage.vehicleLicensePlate}</span>
                <span className="text-xs text-gray-400">กำลังใช้งาน</span>
              </div>
            )}

            {/* ข้อมูลไมล์ - น้ำมัน & ของเหลว */}
            {(lastFuelMileage || fluidLatest) && (
              <div className="grid grid-cols-2 gap-2">
                {/* เลขไมล์ล่าสุด (น้ำมัน) */}
                {lastFuelMileage && (
                  <div className="bg-teal-50 border border-teal-100 rounded-lg p-2.5">
                    <div className="flex items-center gap-1.5 text-teal-600 mb-1">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
                      </svg>
                      <span className="text-xs font-medium">ไมล์ล่าสุด</span>
                    </div>
                    <div className="text-sm font-bold text-teal-700">{lastFuelMileage.toLocaleString()} กม.</div>
                  </div>
                )}

                {/* ของเหลวล่าสุด */}
                {fluidLatest && (
                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-2.5">
                    <div className="flex items-center gap-1.5 text-blue-600 mb-1">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
                      </svg>
                      <span className="text-xs font-medium">ของเหลว</span>
                    </div>
                    <div className="text-sm font-bold text-blue-700">
                      {fluidLatest.mileage ? fluidLatest.mileage.toLocaleString() + ' กม.' : '-'}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ประเภทค่าใช้จ่าย */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">
                ประเภท <span className="text-red-400">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setType("fuel")}
                  className={`py-2.5 px-2 border rounded-lg text-center transition-all flex flex-col items-center gap-1 ${type === "fuel"
                    ? "border-teal-500 bg-teal-50 text-teal-700"
                    : "border-gray-200 text-gray-600 hover:border-teal-300"
                    }`}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
                  </svg>
                  <span className="text-xs font-medium">น้ำมัน</span>
                </button>
                <button
                  type="button"
                  onClick={() => setType("fluid")}
                  className={`py-2.5 px-2 border rounded-lg text-center transition-all flex flex-col items-center gap-1 ${type === "fluid"
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-gray-200 text-gray-600 hover:border-blue-300"
                    }`}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
                  </svg>
                  <span className="text-xs font-medium">ของเหลว</span>
                </button>
                <button
                  type="button"
                  onClick={() => setType("other")}
                  className={`py-2.5 px-2 border rounded-lg text-center transition-all flex flex-col items-center gap-1 ${type === "other"
                    ? "border-orange-500 bg-orange-50 text-orange-700"
                    : "border-gray-200 text-gray-600 hover:border-orange-300"
                    }`}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
                  </svg>
                  <span className="text-xs font-medium">อื่นๆ</span>
                </button>
              </div>
            </div>

            {/* จำนวนเงิน */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                จำนวนเงิน (บาท) <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                step="0.01"
                min="0"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-lg font-semibold"
                required
              />
            </div>

            {/* ชื่อรายการ (เฉพาะค่าใช้จ่ายอื่นๆ) */}
            {type === "other" && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  ชื่อรายการ <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={otherTitle}
                  onChange={e => setOtherTitle(e.target.value)}
                  placeholder="เช่น ค่าทางด่วน, ค่าซ่อมแซม"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  required
                />
              </div>
            )}

            {/* เลขไมล์ (บังคับถ้าเลือกน้ำมัน) */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                เลขไมล์ {(type === "fuel" || type === "fluid") && <span className="text-red-400">*</span>}
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={mileage}
                  onChange={(e) => setMileage(e.target.value)}
                  placeholder="เลขไมล์ปัจจุบัน"
                  className="flex-1 px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  required={type === "fuel" || type === "fluid"}
                />
                <button
                  type="button"
                  onClick={startAutoScan}
                  disabled={isScanning}
                  className="px-3 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                  title="แสกนเลขไมล์"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                  </svg>
                  <span className="text-sm">{isScanning ? 'กำลังแสกน' : 'แสกน'}</span>
                </button>
              </div>
            </div>

            {/* หมายเหตุ */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                หมายเหตุ
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="รายละเอียดเพิ่มเติม (ไม่บังคับ)"
                rows="2"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none text-sm"
              />
            </div>

            {message && (
              <div className={`p-3 rounded-lg text-sm text-center ${message.includes('สำเร็จ')
                ? 'bg-green-100 text-green-700'
                : 'bg-red-100 text-red-700'
                }`}>
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || !amount || ((type === "fuel" || type === "fluid") && !mileage)}
              className="w-full py-2.5 bg-teal-600 text-white rounded-lg font-medium text-sm hover:bg-teal-700 transition-all disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>กำลังบันทึก...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>บันทึก</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Custom Alert Modal */}
      {showAlertModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000] p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full animate-scale-in">
            <div className={`p-6 rounded-t-2xl ${alertData.type === 'error' ? 'bg-red-50' :
              alertData.type === 'success' ? 'bg-green-50' :
                'bg-blue-50'
              }`}>
              <div className="flex items-center justify-center mb-3">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center ${alertData.type === 'error' ? 'bg-red-100' :
                  alertData.type === 'success' ? 'bg-green-100' :
                    'bg-blue-100'
                  }`}>
                  <span className="text-4xl">
                    {alertData.type === 'error' ? '❌' :
                      alertData.type === 'success' ? '✅' :
                        'ℹ️'}
                  </span>
                </div>
              </div>
              <h3 className={`text-xl font-bold text-center mb-2 ${alertData.type === 'error' ? 'text-red-700' :
                alertData.type === 'success' ? 'text-green-700' :
                  'text-blue-700'
                }`}>
                {alertData.title}
              </h3>
              <p className="text-center text-gray-600">{alertData.message}</p>
            </div>
            <div className="p-4">
              <button
                onClick={() => setShowAlertModal(false)}
                className={`w-full py-3 rounded-xl font-semibold text-white transition-all ${alertData.type === 'error' ? 'bg-red-600 hover:bg-red-700' :
                  alertData.type === 'success' ? 'bg-green-600 hover:bg-green-700' :
                    'bg-blue-600 hover:bg-blue-700'
                  }`}
              >
                ตกลง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Confirm Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000] p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full animate-scale-in">
            <div className="p-6 bg-teal-50 rounded-t-2xl">
              <div className="flex items-center justify-center mb-3">
                <div className="w-16 h-16 rounded-full bg-teal-100 flex items-center justify-center">
                  <span className="text-4xl">✅</span>
                </div>
              </div>
              <h3 className="text-xl font-bold text-center mb-2 text-teal-700">
                เจอเลขไมล์แล้ว!
              </h3>
              <p className="text-center text-gray-700 text-lg font-semibold">
                {confirmData.message}
              </p>
              <p className="text-center text-gray-500 text-sm mt-2">
                ต้องการใช้ค่านี้หรือไม่?
              </p>
            </div>
            <div className="p-4 flex gap-3">
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                }}
                className="flex-1 py-3 rounded-xl font-semibold text-gray-700 bg-gray-200 hover:bg-gray-300 transition-all"
              >
                ยกเลิก
              </button>
              <button
                onClick={() => {
                  if (confirmData.onConfirm) {
                    confirmData.onConfirm(confirmData.value);
                  }
                  setShowConfirmModal(false);
                }}
                className="flex-1 py-3 rounded-xl font-semibold text-white bg-teal-600 hover:bg-teal-700 transition-all"
              >
                ใช้ค่านี้
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
