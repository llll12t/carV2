// API: คำนวณพื้นที่ใช้งาน Firestore
import { NextResponse } from 'next/server';
import admin from '@/lib/firebaseAdmin';

export async function GET() {
    try {
        const db = admin.firestore();

        // Collections ที่ต้องการนับ
        const collections = ['vehicles', 'users', 'vehicle-usage', 'expenses', 'bookings', 'settings'];

        const stats = {
            totalDocuments: 0,
            totalSizeKB: 0,
            collections: {},
            timestamp: new Date().toISOString()
        };

        for (const collectionName of collections) {
            try {
                const snapshot = await db.collection(collectionName).get();
                const docCount = snapshot.size;

                // คำนวณขนาดโดยประมาณ (ประมาณ 1KB ต่อ document สำหรับข้อมูลทั่วไป)
                // และเพิ่มขนาด base64 ถ้ามี imageUrl
                let estimatedSizeKB = 0;
                let imageCount = 0;

                snapshot.docs.forEach(doc => {
                    const data = doc.data();

                    // ขนาดพื้นฐาน (JSON string length)
                    const docString = JSON.stringify(data);
                    estimatedSizeKB += docString.length / 1024;

                    // ถ้ามี imageUrl เป็น base64 ให้นับขนาดเพิ่ม
                    if (data.imageUrl && data.imageUrl.startsWith('data:image/')) {
                        const base64Size = getBase64Size(data.imageUrl);
                        estimatedSizeKB += base64Size;
                        imageCount++;
                    }

                    // ถ้ามี photoURL เป็น base64
                    if (data.photoURL && data.photoURL.startsWith('data:image/')) {
                        estimatedSizeKB += getBase64Size(data.photoURL);
                        imageCount++;
                    }
                });

                stats.collections[collectionName] = {
                    documents: docCount,
                    estimatedSizeKB: Math.round(estimatedSizeKB),
                    imageCount
                };

                stats.totalDocuments += docCount;
                stats.totalSizeKB += Math.round(estimatedSizeKB);
            } catch (err) {
                console.error(`Error counting ${collectionName}:`, err);
                stats.collections[collectionName] = {
                    documents: 0,
                    estimatedSizeKB: 0,
                    error: err.message
                };
            }
        }

        // คำนวณเปอร์เซ็นต์การใช้งาน (Spark Plan limits)
        // Firestore: 1 GiB storage, 50,000 reads/day, 20,000 writes/day, 20,000 deletes/day
        const FIRESTORE_STORAGE_LIMIT_KB = 1024 * 1024; // 1 GB
        const DOCUMENT_LIMIT = 50000; // Approximate for small projects

        stats.limits = {
            storageLimitKB: FIRESTORE_STORAGE_LIMIT_KB,
            storageUsedPercent: ((stats.totalSizeKB / FIRESTORE_STORAGE_LIMIT_KB) * 100).toFixed(2),
            documentLimit: DOCUMENT_LIMIT,
            documentUsedPercent: ((stats.totalDocuments / DOCUMENT_LIMIT) * 100).toFixed(2)
        };

        return NextResponse.json(stats);
    } catch (error) {
        console.error('Error calculating usage:', error);
        return NextResponse.json(
            { error: 'Failed to calculate usage', details: error.message },
            { status: 500 }
        );
    }
}

// Helper function
function getBase64Size(base64String) {
    if (!base64String) return 0;
    const padding = base64String.endsWith('==') ? 2 : base64String.endsWith('=') ? 1 : 0;
    return Math.round(((base64String.length * 3) / 4 - padding) / 1024);
}
