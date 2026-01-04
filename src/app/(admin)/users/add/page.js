"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function AddUserPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: '', email: '', password: '', role: 'driver',
    lineId: '', phone: '', position: ''
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [message, setMessage] = useState({ text: '', type: '' });
  const [saving, setSaving] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleImageChange = (e) => {
    const f = e.target.files?.[0];
    if (f) {
      setImageFile(f);
      setImagePreview(URL.createObjectURL(f));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ text: '', type: '' });

    try {
      const payload = { ...form };
      if (payload.phone) {
        const digits = payload.phone.replace(/\D/g, '');
        if (digits.length !== 10) throw new Error('หมายเลขโทรศัพท์ต้องเป็นตัวเลข 10 หลัก');
        payload.phone = digits;
      }
      if (imagePreview?.startsWith('blob:')) delete payload.imageUrl;

      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'เกิดข้อผิดพลาด');

      setMessage({ text: 'สร้างผู้ใช้สำเร็จ!', type: 'success' });
      setTimeout(() => router.push('/users'), 1000);
    } catch (err) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => router.back()} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-bold text-gray-900">เพิ่มพนักงานใหม่</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        {/* Profile + Name Row */}
        <div className="flex gap-4 mb-4 pb-4 border-b border-gray-100">
          <label htmlFor="avatar" className="cursor-pointer group relative flex-shrink-0">
            {imagePreview ? (
              <Image src={imagePreview} alt="" width={72} height={72}
                className="w-18 h-18 object-cover rounded-xl border-2 border-gray-200 group-hover:border-teal-400" unoptimized />
            ) : (
              <div className="w-18 h-18 bg-gray-100 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 group-hover:border-teal-400">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            )}
            <div className="absolute inset-0 bg-black/30 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
          </label>
          <input id="avatar" type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
          <div className="flex-1 grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-600 mb-1 block">ชื่อ-นามสกุล</label>
              <input name="name" value={form.name} onChange={handleChange} required
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-gray-50 focus:bg-white" />
            </div>
          </div>
        </div>

        {/* Form Grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">อีเมล</label>
            <input name="email" type="email" value={form.email} onChange={handleChange} required
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-gray-50 focus:bg-white" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">รหัสผ่าน</label>
            <input name="password" type="password" value={form.password} onChange={handleChange} required placeholder="อย่างน้อย 6 ตัวอักษร"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-gray-50 focus:bg-white" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">เบอร์โทร</label>
            <input name="phone" value={form.phone} onChange={handleChange} placeholder="0812345678"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-gray-50 focus:bg-white" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">ตำแหน่ง</label>
            <input name="position" value={form.position} onChange={handleChange}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-gray-50 focus:bg-white" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">บทบาท</label>
            <select name="role" value={form.role} onChange={handleChange}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-gray-50 focus:bg-white">
              <option value="admin">ผู้ดูแลระบบ</option>
              <option value="driver">พนักงานขับ</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Line User ID</label>
            <input name="lineId" value={form.lineId} onChange={handleChange} placeholder="U1234567890..."
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-gray-50 focus:bg-white font-mono" />
          </div>
        </div>

        {/* Message */}
        {message.text && (
          <div className={`text-sm px-3 py-2 rounded-lg mb-4 ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {message.text}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={() => router.back()}
            className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium">
            ยกเลิก
          </button>
          <button type="submit" disabled={saving}
            className="px-4 py-2 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-medium disabled:bg-gray-300 flex items-center gap-2">
            {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
            {saving ? 'กำลังสร้าง...' : 'สร้างพนักงาน'}
          </button>
        </div>
      </form>
    </div>
  );
}
