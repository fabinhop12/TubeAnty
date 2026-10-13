import { useState } from "react";
import { ProfilesPage } from "./pages/ProfilesPage";
import { ProxiesPage } from "./pages/ProxiesPage";
import { cn } from "./lib/utils";

type Tab = "profiles" | "proxies";

export default function App() {
  const [tab, setTab] = useState<Tab>("profiles");

  return (
    <div className="flex h-screen">
      <aside className="w-56 border-r border-border p-4">
        <h1 className="mb-6 text-lg font-bold">TubeAnty</h1>
        <nav className="flex flex-col gap-1">
          <button
            className={cn(
              "rounded-md px-3 py-2 text-left text-sm",
              tab === "profiles" ? "bg-muted" : "hover:bg-muted/50",
            )}
            onClick={() => setTab("profiles")}
          >
            Perfis
          </button>
          <button
            className={cn(
              "rounded-md px-3 py-2 text-left text-sm",
              tab === "proxies" ? "bg-muted" : "hover:bg-muted/50",
            )}
            onClick={() => setTab("proxies")}
          >
            Proxies
          </button>
        </nav>
      </aside>
      <main className="flex-1 overflow-auto p-6">{tab === "profiles" ? <ProfilesPage /> : <ProxiesPage />}</main>
    </div>
  );
}
