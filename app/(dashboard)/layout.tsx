import Sidebar from "@/components/Sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
   <div className="flex h-screen overflow-hidden bg-background">
      {/* Static Sidebar */}
      <aside className="h-screen shrink-0">
        <Sidebar />
      </aside>

      {/* Scrollable Content */}
      <main className="flex-1 overflow-y-auto px-10 py-8">
        <div className="mx-auto max-w-5xl">
          {children}
        </div>
      </main>
    </div>
  );
}
