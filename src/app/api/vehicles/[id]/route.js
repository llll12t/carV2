import { NextResponse } from 'next/server';
import admin from '@/lib/firebaseAdmin';

export async function GET(request, { params }) {
    try {
        const { id } = params;

        if (!id) {
            return NextResponse.json(
                { error: 'Vehicle ID is required' },
                { status: 400 }
            );
        }

        const db = admin.firestore();
        const vehicleDoc = await db.collection('vehicles').doc(id).get();

        if (!vehicleDoc.exists) {
            return NextResponse.json(
                { error: 'Vehicle not found' },
                { status: 404 }
            );
        }

        const vehicleData = vehicleDoc.data();

        return NextResponse.json({
            id: vehicleDoc.id,
            ...vehicleData,
            // Convert timestamps if needed
            createdAt: vehicleData.createdAt?.toDate?.()?.toISOString() || vehicleData.createdAt,
            updatedAt: vehicleData.updatedAt?.toDate?.()?.toISOString() || vehicleData.updatedAt,
        });

    } catch (error) {
        console.error('Error fetching vehicle:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
