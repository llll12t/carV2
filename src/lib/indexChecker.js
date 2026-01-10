import { collection, query, where, orderBy, getDocs, limit } from "firebase/firestore";
import { db } from "./firebase";

/**
 * List of all queries that require composite indexes in carV2 app
 */
const REQUIRED_QUERIES = [
    {
        name: "รายชื่อพนักงานเรียงตามชื่อ",
        collection: "users",
        description: "name (asc)",
        buildQuery: () => {
            if (!db) return null;
            return query(
                collection(db, "users"),
                orderBy("name", "asc"),
                limit(1)
            )
        }
    },
    {
        name: "รายการจองเรียงตามวันที่",
        collection: "bookings",
        description: "createdAt (desc)",
        buildQuery: () => {
            if (!db) return null;
            return query(
                collection(db, "bookings"),
                orderBy("createdAt", "desc"),
                limit(1)
            )
        }
    },
    {
        name: "การจองของผู้ใช้เรียงตามวันที่",
        collection: "bookings",
        description: "userId + createdAt (desc)",
        buildQuery: () => {
            if (!db) return null;
            return query(
                collection(db, "bookings"),
                where("userId", "==", "__test__"),
                orderBy("createdAt", "desc"),
                limit(1)
            )
        }
    },
    {
        name: "การจองตามสถานะ",
        collection: "bookings",
        description: "status + createdAt (desc)",
        buildQuery: () => {
            if (!db) return null;
            return query(
                collection(db, "bookings"),
                where("status", "==", "pending"),
                orderBy("createdAt", "desc"),
                limit(1)
            )
        }
    },
    {
        name: "รายการรถเรียงตามชื่อ",
        collection: "vehicles",
        description: "name (asc)",
        buildQuery: () => {
            if (!db) return null;
            return query(
                collection(db, "vehicles"),
                orderBy("name", "asc"),
                limit(1)
            )
        }
    },
    {
        name: "ประวัติการใช้รถเรียงตามวันที่",
        collection: "vehicle-usage",
        description: "createdAt (desc)",
        buildQuery: () => {
            if (!db) return null;
            return query(
                collection(db, "vehicle-usage"),
                orderBy("createdAt", "desc"),
                limit(1)
            )
        }
    },
    {
        name: "ประวัติการใช้รถของผู้ใช้",
        collection: "vehicle-usage",
        description: "userId + createdAt (desc)",
        buildQuery: () => {
            if (!db) return null;
            return query(
                collection(db, "vehicle-usage"),
                where("userId", "==", "__test__"),
                orderBy("createdAt", "desc"),
                limit(1)
            )
        }
    },
    {
        name: "ประวัติการใช้รถตามรถ",
        collection: "vehicle-usage",
        description: "vehicleId + createdAt (desc)",
        buildQuery: () => {
            if (!db) return null;
            return query(
                collection(db, "vehicle-usage"),
                where("vehicleId", "==", "__test__"),
                orderBy("createdAt", "desc"),
                limit(1)
            )
        }
    },
];

/**
 * Extract index creation URL from Firebase error message
 */
function extractIndexUrl(errorMessage) {
    const urlMatch = errorMessage.match(/https:\/\/console\.firebase\.google\.com[^\s]*/);
    return urlMatch ? urlMatch[0] : undefined;
}

/**
 * Check all required indexes and return results
 * @returns {Promise<Array<{queryName: string, collection: string, description: string, status: 'ok' | 'missing', indexUrl?: string, error?: string}>>}
 */
export async function checkAllIndexes() {
    const results = [];

    for (const queryDef of REQUIRED_QUERIES) {
        try {
            const q = queryDef.buildQuery();
            if (!q) {
                results.push({
                    queryName: queryDef.name,
                    collection: queryDef.collection,
                    description: queryDef.description,
                    status: "ok" // Skip if db not ready
                });
                continue;
            }
            await getDocs(q);

            results.push({
                queryName: queryDef.name,
                collection: queryDef.collection,
                description: queryDef.description,
                status: "ok"
            });
        } catch (error) {
            const errorMessage = error?.message || String(error);
            const indexUrl = extractIndexUrl(errorMessage);

            if (indexUrl || errorMessage.includes("index")) {
                results.push({
                    queryName: queryDef.name,
                    collection: queryDef.collection,
                    description: queryDef.description,
                    status: "missing",
                    indexUrl: indexUrl,
                    error: "ต้องสร้าง Index"
                });
            } else {
                // Other errors (e.g., permission denied) - likely OK
                results.push({
                    queryName: queryDef.name,
                    collection: queryDef.collection,
                    description: queryDef.description,
                    status: "ok"
                });
            }
        }
    }

    return results;
}

/**
 * Get only missing indexes
 */
export async function getMissingIndexes() {
    const results = await checkAllIndexes();
    return results.filter(r => r.status === "missing");
}
