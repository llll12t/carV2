"use client";

import { useEffect, useState, Fragment } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, onSnapshot, doc, getDoc, collectionGroup, limit } from 'firebase/firestore';
import Image from 'next/image';
import { getImageUrl } from '@/lib/imageHelpers';
import AlertToast from '@/components/ui/AlertToast';


export default function TripHistoryPage() {
  function formatDateTime(ts) {
    if (!ts) return '-';
    try {
      let d;
      // Firestore timestamp
      if (ts.seconds && typeof ts.seconds === 'number') d = new Date(ts.seconds * 1000);
      // calendar-only string YYYY-MM-DD -> local midnight
      else if (typeof ts === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(ts)) {
        const parts = ts.split('-');
        d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 0, 0, 0);
      } else d = new Date(ts);
      return d.toLocaleString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '-';
    }
  }

  // ...existing code...

  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterVehicle, setFilterVehicle] = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  // For delete
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingTrip, setDeletingTrip] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Alert State
  const [alertState, setAlertState] = useState({ show: false, message: '', type: 'success' });
  const showAlert = (message, type = 'success') => {
    setAlertState({ show: true, message, type });
  };

  // For bulk delete
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [bulkDeletePeriod, setBulkDeletePeriod] = useState('');
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [bulkDeleteCount, setBulkDeleteCount] = useState(0);
  // Delete trip logic
  const handleDeleteTrip = async () => {
    if (!deletingTrip) return;
    setIsDeleting(true);
    try {
      // Delete expenses related to this trip
      const { getDocs, query, collection, where, deleteDoc, doc: docRef } = await import('firebase/firestore');
      const expQ = query(collection(db, 'expenses'), where('usageId', '==', deletingTrip.id));
      const expSnap = await getDocs(expQ);
      for (const expDoc of expSnap.docs) {
        await deleteDoc(expDoc.ref);
      }
      // Delete the trip itself
      await deleteDoc(docRef(db, 'vehicle-usage', deletingTrip.id));
      setShowDeleteModal(false);
      setDeletingTrip(null);
    } catch (e) {
      showAlert('เกิดข้อผิดพลาดในการลบ', 'error');
    }
    setIsDeleting(false);
  };

  // คำนวณจำนวนที่จะลบตาม period
  const calculateTripsToDelete = (period) => {
    if (!period) return 0;

    const now = new Date();
    let cutoffDate;

    if (period === 'all') {
      return trips.length;
    } else if (period === '3months') {
      cutoffDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
    } else if (period === '6months') {
      cutoffDate = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
    } else if (period === '1year') {
      cutoffDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    }

    return trips.filter(t => {
      const tripDate = t.endTime?.seconds ? new Date(t.endTime.seconds * 1000) : new Date(t.endTime);
      return tripDate < cutoffDate;
    }).length;
  };

  // Bulk delete logic
  const handleBulkDelete = async () => {
    if (!bulkDeletePeriod) return;
    setIsBulkDeleting(true);

    const { getDocs, query: fbQuery, collection: fbCollection, where: fbWhere, deleteDoc, Timestamp } = await import('firebase/firestore');

    try {
      const now = new Date();
      let cutoffDate;

      if (bulkDeletePeriod === 'all') {
        cutoffDate = null; // ลบทั้งหมด
      } else if (bulkDeletePeriod === '3months') {
        cutoffDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
      } else if (bulkDeletePeriod === '6months') {
        cutoffDate = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
      } else if (bulkDeletePeriod === '1year') {
        cutoffDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      }

      // หา trips ที่ต้องลบ
      const tripsToDelete = cutoffDate === null
        ? trips
        : trips.filter(t => {
          const tripDate = t.endTime?.seconds ? new Date(t.endTime.seconds * 1000) : new Date(t.endTime);
          return tripDate < cutoffDate;
        });

      let deletedCount = 0;

      for (const trip of tripsToDelete) {
        // ลบ expenses ที่เกี่ยวข้อง
        const expQ = fbQuery(fbCollection(db, 'expenses'), fbWhere('usageId', '==', trip.id));
        const expSnap = await getDocs(expQ);
        for (const expDoc of expSnap.docs) {
          await deleteDoc(expDoc.ref);
        }

        // ลบ trip
        const { doc: docRef } = await import('firebase/firestore');
        await deleteDoc(docRef(db, 'vehicle-usage', trip.id));
        deletedCount++;
        setBulkDeleteCount(deletedCount);
      }

      showAlert(`ลบข้อมูลสำเร็จ ${deletedCount} รายการ`, 'success');
      setShowBulkDeleteModal(false);
      setBulkDeletePeriod('');
      setBulkDeleteCount(0);
    } catch (e) {
      console.error('Bulk delete error:', e);
      showAlert('เกิดข้อผิดพลาดในการลบข้อมูล', 'error');
    }

    setIsBulkDeleting(false);
  };

  const [limitCount, setLimitCount] = useState(50);
  const [vehiclesMap, setVehiclesMap] = useState({});

  // 1. Fetch all vehicles once for caching
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'vehicles'), (snap) => {
      const map = {};
      snap.forEach(d => {
        map[d.id] = { id: d.id, ...d.data() };
      });
      setVehiclesMap(map);
    });
    return () => unsub();
  }, []);

  // 2. Optimized Trip Fetching
  useEffect(() => {
    // Load completed vehicle-usage records
    const q = query(
      collection(db, 'vehicle-usage'),
      where('status', '==', 'completed'),
      orderBy('endTime', 'desc'),
      limit(limitCount)
    );

    const unsub = onSnapshot(q, async (snap) => {
      // Create initial list from snapshot
      const rawList = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Fetch expenses in parallel
      const enrichedList = await Promise.all(rawList.map(async (trip) => {
        // Enriched with vehicle data from map (if available immediately, otherwise it will update on re-render)
        // Note: We can't easily access the closures 'vehiclesMap' inside this async callback reliably if it changes,
        // but since we separate the logic, we can just attach the vehicle ID and let the render handle looking up the map.
        // HOWEVER, the existing code expects `trip.vehicle` object. 
        // We will fetch expenses here.

        let expenses = [];
        try {
          // Check if we can skip fetching if no cost (optimization? not reliable yet)
          const expQ = query(collection(db, 'expenses'), where('usageId', '==', trip.id));
          const expSnap = await (await import('firebase/firestore')).getDocs(expQ);
          expenses = expSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        } catch (e) {
          // ignore
        }

        return {
          ...trip,
          expenses
        };
      }));

      setTrips(enrichedList);
      setLoading(false);
    });

    return () => unsub();
  }, [limitCount]); // Re-run if limit changes

  const loadExpensesFor = async (usage) => {
    // Already fetched in list, but if we need to refresh specific item:
    try {
      const expQ = query(collection(db, 'expenses'), where('usageId', '==', usage.id));
      const snapshot = await (await import('firebase/firestore')).getDocs(expQ);
      const exps = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setTrips(prev => prev.map(t => t.id === usage.id ? { ...t, expenses: exps } : t));
    } catch (e) {
      console.warn('loadExpensesFor failed', e);
    }
  };

  // Helper to get vehicle data safely
  const getVehicleData = (vehicleId) => {
    return vehiclesMap[vehicleId] || null;
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">กำลังโหลดประวัติการเดินทาง...</div>;

  // Filter trips
  const filteredTrips = trips.filter(trip => {
    const tripVehicle = vehiclesMap[trip.vehicleId] || {};

    // Search term
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const matchesSearch =
        (trip.vehicleLicensePlate?.toLowerCase().includes(search)) ||
        (tripVehicle.licensePlate?.toLowerCase().includes(search)) ||
        (tripVehicle.brand?.toLowerCase().includes(search)) ||
        (tripVehicle.model?.toLowerCase().includes(search)) ||
        (trip.userName?.toLowerCase().includes(search)) ||
        (trip.userId?.toLowerCase().includes(search)) ||
        (trip.destination?.toLowerCase().includes(search)) ||
        (trip.purpose?.toLowerCase().includes(search));

      if (!matchesSearch) return false;
    }

    // Filter by vehicle
    if (filterVehicle && trip.vehicleLicensePlate !== filterVehicle) {
      return false;
    }

    // Filter by user
    if (filterUser && trip.userName !== filterUser) {
      return false;
    }

    // Filter by date range
    if (filterDateFrom || filterDateTo) {
      const tripDate = trip.startTime?.seconds ? new Date(trip.startTime.seconds * 1000) : new Date(trip.startTime);

      if (filterDateFrom) {
        const fromDate = new Date(filterDateFrom);
        if (tripDate < fromDate) return false;
      }

      if (filterDateTo) {
        const toDate = new Date(filterDateTo);
        toDate.setHours(23, 59, 59, 999);
        if (tripDate > toDate) return false;
      }
    }

    return true;
  });

  // Get unique vehicles and users for filter dropdowns
  const uniqueVehicles = [...new Set(trips.map(t => t.vehicleLicensePlate).filter(Boolean))];
  const uniqueUsers = [...new Set(trips.map(t => t.userName).filter(Boolean))];

  // Pagination logic
  const totalPages = Math.ceil(filteredTrips.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentTrips = filteredTrips.slice(startIndex, endIndex);

  // Function to go to next page
  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
    }
  };

  // Function to go to previous page
  const goToPrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  };

  return (
    <div className="relative pb-12">
      <AlertToast show={alertState.show} message={alertState.message} type={alertState.type} onClose={() => setAlertState(prev => ({ ...prev, show: false }))} />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">ประวัติการเดินทาง</h1>
        <button
          onClick={() => setShowBulkDeleteModal(true)}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          ล้างข้อมูลเก่า
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        {/* ... Search Filters structure remains same ... */}
        {/* We need to rewrite the inner content because the tool requires contiguous block replacement, 
            but since I am replacing almost the start of return, I will just paste the top part and let the user see the diff.
            ACTUALLY, to minimize replacement code size, I should target specific blocks. 
            The user wants pagination back. 
        */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ค้นหา
            </label>
            <input
              type="text"
              placeholder="ค้นหาทะเบียนรถ, ผู้ใช้, จุดหมาย..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Vehicle Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              รถ
            </label>
            <select
              value={filterVehicle}
              onChange={(e) => {
                setFilterVehicle(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">ทั้งหมด</option>
              {uniqueVehicles.map((vehicle) => (
                <option key={vehicle} value={vehicle}>{vehicle}</option>
              ))}
            </select>
          </div>

          {/* User Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ผู้ใช้งาน
            </label>
            <select
              value={filterUser}
              onChange={(e) => {
                setFilterUser(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">ทั้งหมด</option>
              {uniqueUsers.map((user) => (
                <option key={user} value={user}>{user}</option>
              ))}
            </select>
          </div>

          {/* Date From */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ตั้งแต่วันที่
            </label>
            <input
              type="date"
              value={filterDateFrom}
              onChange={(e) => {
                setFilterDateFrom(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Date To */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ถึงวันที่
            </label>
            <input
              type="date"
              value={filterDateTo}
              onChange={(e) => {
                setFilterDateTo(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Clear Filters Button */}
        {(searchTerm || filterVehicle || filterUser || filterDateFrom || filterDateTo) && (
          <div className="mt-4">
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterVehicle('');
                setFilterUser('');
                setFilterDateFrom('');
                setFilterDateTo('');
                setCurrentPage(1);
              }}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              ล้างตัวกรอง
            </button>
            <span className="ml-4 text-sm text-gray-600">
              พบ {filteredTrips.length} รายการ
            </span>
          </div>
        )}
      </div>

      {trips.length === 0 && <div className="bg-white rounded p-6 shadow">ไม่พบประวัติการเดินทาง</div>}

      {trips.length > 0 && (

        <>
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">รถ</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ผู้ใช้</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">วันที่</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">จุดหมาย/วัตถุประสงค์</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ค่าใช้จ่าย</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentTrips.map(t => {
                  const tVehicle = vehiclesMap[t.vehicleId] || {};
                  return (
                    <Fragment key={t.id}>
                      <tr key={t.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-12 h-12 rounded overflow-hidden bg-gray-100 flex-shrink-0">
                              {getImageUrl(tVehicle) ? (
                                <Image src={getImageUrl(tVehicle)} alt={`${tVehicle.brand} ${tVehicle.model}`} width={48} height={48} className="object-cover" unoptimized />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-xs text-gray-500">N/A</div>
                              )}
                            </div>
                            <div className="ml-3">
                              <div className="text-sm font-medium text-gray-900">{t.vehicleLicensePlate || tVehicle.licensePlate || '-'}</div>
                              <div className="text-xs text-gray-500">{tVehicle.brand} {tVehicle.model}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{t.userName || t.userId || '-'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{formatDateTime(t.startTime)}</div>
                          <div className="text-xs text-gray-500">{formatDateTime(t.endTime)}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">{t.destination || '-'}</div>
                          <div className="text-xs text-gray-500">{t.purpose || '-'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {(t.expenses && t.expenses.length) ? `${t.expenses.reduce((s, e) => s + (e.amount || 0), 0)} บาท` : '-'}
                          </div>
                          {(t.expenses && t.expenses.length > 0) && (
                            <div className="text-xs text-gray-500">{t.expenses.length} รายการ</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={async () => {
                                setExpandedId(expandedId === t.id ? null : t.id);
                                if (!t.expenses || t.expenses.length === 0) await loadExpensesFor(t);
                              }}
                              className="text-indigo-600 hover:text-indigo-900"
                            >
                              {expandedId === t.id ? 'ย่อ' : 'รายละเอียด'}
                            </button>
                            <button
                              onClick={() => { setShowDeleteModal(true); setDeletingTrip(t); }}
                              className="text-red-600 hover:text-red-900"
                            >ลบ</button>
                          </div>
                        </td>
                      </tr>
                      {expandedId === t.id && (
                        <tr>
                          <td colSpan="6" className="px-6 py-4 bg-gray-50">
                            <div className="text-sm font-semibold mb-2">รายละเอียดค่าใช้จ่าย</div>
                            {t.expenses && t.expenses.length > 0 ? (
                              <div className="space-y-2">
                                {t.expenses.map(exp => {
                                  const typeMap = {
                                    'fuel': '⛽ เติมน้ำมัน',
                                    'fluid': '🛢️ เปลี่ยนของเหลว',
                                    'toll': '🛣️ ค่าทางด่วน',
                                    'parking': '🅿️ ค่าจอดรถ',
                                    'maintenance': '🔧 ค่าซ่อมบำรุง',
                                    'other': '💰 อื่นๆ'
                                  };
                                  const displayType = typeMap[exp.type] || exp.type || 'อื่นๆ';
                                  return (
                                    <div key={exp.id} className="flex justify-between items-center py-2 border-b border-gray-200">
                                      <div>
                                        <span className="font-medium">{displayType}</span>
                                        {exp.note && <span className="text-gray-500 ml-2">- {exp.note}</span>}
                                        {exp.mileage && <span className="text-xs text-gray-400 ml-2">(ไมล์: {exp.mileage} กม.)</span>}
                                      </div>
                                      <div className="font-medium text-teal-600">{exp.amount || 0} ฿</div>
                                    </div>
                                  );
                                })}
                                <div className="pt-2 flex justify-between font-semibold text-base">
                                  <div>รวมทั้งหมด</div>
                                  <div>{t.expenses.reduce((s, e) => s + (e.amount || 0), 0)} ฿</div>
                                </div>
                              </div>
                            ) : (
                              <div className="text-gray-500">ไม่มีค่าใช้จ่ายที่บันทึก</div>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {trips.length >= limitCount && (
            <div className="mt-6 flex justify-center">
              <button
                onClick={() => setLimitCount(prev => prev + 50)}
                className="px-6 py-3 bg-gray-100 text-gray-600 font-medium rounded-full hover:bg-gray-200 transition-colors shadow-sm"
              >
                โหลดข้อมูลเก่ากว่านี้ (ปัจจุบัน {trips.length} รายการ)
              </button>
            </div>
          )}

          {/* Modal ลบข้อมูล */}
          {showDeleteModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
              <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
                <h2 className="text-xl font-bold mb-4 text-red-700">ยืนยันการลบประวัติการเดินทาง</h2>
                <p className="mb-6">คุณแน่ใจหรือไม่ว่าต้องการลบประวัติการเดินทางนี้? <br /> <span className="text-red-500 font-semibold">การลบนี้ไม่สามารถย้อนกลับได้</span></p>
                <div className="flex justify-end gap-4">
                  <button onClick={() => setShowDeleteModal(false)} disabled={isDeleting} className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">ยกเลิก</button>
                  <button onClick={handleDeleteTrip} disabled={isDeleting} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">{isDeleting ? 'กำลังลบ...' : 'ลบ'}</button>
                </div>
              </div>
            </div>
          )}

          {/* ... keeping bulk delete modal as is (it's fine) ... */}
          {showBulkDeleteModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
              <div className="bg-white rounded-xl shadow-lg p-8 max-w-lg w-full">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">ล้างข้อมูลประวัติการเดินทาง</h2>
                    <p className="text-sm text-gray-500">เลือกช่วงเวลาที่ต้องการลบข้อมูล</p>
                  </div>
                </div>

                <div className="space-y-3 mb-6">
                  <label className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="bulkDelete"
                        value="3months"
                        checked={bulkDeletePeriod === '3months'}
                        onChange={(e) => setBulkDeletePeriod(e.target.value)}
                        className="w-5 h-5 text-red-600"
                      />
                      <div>
                        <div className="font-medium">ข้อมูลเก่ากว่า 3 เดือน</div>
                        <div className="text-xs text-gray-500">ลบข้อมูลก่อนวันที่ {new Date(new Date().getFullYear(), new Date().getMonth() - 3, new Date().getDate()).toLocaleDateString('th-TH')}</div>
                      </div>
                    </div>
                    <span className="text-sm font-medium text-red-600">{calculateTripsToDelete('3months')} รายการ</span>
                  </label>

                  <label className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="bulkDelete"
                        value="6months"
                        checked={bulkDeletePeriod === '6months'}
                        onChange={(e) => setBulkDeletePeriod(e.target.value)}
                        className="w-5 h-5 text-red-600"
                      />
                      <div>
                        <div className="font-medium">ข้อมูลเก่ากว่า 6 เดือน</div>
                        <div className="text-xs text-gray-500">ลบข้อมูลก่อนวันที่ {new Date(new Date().getFullYear(), new Date().getMonth() - 6, new Date().getDate()).toLocaleDateString('th-TH')}</div>
                      </div>
                    </div>
                    <span className="text-sm font-medium text-red-600">{calculateTripsToDelete('6months')} รายการ</span>
                  </label>

                  <label className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="bulkDelete"
                        value="1year"
                        checked={bulkDeletePeriod === '1year'}
                        onChange={(e) => setBulkDeletePeriod(e.target.value)}
                        className="w-5 h-5 text-red-600"
                      />
                      <div>
                        <div className="font-medium">ข้อมูลเก่ากว่า 1 ปี</div>
                        <div className="text-xs text-gray-500">ลบข้อมูลก่อนวันที่ {new Date(new Date().getFullYear() - 1, new Date().getMonth(), new Date().getDate()).toLocaleDateString('th-TH')}</div>
                      </div>
                    </div>
                    <span className="text-sm font-medium text-red-600">{calculateTripsToDelete('1year')} รายการ</span>
                  </label>

                  <label className="flex items-center justify-between p-4 border-2 border-red-300 bg-red-50 rounded-lg cursor-pointer hover:bg-red-100 transition-colors">
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="bulkDelete"
                        value="all"
                        checked={bulkDeletePeriod === 'all'}
                        onChange={(e) => setBulkDeletePeriod(e.target.value)}
                        className="w-5 h-5 text-red-600"
                      />
                      <div>
                        <div className="font-medium text-red-700">ลบทั้งหมด</div>
                        <div className="text-xs text-red-500">⚠️ ลบข้อมูลทั้งหมด (ไม่สามารถกู้คืนได้)</div>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-red-700">{calculateTripsToDelete('all')} รายการ</span>
                  </label>
                </div>

                {isBulkDeleting && (
                  <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-2 text-blue-700">
                      <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      <span>กำลังลบ... ({bulkDeleteCount} รายการ)</span>
                    </div>
                  </div>
                )}

                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg mb-6">
                  <p className="text-sm text-amber-800">
                    <strong>⚠️ คำเตือน:</strong> การลบข้อมูลนี้จะรวมถึงค่าใช้จ่ายที่เกี่ยวข้องด้วย และไม่สามารถกู้คืนได้
                  </p>
                </div>

                <div className="flex justify-end gap-4">
                  <button
                    onClick={() => { setShowBulkDeleteModal(false); setBulkDeletePeriod(''); }}
                    disabled={isBulkDeleting}
                    className="px-6 py-2.5 bg-gray-200 rounded-lg hover:bg-gray-300 font-medium"
                  >
                    ยกเลิก
                  </button>
                  <button
                    onClick={handleBulkDelete}
                    disabled={isBulkDeleting || !bulkDeletePeriod || calculateTripsToDelete(bulkDeletePeriod) === 0}
                    className="px-6 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isBulkDeleting ? 'กำลังลบ...' : `ลบ ${calculateTripsToDelete(bulkDeletePeriod) || 0} รายการ`}
                  </button>
                </div>
              </div>
            </div>
          )}



          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 mt-4 rounded-xl shadow">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={goToPrevPage}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ก่อนหน้า
                </button>
                <button
                  onClick={goToNextPage}
                  disabled={currentPage === totalPages}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ถัดไป
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    แสดง <span className="font-medium">{startIndex + 1}</span> ถึง <span className="font-medium">{Math.min(endIndex, filteredTrips.length)}</span> จาก{' '}
                    <span className="font-medium">{filteredTrips.length}</span> รายการ
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                    {/* First Page Button */}
                    <button
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="หน้าแรก"
                    >
                      <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M15.707 15.707a1 1 0 01-1.414 0l-5-5a1 1 0 010-1.414l5-5a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 010 1.414zm-6 0a1 1 0 01-1.414 0l-5-5a1 1 0 010-1.414l5-5a1 1 0 011.414 1.414L5.414 10l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                      </svg>
                    </button>

                    {/* Previous Button */}
                    <button
                      onClick={goToPrevPage}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </button>

                    {/* Page Numbers */}
                    {(() => {
                      let pages = [];
                      let startPage = Math.max(1, currentPage - 1);
                      let endPage = Math.min(totalPages, startPage + 2);

                      if (endPage - startPage < 2) {
                        startPage = Math.max(1, endPage - 2);
                      }

                      for (let i = startPage; i <= endPage; i++) {
                        pages.push(i);
                      }

                      return pages.map(pageNum => (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${currentPage === pageNum
                            ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                            }`}
                        >
                          {pageNum}
                        </button>
                      ));
                    })()}

                    {/* Next Button */}
                    <button
                      onClick={goToNextPage}
                      disabled={currentPage === totalPages}
                      className="relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                    </button>

                    {/* Last Page Button */}
                    <button
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="หน้าสุดท้าย"
                    >
                      <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10.293 15.707a1 1 0 010-1.414L14.586 10l-4.293-4.293a1 1 0 111.414-1.414l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0z" clipRule="evenodd" />
                        <path fillRule="evenodd" d="M4.293 15.707a1 1 0 010-1.414L8.586 10 4.293 5.707a1 1 0 011.414-1.414l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
