import { useEffect, useState } from "react";
import type { GoogleOAuthConfig } from "@tubeanty/shared";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";

export function SettingsPage() {
  const [config, setConfig] = useState<GoogleOAuthConfig | null>(null);
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [saving, setSaving] = useState(false);

  async function refresh() {
    const result = await window.api.settings.getGoogleOAuthConfig();
    setConfig(result);
    setClientId(result.clientId);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleSave() {
    if (!clientId || !clientSecret) return;
    setSaving(true);
    await window.api.settings.setGoogleOAuthConfig({ clientId, clientSecret });
    setClientSecret("");
    setSaving(false);
    await refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Credenciais OAuth do Google (YouTube Data/Analytics API)</span>
            {config?.hasClientSecret && <Badge tone="success">Configurado</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="text-sm text-muted-foreground">
            <p className="mb-2">
              Pra TubeAnty ler estatisticas reais de um canal (inscritos, visualizacoes, videos) via API oficial do
              YouTube, voce precisa criar suas proprias credenciais OAuth no Google Cloud Console — gratis, leva uns
              5 minutos:
            </p>
            <ol className="list-decimal space-y-1 pl-5">
              <li>
                Abra{" "}
                <span className="font-mono text-xs">console.cloud.google.com/apis/credentials</span> e crie (ou
                selecione) um projeto.
              </li>
              <li>
                Em "Tela de consentimento OAuth", configure como app externo em modo "Teste" e adicione as contas
                Google dos canais que voce vai conectar como "Usuarios de teste".
              </li>
              <li>
                Ative as APIs "YouTube Data API v3" e "YouTube Analytics API" em "APIs e servicos &gt; Biblioteca".
              </li>
              <li>
                Em "Credenciais", clique "Criar credenciais &gt; ID do cliente OAuth", tipo{" "}
                <strong>"App para computador"</strong>.
              </li>
              <li>Copie o Client ID e o Client Secret gerados e cole abaixo.</li>
            </ol>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <input
              className="rounded-md border border-border bg-transparent px-3 py-2 text-sm"
              placeholder="Client ID"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
            />
            <input
              className="rounded-md border border-border bg-transparent px-3 py-2 text-sm"
              placeholder={config?.hasClientSecret ? "Client Secret (preenchido, digite para trocar)" : "Client Secret"}
              type="password"
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
            />
            <Button disabled={saving || !clientId || !clientSecret} onClick={handleSave}>
              {saving ? "Salvando..." : "Salvar credenciais"}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            O Client Secret fica cifrado em disco (AES-256-GCM), nunca e enviado de volta pra tela depois de salvo.
            Essas credenciais nao fazem upload, nao postam nada e so leem dados do canal que voce mesmo autorizar
            tela a tela com o Google — monitoramento de monetizacao e de strikes nao existe em nenhuma API publica
            do YouTube, entao isso nao aparece aqui.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
