import { useEffect, useState } from "react";
import type { Profile, ProfileInput, Proxy } from "@tubeanty/shared";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";

const emptyForm: ProfileInput = { name: "" };

export function ProfilesPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [proxies, setProxies] = useState<Proxy[]>([]);
  const [form, setForm] = useState<ProfileInput>(emptyForm);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function refresh() {
    const [profileRows, proxyRows] = await Promise.all([window.api.profiles.list(), window.api.proxies.list()]);
    setProfiles(profileRows);
    setProxies(proxyRows);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleCreate() {
    if (!form.name) return;
    await window.api.profiles.create(form);
    setForm(emptyForm);
    await refresh();
  }

  async function handleOpen(id: string) {
    setBusyId(id);
    const result = await window.api.profiles.open(id);
    setBusyId(null);
    if (!result.ok) alert(`Falha ao abrir perfil: ${result.error ?? "desconhecida"}`);
    await refresh();
  }

  async function handleOpenStudio(id: string) {
    setBusyId(id);
    const result = await window.api.profiles.openYoutubeStudio(id);
    setBusyId(null);
    if (!result.ok) alert(`Falha ao abrir YouTube Studio: ${result.error ?? "desconhecida"}`);
    await refresh();
  }

  async function handleDelete(id: string) {
    await window.api.profiles.delete(id);
    await refresh();
  }

  function proxyLabel(proxyId: string | null): string {
    if (!proxyId) return "Sem proxy";
    return proxies.find((proxy) => proxy.id === proxyId)?.label ?? "Proxy removido";
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Novo perfil</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3">
          <input
            className="rounded-md border border-border bg-transparent px-3 py-2 text-sm"
            placeholder="Nome do perfil (ex: Canal A)"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <select
            className="rounded-md border border-border bg-transparent px-3 py-2 text-sm"
            value={form.proxyId ?? ""}
            onChange={(e) => setForm({ ...form, proxyId: e.target.value || null })}
          >
            <option value="">Sem proxy</option>
            {proxies.map((proxy) => (
              <option key={proxy.id} value={proxy.id}>
                {proxy.label}
              </option>
            ))}
          </select>
          <Button className="col-span-2" onClick={handleCreate}>
            Criar perfil
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        {profiles.map((profile) => (
          <Card key={profile.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{profile.name}</span>
                <Badge>{proxyLabel(profile.proxyId)}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                {profile.lastOpenedAt
                  ? `Aberto em ${new Date(profile.lastOpenedAt).toLocaleString("pt-BR")}`
                  : "Nunca aberto"}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" disabled={busyId === profile.id} onClick={() => handleOpen(profile.id)}>
                  Abrir
                </Button>
                <Button
                  variant="outline"
                  disabled={busyId === profile.id}
                  onClick={() => handleOpenStudio(profile.id)}
                >
                  YT Studio
                </Button>
                <Button variant="destructive" onClick={() => handleDelete(profile.id)}>
                  Remover
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
