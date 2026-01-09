
"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter, useParams } from "next/navigation";
import { db, storage } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { auth } from '@/lib/firebase';
import { sendPasswordResetEmail } from 'firebase/auth';

export default function EditUserPage() {
	const router = useRouter();
	const params = useParams();
	const userId = params?.userId;
	const [form, setForm] = useState({
		name: "", email: "", role: "driver", lineId: "",
		phone: "", position: "", note: "", imageUrl: ""
	});
	const [imageFile, setImageFile] = useState(null);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [message, setMessage] = useState({ text: "", type: "" });

	useEffect(() => {
		async function fetchUser() {
			if (!userId) return;
			setLoading(true);
			const snap = await getDoc(doc(db, "users", userId));
			if (snap.exists()) {
				const d = snap.data();
				setForm({
					name: d.name || "", email: d.email || "", role: d.role || "driver",
					lineId: d.lineId || "", phone: d.phone || "", position: d.position || "",
					note: d.note || "", imageUrl: d.imageUrl || ""
				});
			}
			setLoading(false);
		}
		fetchUser();
	}, [userId]);

	const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

	const handleImageChange = (e) => {
		const file = e.target.files[0];
		if (file) {
			setImageFile(file);
			setForm({ ...form, imageUrl: URL.createObjectURL(file) });
		}
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		setMessage({ text: "", type: "" });
		setSaving(true);
		try {
			let imageUrl = form.imageUrl;
			if (imageFile) {
				const storageRef = ref(storage, `users/${userId}_${Date.now()}`);
				await uploadBytes(storageRef, imageFile);
				imageUrl = await getDownloadURL(storageRef);
			}
			let phoneToSave = form.phone || null;
			if (phoneToSave) {
				const digits = phoneToSave.replace(/\D/g, '');
				if (digits.length !== 10) {
					setMessage({ text: 'หมายเลขโทรศัพท์ต้องเป็นตัวเลข 10 หลัก', type: 'error' });
					setSaving(false);
					return;
				}
				phoneToSave = digits;
			}
			await updateDoc(doc(db, "users", userId), {
				name: form.name, email: form.email, role: form.role,
				lineId: form.lineId || null, phone: phoneToSave,
				position: form.position, note: form.note, imageUrl
			});
			setMessage({ text: "บันทึกสำเร็จ!", type: "success" });
			setSaving(false);
			setTimeout(() => router.push("/users"), 1000);
		} catch (err) {
			console.error(err);
			setMessage({ text: "เกิดข้อผิดพลาด", type: "error" });
			setSaving(false);
		}
	};

	const handleSendReset = async () => {
		if (!form.email) return setMessage({ text: 'ไม่มีอีเมล', type: 'error' });
		try {
			await sendPasswordResetEmail(auth, form.email);
			setMessage({ text: 'ส่งอีเมลรีเซ็ตรหัสผ่านแล้ว', type: 'success' });
		} catch {
			setMessage({ text: 'ส่งอีเมลไม่สำเร็จ', type: 'error' });
		}
	};

	if (loading) return (
		<div className="min-h-[50vh] flex items-center justify-center">
			<div className="w-8 h-8 border-3 border-teal-500 border-t-transparent rounded-full animate-spin" />
		</div>
	);

	return (
		<div className="max-w-2xl mx-auto">
			<div className="flex items-center gap-3 mb-4">
				<button onClick={() => router.back()} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
					<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
					</svg>
				</button>
				<h1 className="text-xl font-bold text-gray-900">แก้ไขข้อมูลพนักงาน</h1>
			</div>

			<form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
				{/* Profile + Name Row */}
				<div className="flex gap-4 mb-4 pb-4 border-b border-gray-100">
					<label htmlFor="avatar" className="cursor-pointer group relative flex-shrink-0">
						{form.imageUrl ? (
							<Image src={form.imageUrl} alt="" width={72} height={72}
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
					<div className="col-span-2">
						<label className="text-xs font-medium text-gray-600 mb-1 block">Line User ID</label>
						<input name="lineId" value={form.lineId} onChange={handleChange} placeholder="U1234567890..."
							className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-gray-50 focus:bg-white font-mono" />
					</div>
					<div className="col-span-2">
						<label className="text-xs font-medium text-gray-600 mb-1 block">หมายเหตุ</label>
						<textarea name="note" value={form.note} onChange={handleChange} rows={2}
							className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-gray-50 focus:bg-white resize-none" />
					</div>
				</div>

				{/* Security */}
				<div className="flex items-center justify-between py-3 px-3 bg-gray-50 rounded-lg mb-4">
					<span className="text-sm text-gray-600">รีเซ็ตรหัสผ่าน</span>
					<button type="button" onClick={handleSendReset}
						className="text-xs px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 font-medium">
						ส่งอีเมลรีเซ็ต
					</button>
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
						{saving ? 'กำลังบันทึก...' : 'บันทึก'}
					</button>
				</div>
			</form>
		</div>
	);
}
