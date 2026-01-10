"use client";

export default function ApprovalLayout({ children }) {
    return (
        <div className="flex min-h-screen bg-gray-100 flex-col">
            <main className="flex-1 p-4 md:p-6 overflow-y-auto">
                {/* Center content and limit width */}
                <div className="max-w-6xl mx-auto w-full">
                    {children}
                </div>
            </main>
        </div>
    );
}
