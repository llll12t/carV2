/**
 * Image utilities for base64 encoding
 * ใช้แทน Firebase Storage
 */

/**
 * แปลงไฟล์รูปภาพเป็น base64 string
 * @param {File} file - ไฟล์รูปภาพ
 * @param {Object} options - ตัวเลือกเพิ่มเติม
 * @param {number} options.maxWidth - ความกว้างสูงสุด (default: 800)
 * @param {number} options.maxHeight - ความสูงสูงสุด (default: 600)
 * @param {number} options.quality - คุณภาพ 0-1 (default: 0.7)
 * @returns {Promise<string>} base64 string
 */
export async function imageToBase64(file, options = {}) {
    const { maxWidth = 800, maxHeight = 600, quality = 0.7 } = options;

    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                // คำนวณขนาดใหม่
                let width = img.width;
                let height = img.height;

                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }
                if (height > maxHeight) {
                    width = (width * maxHeight) / height;
                    height = maxHeight;
                }

                // สร้าง canvas และ resize
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // แปลงเป็น base64
                const base64 = canvas.toDataURL('image/jpeg', quality);
                resolve(base64);
            };
            img.onerror = (err) => reject(err);
            img.src = e.target.result;
        };
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(file);
    });
}

/**
 * คำนวณขนาด base64 string เป็น KB
 * @param {string} base64String - base64 string
 * @returns {number} ขนาดเป็น KB
 */
export function getBase64Size(base64String) {
    if (!base64String) return 0;
    // base64 มีขนาดประมาณ 4/3 ของ binary
    const padding = base64String.endsWith('==') ? 2 : base64String.endsWith('=') ? 1 : 0;
    return Math.round(((base64String.length * 3) / 4 - padding) / 1024);
}

/**
 * ตรวจสอบว่าเป็น base64 image หรือไม่
 * @param {string} str - string ที่ต้องการตรวจสอบ
 * @returns {boolean}
 */
export function isBase64Image(str) {
    if (!str) return false;
    return str.startsWith('data:image/');
}

/**
 * แปลง base64 เป็น Blob (สำหรับ upload ถ้าต้องการ)
 * @param {string} base64 - base64 string
 * @returns {Blob}
 */
export function base64ToBlob(base64) {
    const byteString = atob(base64.split(',')[1]);
    const mimeString = base64.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mimeString });
}
