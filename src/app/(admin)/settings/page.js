"use client";

import { useState, useEffect } from 'react';
import { checkAllIndexes } from '@/lib/indexChecker';

// --- Icons ---
const Icons = {
  Bell: ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
    </svg>
  ),
  Truck: ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
    </svg>
  ),
  ChartBar: ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  ),
  ShieldCheck: ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
    </svg>
  ),
  User: ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  ),
  Users: ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  ),
  Plus: ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  ),
  XMark: ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  PaperAirplane: ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
    </svg>
  )
};

export default function SettingsPage() {
  const [notifSettings, setNotifSettings] = useState(null);
  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [newType, setNewType] = useState('');
  const [savingTypes, setSavingTypes] = useState(false);
  const [usageLimits, setUsageLimits] = useState({ storageMB: 512, firestoreDocs: 10000 });

  // State for testing report
  const [testingReport, setTestingReport] = useState(false);

  // Index Checker State
  const [checkingIndexes, setCheckingIndexes] = useState(false);
  const [indexResults, setIndexResults] = useState([]);
  const [showIndexModal, setShowIndexModal] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/notifications/settings');
        const data = await res.json();
        setNotifSettings(data.roles || {});

        if (data.dailyReport) {
          setNotifSettings(prev => ({ ...prev, dailyReport: data.dailyReport }));
        }

        setVehicleTypes(data.vehicleTypes || ['รถ SUV', 'รถเก๋ง', 'รถกระบะ', 'รถตู้', 'รถบรรทุก', 'มอเตอร์ไซค์', 'อื่นๆ']);
        setUsageLimits(data.usageLimits || { storageMB: 512, firestoreDocs: 10000 });
      } catch (err) {
        console.error('load notif settings', err);
      }
    }
    load();
  }, []);

  const handleTestReport = async () => {
    if (!notifSettings?.dailyReport?.groupId) {
      alert('กรุณากรอก Group ID และบันทึกการตั้งค่าก่อนทำการทดสอบ');
      return;
    }

    if (!confirm('ระบบจะส่งรายงานสรุปไปยังกลุ่ม LINE ทันที คุณต้องการดำเนินการต่อหรือไม่?')) {
      return;
    }

    setTestingReport(true);
    try {
      const res = await fetch('/api/cron/daily-report');
      const data = await res.json();

      if (res.ok) {
        alert('ส่งรายงานทดสอบสำเร็จ! กรุณาตรวจสอบในกลุ่ม LINE');
      } else {
        alert(`การส่งล้มเหลว: ${data.error || 'ไม่ทราบสาเหตุ'}`);
      }
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์');
    } finally {
      setTestingReport(false);
    }
  };

  const saveSettings = async () => {
    setSavingTypes(true);
    try {
      const payload = {
        roles: {
          admin: notifSettings.admin,
          driver: notifSettings.driver,
          employee: notifSettings.employee
        },
        dailyReport: notifSettings.dailyReport,
        vehicleTypes,
        usageLimits
      };

      await fetch('/api/notifications/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      alert('บันทึกการตั้งค่าเรียบร้อย');
    } catch (err) {
      console.error(err);
      alert('ไม่สามารถบันทึกได้');
    } finally {
      setSavingTypes(false);
    }
  };

  if (!notifSettings) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ตั้งค่าระบบ</h1>
          <p className="text-gray-500 text-sm mt-1">จัดการการแจ้งเตือนและข้อมูลพื้นฐาน</p>
        </div>
        <button
          onClick={saveSettings}
          disabled={savingTypes}
          className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium shadow-sm transition-all disabled:opacity-70 flex items-center gap-2"
        >
          {savingTypes ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              กำลังบันทึก...
            </>
          ) : (
            'บันทึกการเปลี่ยนแปลง'
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Notifications */}
        <div className="lg:col-span-2 space-y-6">

          {/* LINE Notifications */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
              <Icons.Bell className="w-5 h-5 text-indigo-600" />
              <h2 className="font-semibold text-gray-800">การแจ้งเตือน (LINE)</h2>
            </div>

            <div className="p-6 space-y-6">
              {/* Admin */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Icons.ShieldCheck className="w-4 h-4 text-indigo-500" />
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">ผู้ดูแลระบบ</h3>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <ToggleRow
                    label="เมื่อมีการจองใหม่"
                    checked={!!notifSettings.admin?.booking_created}
                    onChange={e => setNotifSettings(s => ({ ...s, admin: { ...s.admin, booking_created: e.target.checked } }))}
                  />
                  <ToggleRow
                    label="เมื่อมีการยืมรถ"
                    checked={!!notifSettings.admin?.vehicle_borrowed}
                    onChange={e => setNotifSettings(s => ({ ...s, admin: { ...s.admin, vehicle_borrowed: e.target.checked } }))}
                  />
                  <ToggleRow
                    label="เมื่อมีการคืนรถ"
                    checked={!!notifSettings.admin?.vehicle_returned}
                    onChange={e => setNotifSettings(s => ({ ...s, admin: { ...s.admin, vehicle_returned: e.target.checked } }))}
                  />
                </div>
              </div>

              {/* Driver */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Icons.User className="w-4 h-4 text-green-500" />
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">คนขับ</h3>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <ToggleRow
                    label="เมื่อมีการจอง"
                    checked={!!notifSettings.driver?.booking_created}
                    onChange={e => setNotifSettings(s => ({ ...s, driver: { ...s.driver, booking_created: e.target.checked } }))}
                  />
                  <ToggleRow
                    label="เมื่อยืมรถ"
                    checked={!!notifSettings.driver?.vehicle_borrowed}
                    onChange={e => setNotifSettings(s => ({ ...s, driver: { ...s.driver, vehicle_borrowed: e.target.checked } }))}
                  />
                  <ToggleRow
                    label="เมื่อคืนรถ"
                    checked={!!notifSettings.driver?.vehicle_returned}
                    onChange={e => setNotifSettings(s => ({ ...s, driver: { ...s.driver, vehicle_returned: e.target.checked } }))}
                  />
                </div>
              </div>

              {/* Employee */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Icons.Users className="w-4 h-4 text-blue-500" />
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">พนักงาน</h3>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <ToggleRow
                    label="เมื่อมีการจอง"
                    checked={!!notifSettings.employee?.booking_created}
                    onChange={e => setNotifSettings(s => ({ ...s, employee: { ...s.employee, booking_created: e.target.checked } }))}
                  />
                  <ToggleRow
                    label="เมื่อยืมรถ"
                    checked={!!notifSettings.employee?.vehicle_borrowed}
                    onChange={e => setNotifSettings(s => ({ ...s, employee: { ...s.employee, vehicle_borrowed: e.target.checked } }))}
                  />
                  <ToggleRow
                    label="เมื่อคืนรถ"
                    checked={!!notifSettings.employee?.vehicle_returned}
                    onChange={e => setNotifSettings(s => ({ ...s, employee: { ...s.employee, vehicle_returned: e.target.checked } }))}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Daily Report */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
              <Icons.ChartBar className="w-5 h-5 text-purple-600" />
              <h2 className="font-semibold text-gray-800">รายงานประจำวัน (Daily Report)</h2>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg border border-purple-100">
                <div>
                  <div className="font-medium text-purple-900">เปิดใช้งานรายงานอัตโนมัติ</div>
                  <div className="text-xs text-purple-700 mt-1">ส่งสรุปเวลา 10:00 น. ทุกวัน</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={!!notifSettings.dailyReport?.enabled}
                    onChange={e => setNotifSettings(s => ({
                      ...s,
                      dailyReport: { ...s.dailyReport, enabled: e.target.checked }
                    }))}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">LINE Group ID สำหรับส่งรายงาน</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Cxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    className="flex-1 p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                    value={notifSettings.dailyReport?.groupId || ''}
                    onChange={e => setNotifSettings(s => ({
                      ...s,
                      dailyReport: { ...s.dailyReport, groupId: e.target.value }
                    }))}
                  />
                  <button
                    onClick={handleTestReport}
                    disabled={testingReport || !notifSettings.dailyReport?.groupId}
                    className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2 font-medium"
                  >
                    {testingReport ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <Icons.PaperAirplane className="w-4 h-4" />
                    )}
                    ทดสอบส่ง
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                  <Icons.ShieldCheck className="w-3 h-3" />
                  ต้องเพิ่ม LINE OA เข้ากลุ่มก่อน และบันทึกการตั้งค่าหลังจากแก้ไข ID
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Vehicle Types */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden sticky top-6">
            <div className="p-4 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
              <Icons.Truck className="w-5 h-5 text-teal-600" />
              <h2 className="font-semibold text-gray-800">ประเภทรถ</h2>
            </div>

            <div className="p-6">
              <div className="flex flex-wrap gap-2 mb-6">
                {vehicleTypes.map((type, idx) => (
                  <div key={idx} className="inline-flex items-center gap-2 px-3 py-1.5 bg-teal-50 border border-teal-100 rounded-full group hover:bg-teal-100 transition-colors">
                    <span className="text-sm text-teal-800 font-medium">{type}</span>
                    {vehicleTypes.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setVehicleTypes(vehicleTypes.filter((_, i) => i !== idx))}
                        className="text-teal-400 hover:text-red-500 transition-colors p-0.5 rounded-full hover:bg-white"
                        title="ลบประเภทรถนี้"
                      >
                        <Icons.XMark className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newType.trim()) {
                      e.preventDefault();
                      if (!vehicleTypes.includes(newType.trim())) {
                        setVehicleTypes([...vehicleTypes, newType.trim()]);
                        setNewType('');
                      }
                    }
                  }}
                  placeholder="เพิ่มประเภทรถใหม่..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (newType.trim() && !vehicleTypes.includes(newType.trim())) {
                      setVehicleTypes([...vehicleTypes, newType.trim()]);
                      setNewType('');
                    }
                  }}
                  className="px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg shadow-sm transition-colors"
                >
                  <Icons.Plus className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Firestore Indexes */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mt-6">
            <div className="p-4 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
              <svg className="w-5 h-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
              </svg>
              <h2 className="font-semibold text-gray-800">Firestore Indexes</h2>
            </div>

            <div className="p-6">
              <p className="text-sm text-gray-600 mb-4">ตรวจสอบและสร้าง Composite Indexes ที่จำเป็นสำหรับระบบ (สะดวกเมื่อย้าย Firebase Project)</p>
              <button
                onClick={async () => {
                  setCheckingIndexes(true);
                  try {
                    const results = await checkAllIndexes();
                    setIndexResults(results);
                    setShowIndexModal(true);
                  } catch (error) {
                    console.error("Error checking indexes:", error);
                    alert("เกิดข้อผิดพลาดในการตรวจสอบ Indexes");
                  } finally {
                    setCheckingIndexes(false);
                  }
                }}
                disabled={checkingIndexes}
                className="w-full py-3 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {checkingIndexes ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    กำลังตรวจสอบ...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                    </svg>
                    ตรวจสอบ Firestore Indexes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Index Check Results Modal */}
      {showIndexModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-800">ผลการตรวจสอบ Firestore Indexes</h3>
                <button
                  onClick={() => setShowIndexModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Icons.XMark className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {indexResults.filter(r => r.status === "missing").length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h4 className="text-lg font-bold text-gray-800">Indexes พร้อมใช้งานแล้ว!</h4>
                  <p className="text-gray-500 mt-2">ไม่พบ Index ที่ต้องสร้างเพิ่ม</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                    <p className="text-sm text-yellow-800 font-medium">
                      ⚠️ พบ {indexResults.filter(r => r.status === "missing").length} Indexes ที่ต้องสร้าง
                    </p>
                    <p className="text-xs text-yellow-700 mt-1">
                      กดลิงก์แต่ละรายการเพื่อเปิด Firebase Console และสร้าง Index
                    </p>
                  </div>

                  {indexResults.filter(r => r.status === "missing").map((result, index) => (
                    <div key={index} className="p-4 bg-red-50 border border-red-200 rounded-xl">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-medium text-gray-800">{result.queryName}</p>
                          <p className="text-sm text-gray-500">Collection: {result.collection}</p>
                          <p className="text-xs text-gray-400 mt-1">{result.description}</p>
                        </div>
                        {result.indexUrl ? (
                          <a
                            href={result.indexUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm whitespace-nowrap"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                            สร้าง Index
                          </a>
                        ) : (
                          <span className="px-3 py-1 bg-gray-200 text-gray-600 rounded-lg text-sm">
                            ไม่พบ URL
                          </span>
                        )}
                      </div>
                    </div>
                  ))}

                  <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-xl">
                    <p className="text-sm text-gray-700 font-medium">📋 วิธีใช้งาน:</p>
                    <ol className="text-sm text-gray-600 mt-2 space-y-1 list-decimal list-inside">
                      <li>กดปุ่ม "สร้าง Index" ของแต่ละรายการ</li>
                      <li>จะเปิดหน้า Firebase Console</li>
                      <li>กดปุ่ม "Create Index" ใน Firebase Console</li>
                      <li>รอ 1-2 นาทีจนสร้างเสร็จ</li>
                      <li>ทำซ้ำจนครบทุกรายการ</li>
                    </ol>
                  </div>
                </div>
              )}

              {/* Show all results */}
              <div className="mt-6">
                <h4 className="font-medium text-gray-700 mb-3">รายการทั้งหมด:</h4>
                <div className="space-y-2">
                  {indexResults.map((result, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <span className="text-sm text-gray-700">{result.queryName}</span>
                        <span className="text-xs text-gray-400 ml-2">({result.collection})</span>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${result.status === "ok"
                          ? "bg-green-100 text-green-700"
                          : result.status === "missing"
                            ? "bg-red-100 text-red-700"
                            : "bg-gray-100 text-gray-700"
                        }`}>
                        {result.status === "ok" ? "✓ พร้อม" : result.status === "missing" ? "✕ ต้องสร้าง" : "? ไม่ทราบ"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 bg-gray-50">
              <button
                onClick={() => setShowIndexModal(false)}
                className="w-full py-2.5 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ToggleRow({ label, checked, onChange }) {
  return (
    <label className="flex items-center justify-between cursor-pointer group">
      <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">{label}</span>
      <div className="relative inline-flex items-center cursor-pointer">
        <input type="checkbox" className="sr-only peer" checked={checked} onChange={onChange} />
        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
      </div>
    </label>
  );
}
