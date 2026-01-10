// API: เริ่มใช้งานรถ (รองรับระบบอนุมัติ)
import { NextResponse } from 'next/server';
import admin from '@/lib/firebaseAdmin';
import { sendNotificationsForEvent } from '@/lib/notifications';

export async function POST(request) {
  try {
    const body = await request.json();
    const { userId, userName, vehicleId, vehicleLicensePlate, startMileage, destination, purpose } = body;

    // Validate required fields
    if (!userId || !vehicleId) {
      return NextResponse.json(
        { error: 'กรุณาระบุข้อมูลให้ครบถ้วน: userId, vehicleId' },
        { status: 400 }
      );
    }

    const db = admin.firestore();

    // Check if vehicle is available
    const vehicleRef = db.collection('vehicles').doc(vehicleId);
    const vehicleDoc = await vehicleRef.get();

    if (!vehicleDoc.exists) {
      return NextResponse.json({ error: 'ไม่พบรถคันนี้ในระบบ' }, { status: 404 });
    }

    const vehicleData = vehicleDoc.data();
    if (vehicleData.status !== 'available') {
      return NextResponse.json(
        { error: 'รถคันนี้ไม่พร้อมใช้งาน' },
        { status: 400 }
      );
    }

    // ตรวจสอบ setting ว่าต้องมีการอนุมัติหรือไม่
    let approvalRequired = false;
    try {
      // อ่านจาก appConfig/notifications ซึ่งเป็นที่เก็บ settings ของระบบ
      const settingsDoc = await db.collection('appConfig').doc('notifications').get();
      if (settingsDoc.exists) {
        approvalRequired = settingsDoc.data().approvalRequired || false;
      }
    } catch (e) {
      console.warn('Could not fetch approval setting:', e);
    }


    // กำหนดสถานะเริ่มต้น
    const initialStatus = approvalRequired ? 'pending' : 'active';

    // Create vehicle-usage record
    const usageData = {
      vehicleId,
      vehicleLicensePlate: vehicleLicensePlate || vehicleData.licensePlate,
      userId,
      userName: userName || 'ไม่ระบุชื่อ',
      startTime: approvalRequired ? null : new Date(), // ถ้ารออนุมัติ ยังไม่เริ่มนับเวลา
      requestTime: new Date(), // เวลาที่ขอใช้รถ
      endTime: null,
      startMileage: startMileage !== undefined ? Number(startMileage) : null,
      endMileage: null,
      destination: destination || '',
      purpose: purpose || '',
      status: initialStatus,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const usageRef = await db.collection('vehicle-usage').add(usageData);

    // ถ้าไม่ต้องอนุมัติ (เริ่มใช้ได้เลย) -> update vehicle status
    if (!approvalRequired) {
      const updateData = {
        status: 'in-use',
        currentUserId: userId,
        currentUsageId: usageRef.id,
        updatedAt: new Date(),
      };
      if (startMileage !== undefined) {
        updateData.currentMileage = Number(startMileage);
      }
      await vehicleRef.update(updateData);
    } else {
      // ถ้าต้องอนุมัติ -> mark vehicle as pending
      await vehicleRef.update({
        status: 'pending',
        pendingUsageId: usageRef.id,
        updatedAt: new Date(),
      });

      // ส่งแจ้งเตือนหา Admin ว่ามีคำขอใหม่
      try {
        await sendNotificationsForEvent('admin_approval_request', {
          id: usageRef.id,
          ...usageData
        });
      } catch (e) {
        console.error('Failed to notify admins of new request:', e);
      }
    }

    return NextResponse.json({
      success: true,
      usageId: usageRef.id,
      approvalRequired,
      message: approvalRequired
        ? 'ส่งคำขอใช้รถสำเร็จ กรุณารอการอนุมัติจากแอดมิน'
        : 'เริ่มใช้งานรถสำเร็จ',
    });
  } catch (error) {
    console.error('Error starting vehicle usage:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการเริ่มใช้งานรถ' },
      { status: 500 }
    );
  }
}
