import { useEffect, useMemo, useState } from "react";
import type { Profile, ProfileInput, Proxy } from "@tubeanty/shared";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";

const emptyForm: ProfileInput = { name: "" };
const ALL_GROUPS = "__all__";

type EditState = ProfileInput & { id: string };

export function ProfilesPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [proxies, setProxies] = useState<Proxy[]>([]);
  const [form, setForm] = useState<ProfileInput>(emptyForm);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [groupFilter, setGroupFilter] = useState<string>(ALL_GROUPS);
  const [editing, setEditing] = useState<EditState | null>(null);

  async function refresh() {
    const [profileRows, proxyRows] = await Promise.all([window.api.profiles.list(), window.api.proxies.list()]);
    setProfiles(profileRows);
    setProxies(proxyRows);
  }

  useEffect(() => {
    refresh();
  }, []);

  const groups = useMemo(() => {
    const unique = new Set(profiles.map((p) => p.group).filter((g): g is string => Boolean(g)));
    return Array.from(unique).sort();
  }, [profiles]);

  const visibleProfiles = useMemo(() => {
    if (groupFilter === ALL_GROUPS) return profiles;
    return profiles.filter((p) => p.group === groupFilter);
  }, [profiles, groupFilter]);

  function proxyLabel(proxyId: string | null): string {
    if (!proxyId) return "Sem proxy";
    return proxies.find((proxy) => proxy.id === proxyId)?.label ?? "Proxy removido";
  }

  function applyProxySuggestion(proxyId: string, target: "create" | "edit") {
    const proxy = proxies.find((p) => p.id === proxyId);
    if (!proxy) return;
    const suggestion = { timezone: proxy.lastTimezone ?? undefined, locale: proxy.lastLocale ?? undefined };
    if (target === "create") {
      setForm((prev) => ({ ...prev, proxyId, ...suggestion }));
    } else {
      setEditing((prev) => (prev ? { ...prev, proxyId, ...suggestion } : prev));
    }
  }

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

  async function handleDelete(profile: Profile) {
    if (!confirm(`Remover o perfil "${profile.name}"? Isso tambem apaga os dados de sessao (cookies) salvos dele.`))
      return;
    await window.api.profiles.delete(profile.id);
    await refresh();
  }

  async function handleDuplicate(profile: Profile) {
    await window.api.profiles.create({
      name: `${profile.name} (copia)`,
      proxyId: profile.proxyId,
      group: profile.group,
      timezone: profile.timezone,
      locale: profile.locale,
      userAgent: profile.userAgent,
      notes: profile.notes,
    });
    await refresh();
  }

  function startEdit(profile: Profile) {
    setEditing({
      id: profile.id,
      name: profile.name,
      proxyId: profile.proxyId,
      group: profile.group,
      timezone: profile.timezone,
      locale: profile.locale,
      notes: profile.notes,
    });
  }

  async function handleSaveEdit() {
    if (!editing) return;
    const { id, ...input } = editing;
    await window.api.profiles.update(id, input);
    setEditing(null);
    await refresh();
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
          <input
            className="rounded-md border border-border bg-transparent px-3 py-2 text-sm"
            placeholder="Grupo/tag (ex: Cliente X)"
            list="profile-groups"
            value={form.group ?? ""}
            onChange={(e) => setForm({ ...form, group: e.target.value || null })}
          />
          <datalist id="profile-groups">
            {groups.map((g) => (
              <option key={g} value={g} />
            ))}
          </datalist>
          <select
            className="rounded-md border border-border bg-transparent px-3 py-2 text-sm"
            value={form.proxyId ?? ""}
            onChange={(e) => (e.target.value ? applyProxySuggestion(e.target.value, "create") : setForm({ ...form, proxyId: null }))}
          >
            <option value="">Sem proxy</option>
            {proxies.map((proxy) => (
              <option key={proxy.id} value={proxy.id}>
                {proxy.label}
              </option>
            ))}
          </select>
          <div />
          <input
            className="rounded-md border border-border bg-transparent px-3 py-2 text-sm"
            placeholder="Timezone (ex: America/Sao_Paulo)"
            value={form.timezone ?? ""}
            onChange={(e) => setForm({ ...form, timezone: e.target.value || null })}
          />
          <input
            className="rounded-md border border-border bg-transparent px-3 py-2 text-sm"
            placeholder="Idioma (ex: pt-BR)"
            value={form.locale ?? ""}
            onChange={(e) => setForm({ ...form, locale: e.target.value || null })}
          />
          <Button className="col-span-2" onClick={handleCreate}>
            Criar perfil
          </Button>
        </CardContent>
      </Card>

      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Filtrar por grupo:</span>
        <select
          className="rounded-md border border-border bg-transparent px-3 py-2 text-sm"
          value={groupFilter}
          onChange={(e) => setGroupFilter(e.target.value)}
        >
          <option value={ALL_GROUPS}>Todos</option>
          {groups.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {visibleProfiles.map((profile) => {
          const isEditing = editing?.id === profile.id;

          if (isEditing && editing) {
            return (
              <Card key={profile.id}>
                <CardHeader>
                  <CardTitle>Editando: {profile.name}</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-3">
                  <input
                    className="rounded-md border border-border bg-transparent px-3 py-2 text-sm"
                    placeholder="Nome"
                    value={editing.name}
                    onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  />
                  <input
                    className="rounded-md border border-border bg-transparent px-3 py-2 text-sm"
                    placeholder="Grupo/tag"
                    list="profile-groups"
                    value={editing.group ?? ""}
                    onChange={(e) => setEditing({ ...editing, group: e.target.value || null })}
                  />
                  <select
                    className="rounded-md border border-border bg-transparent px-3 py-2 text-sm"
                    value={editing.proxyId ?? ""}
                    onChange={(e) =>
                      e.target.value
                        ? applyProxySuggestion(e.target.value, "edit")
                        : setEditing({ ...editing, proxyId: null })
                    }
                  >
                    <option value="">Sem proxy</option>
                    {proxies.map((proxy) => (
                      <option key={proxy.id} value={proxy.id}>
                        {proxy.label}
                      </option>
                    ))}
                  </select>
                  <div />
                  <input
                    className="rounded-md border border-border bg-transparent px-3 py-2 text-sm"
                    placeholder="Timezone"
                    value={editing.timezone ?? ""}
                    onChange={(e) => setEditing({ ...editing, timezone: e.target.value || null })}
                  />
                  <input
                    className="rounded-md border border-border bg-transparent px-3 py-2 text-sm"
                    placeholder="Idioma"
                    value={editing.locale ?? ""}
                    onChange={(e) => setEditing({ ...editing, locale: e.target.value || null })}
                  />
                  <div className="col-span-2 flex justify-end gap-2">
                    <Button variant="ghost" onClick={() => setEditing(null)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleSaveEdit}>Salvar</Button>
                  </div>
                </CardContent>
              </Card>
            );
          }

          return (
            <Card key={profile.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{profile.name}</span>
                  <div className="flex gap-1">
                    {profile.group && <Badge tone="success">{profile.group}</Badge>}
                    <Badge>{proxyLabel(profile.proxyId)}</Badge>
                  </div>
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
                  <Button variant="ghost" onClick={() => startEdit(profile)}>
                    Editar
                  </Button>
                  <Button variant="ghost" onClick={() => handleDuplicate(profile)}>
                    Duplicar
                  </Button>
                  <Button variant="destructive" onClick={() => handleDelete(profile)}>
                    Remover
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
