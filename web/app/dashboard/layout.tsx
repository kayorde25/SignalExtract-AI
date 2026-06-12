import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import CommandPalette from "@/components/CommandPalette";
import ToastProvider from "@/components/ui/Toast";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <div className="min-h-screen">
        <Sidebar />
        <div className="ml-60 flex min-h-screen flex-col">
          <Topbar />
          <main className="flex-1 px-8 py-8">
            <div className="mx-auto max-w-6xl animate-fade-in">{children}</div>
          </main>
        </div>
        <CommandPalette />
      </div>
    </ToastProvider>
  );
}
