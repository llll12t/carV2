// API: อนุมัติ/ปฏิเสธ การใช้รถ
import { NextResponse } from 'next/server';
import admin from '@/lib/firebaseAdmin';
import { sendNotificationsForEvent } from '@/lib/notifications';

export async function POST(request) {
    try {
        const body = await request.json();
        const { usageId, action, adminNote } = body;

        // ... validation ...

        const db = admin.firestore();

        // Get the usage record
        const usageRef = db.collection('vehicle-usage').doc(usageId);
        const usageDoc = await usageRef.get();
        // ... existence check ...

        const usageData = usageDoc.data();
        // ... status check ...

        const vehicleRef = db.collection('vehicles').doc(usageData.vehicleId);
        // ... vehicle check ...

        // Prepare notification payload
        const notificationPayload = {
            id: usageId,
            requesterName: usageData.userName,
            userId: usageData.userId, // This is expected to be LINE ID in our vehicle-usage
            vehicleLicensePlate: usageData.vehicleLicensePlate,
            adminNote: adminNote || '',
            // for approved
            startTime: new Date(),
        };

        if (action === 'approve') {
            // อนุมัติ: เริ่มใช้รถ
            await usageRef.update({
                status: 'active',
                startTime: new Date(),
                approvedAt: new Date(),
                adminNote: adminNote || '',
                updatedAt: new Date(),
            });

            // Update vehicle status
            await vehicleRef.update({
                status: 'in-use',
                currentUserId: usageData.userId,
                currentUsageId: usageId,
                pendingUsageId: admin.firestore.FieldValue.delete(),
                updatedAt: new Date(),
            });

            // Send Notification
            try {
                await sendNotificationsForEvent('booking_approved', notificationPayload);
            } catch (e) {
                console.error('Failed to send approval notification:', e);
            }

            return NextResponse.json({
                success: true,
                message: 'อนุมัติการใช้รถสำเร็จ',
                usageId,
            });
        } else {
            // ปฏิเสธ: ยกเลิกคำขอ
            await usageRef.update({
                status: 'rejected',
                rejectedAt: new Date(),
                adminNote: adminNote || '',
                updatedAt: new Date(),
            });

            // Reset vehicle status
            await vehicleRef.update({
                status: 'available',
                pendingUsageId: admin.firestore.FieldValue.delete(),
                updatedAt: new Date(),
            });

            // Send Notification
            try {
                await sendNotificationsForEvent('booking_rejected', notificationPayload);
            } catch (e) {
                console.error('Failed to send rejection notification:', e);
            }

            return NextResponse.json({
                success: true,
                message: 'ปฏิเสธคำขอใช้รถสำเร็จ',
                usageId,
            });
        }
    } catch (error) {
        console.error('Error processing approval:', error);
        return NextResponse.json(
            { error: 'เกิดข้อผิดพลาดในการดำเนินการ' },
            { status: 500 }
        );
    }
}

// GET: ดึงรายการที่รอการอนุมัติ
export async function GET() {
    try {
        const db = admin.firestore();

        const snapshot = await db.collection('vehicle-usage')
            .where('status', '==', 'pending')
            .orderBy('requestTime', 'desc')
            .get();

        const pendingList = [];

        for (const doc of snapshot.docs) {
            const data = { id: doc.id, ...doc.data() };

            // Fetch vehicle info
            if (data.vehicleId) {
                try {
                    const vehicleDoc = await db.collection('vehicles').doc(data.vehicleId).get();
                    if (vehicleDoc.exists) {
                        data.vehicle = { id: vehicleDoc.id, ...vehicleDoc.data() };
                    }
                } catch (e) {
                    console.warn('Could not fetch vehicle:', e);
                }
            }

            // Fetch user info
            if (data.userId) {
                try {
                    const usersSnapshot = await db.collection('users')
                        .where('lineId', '==', data.userId)
                        .limit(1)
                        .get();
                    if (!usersSnapshot.empty) {
                        data.user = { id: usersSnapshot.docs[0].id, ...usersSnapshot.docs[0].data() };
                    }
                } catch (e) {
                    console.warn('Could not fetch user:', e);
                }
            }

            pendingList.push(data);
        }

        return NextResponse.json({ pending: pendingList });
    } catch (error) {
        console.error('Error fetching pending approvals:', error);
        return NextResponse.json(
            { error: 'เกิดข้อผิดพลาดในการดึงข้อมูล' },
            { status: 500 }
        );
    }
}
