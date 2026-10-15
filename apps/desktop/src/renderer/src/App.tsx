import { useState } from "react";
import { ProfilesPage } from "./pages/ProfilesPage";
import { ProxiesPage } from "./pages/ProxiesPage";
import { SettingsPage } from "./pages/SettingsPage";
import { cn } from "./lib/utils";

type Tab = "profiles" | "proxies" | "settings";

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "profiles", label: "Perfis" },
  { id: "proxies", label: "Proxies" },
  { id: "settings", label: "Configuracoes" },
];

export default function App() {
  const [tab, setTab] = useState<Tab>("profiles");

  return (
    <div className="flex h-screen">
      <aside className="w-56 border-r border-border p-4">
        <h1 className="mb-6 text-lg font-bold">TubeAnty</h1>
        <nav className="flex flex-col gap-1">
          {TABS.map((item) => (
            <button
              key={item.id}
              className={cn(
                "rounded-md px-3 py-2 text-left text-sm",
                tab === item.id ? "bg-muted" : "hover:bg-muted/50",
              )}
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </aside>
      <main className="flex-1 overflow-auto p-6">
        {tab === "profiles" && <ProfilesPage />}
        {tab === "proxies" && <ProxiesPage />}
        {tab === "settings" && <SettingsPage />}
      </main>
    </div>
  );
}
