import { type ReactNode } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";

export default function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();

  const handleLogout = () => {
    logout();
    setLocation("/login");
  };

  return (
    <div className="min-h-screen bg-[hsl(210,40%,98%)] flex flex-col">
      {/* Top Header Bar */}
      <header className="bg-white border-b border-[hsl(214,32%,88%)] px-6 py-3 flex items-center justify-between flex-shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[hsl(207,89%,45%)] rounded-lg flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <div>
            <h1 className="text-sm font-bold text-[hsl(213,31%,18%)] leading-tight">Company Task Tracker</h1>
            <p className="text-[10px] text-[hsl(213,20%,50%)] leading-tight">Wealth Management Operations</p>
          </div>
        </div>

        {/* User info + logout */}
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm font-semibold text-[hsl(213,31%,18%)]">{user?.name}</p>
            <p className="text-[11px] text-[hsl(213,20%,50%)]">
              {user?.role === "manager" ? "Manager" : "Employee"}
            </p>
          </div>
          <div className="w-8 h-8 rounded-full bg-[hsl(207,89%,92%)] flex items-center justify-center flex-shrink-0">
            <span className="text-[hsl(207,89%,35%)] text-xs font-bold">{user?.name?.charAt(0) ?? "?"}</span>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[hsl(213,20%,50%)] hover:text-[hsl(0,72%,51%)] hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign Out
          </button>
        </div>
      </header>

      {/* Body: sidebar + content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <nav className="w-52 bg-[hsl(213,40%,18%)] flex flex-col flex-shrink-0">
          <div className="p-3 flex-1 space-y-0.5 pt-5">
            <button
              onClick={() => setLocation("/dashboard")}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[hsl(210,40%,80%)] hover:bg-[hsl(213,35%,24%)] hover:text-white transition-colors text-sm"
            >
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Dashboard
            </button>

            {user?.role === "manager" && (
              <button
                onClick={() => setLocation("/tasks/new")}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[hsl(210,40%,80%)] hover:bg-[hsl(213,35%,24%)] hover:text-white transition-colors text-sm"
              >
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Task
              </button>
            )}
          </div>

          <div className="p-3 border-t border-[hsl(213,35%,24%)]">
            <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full font-medium ${user?.role === "manager" ? "bg-[hsl(207,89%,20%)] text-[hsl(207,89%,80%)]" : "bg-[hsl(142,60%,18%)] text-[hsl(142,60%,75%)]"}`}>
              {user?.role === "manager" ? "Manager" : "Employee"}
            </span>
          </div>
        </nav>

        {/* Main content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
