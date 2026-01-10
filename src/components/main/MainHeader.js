"use client";

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';

export default function MainHeader({ userProfile, activeTab, setActiveTab }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!setActiveTab) return;
    if (pathname?.startsWith('/my-vehicle')) {
      setActiveTab('vehicle');
    } else if (pathname?.startsWith('/vehicle-selection')) {
      setActiveTab('selection');
    } else if (pathname?.startsWith('/my-trips')) {
      setActiveTab('trips');
    }
  }, [pathname, setActiveTab]);

  return (
    <div className="gradient-bg">
      {/* User Info Row */}
      <div className="flex items-center gap-3 mb-3">
        {/* Avatar */}
        <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-white/20 flex-shrink-0">
          {userProfile?.imageUrl || userProfile?.photoURL || userProfile?.pictureUrl ? (
            <Image
              src={userProfile.imageUrl || userProfile.photoURL || userProfile.pictureUrl}
              alt={userProfile?.name || 'user'}
              width={36}
              height={36}
              className="w-full h-full object-cover"
              unoptimized
            />
          ) : (
            <div className="bg-white/20 w-full h-full flex items-center justify-center text-white font-medium text-sm">
              {userProfile?.name?.charAt(0) || 'U'}
            </div>
          )}
        </div>

        {/* User Info */}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-white text-sm truncate leading-tight">
            {userProfile?.name || 'ผู้ใช้งาน'}
          </p>
          <p className="text-xs text-white/60 truncate">
            {userProfile?.position || 'พนักงาน'}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => {
            router.push('/my-vehicle');
            if (typeof setActiveTab === 'function') setActiveTab('vehicle');
          }}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'vehicle'
            ? 'bg-white text-teal-700 shadow-sm'
            : 'bg-white/10 text-white/80 hover:bg-white/20'
            }`}
        >
          รถของฉัน
        </button>
        <button
          onClick={() => {
            router.push('/my-trips');
            if (typeof setActiveTab === 'function') setActiveTab('trips');
          }}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'trips'
            ? 'bg-white text-teal-700 shadow-sm'
            : 'bg-white/10 text-white/80 hover:bg-white/20'
            }`}
        >
          ประวัติ
        </button>
      </div>
    </div>
  );
}
