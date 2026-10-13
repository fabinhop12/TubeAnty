import { useEffect, useState } from "react";
import type { Proxy, ProxyInput } from "@tubeanty/shared";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";

const emptyForm: ProxyInput = { label: "", protocol: "HTTP", host: "", port: 8080 };

export function ProxiesPage() {
  const [proxies, setProxies] = useState<Proxy[]>([]);
  const [form, setForm] = useState<ProxyInput>(emptyForm);
  const [testingId, setTestingId] = useState<string | null>(null);

  async function refresh() {
    setProxies(await window.api.proxies.list());
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleCreate() {
    if (!form.label || !form.host) return;
    await window.api.proxies.create(form);
    setForm(emptyForm);
    await refresh();
  }

  async function handleTest(proxy: Proxy) {
    setTestingId(proxy.id);
    await window.api.proxies.test(proxy.id, {
      label: proxy.label,
      protocol: proxy.protocol,
      host: proxy.host,
      port: proxy.port,
      username: proxy.username,
    });
    setTestingId(null);
    await refresh();
  }

  async function handleRotate(proxy: Proxy) {
    const result = await window.api.proxies.rotateIp(proxy.id);
    if (!result.ok) alert(`Falha ao rotacionar IP: ${result.error ?? "desconhecida"}`);
  }

  async function handleDelete(proxy: Proxy) {
    if (!confirm(`Remover o proxy "${proxy.label}"? Perfis que o usam ficarao sem proxy.`)) return;
    await window.api.proxies.delete(proxy.id);
    await refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Novo proxy</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3">
          <input
            className="rounded-md border border-border bg-transparent px-3 py-2 text-sm"
            placeholder="Rotulo (ex: BR-residencial-01)"
            value={form.label}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
          />
          <select
            className="rounded-md border border-border bg-transparent px-3 py-2 text-sm"
            value={form.protocol}
            onChange={(e) => setForm({ ...form, protocol: e.target.value as ProxyInput["protocol"] })}
          >
            <option value="HTTP">HTTP</option>
            <option value="HTTPS">HTTPS</option>
            <option value="SOCKS5">SOCKS5</option>
          </select>
          <input
            className="rounded-md border border-border bg-transparent px-3 py-2 text-sm"
            placeholder="Host"
            value={form.host}
            onChange={(e) => setForm({ ...form, host: e.target.value })}
          />
          <input
            className="rounded-md border border-border bg-transparent px-3 py-2 text-sm"
            placeholder="Porta"
            type="number"
            value={form.port}
            onChange={(e) => setForm({ ...form, port: Number(e.target.value) })}
          />
          <input
            className="rounded-md border border-border bg-transparent px-3 py-2 text-sm"
            placeholder="Usuario (opcional)"
            value={form.username ?? ""}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
          />
          <input
            className="rounded-md border border-border bg-transparent px-3 py-2 text-sm"
            placeholder="Senha (opcional)"
            type="password"
            value={form.password ?? ""}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          <input
            className="col-span-2 rounded-md border border-border bg-transparent px-3 py-2 text-sm"
            placeholder="URL de rotacao de IP (proxy 4G/mobile, opcional)"
            value={form.rotationUrl ?? ""}
            onChange={(e) => setForm({ ...form, rotationUrl: e.target.value })}
          />
          <Button className="col-span-2" onClick={handleCreate}>
            Adicionar proxy
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        {proxies.map((proxy) => (
          <Card key={proxy.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{proxy.label}</span>
                <Badge tone={proxy.lastIp ? "success" : "neutral"}>
                  {proxy.protocol} · {proxy.host}:{proxy.port}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm text-muted-foreground">
              <div className="flex items-center justify-between">
                <span>{proxy.lastIp ? `IP: ${proxy.lastIp} (${proxy.lastLatencyMs}ms)` : "Nunca testado"}</span>
                <div className="flex gap-2">
                  {proxy.rotationUrl && (
                    <Button variant="outline" onClick={() => handleRotate(proxy)}>
                      Rotacionar IP
                    </Button>
                  )}
                  <Button variant="outline" disabled={testingId === proxy.id} onClick={() => handleTest(proxy)}>
                    {testingId === proxy.id ? "Testando..." : "Testar"}
                  </Button>
                  <Button variant="destructive" onClick={() => handleDelete(proxy)}>
                    Remover
                  </Button>
                </div>
              </div>
              {proxy.lastTimezone && (
                <div className="flex gap-2">
                  <Badge tone="neutral">{proxy.lastCountryCode}</Badge>
                  <Badge tone="neutral">{proxy.lastTimezone}</Badge>
                  {proxy.lastLocale && <Badge tone="neutral">{proxy.lastLocale}</Badge>}
                  <span className="text-xs">sugestao de timezone/idioma para perfis deste proxy</span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
