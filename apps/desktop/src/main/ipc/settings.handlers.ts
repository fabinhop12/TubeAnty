import { ipcMain } from "electron";
import { IpcChannels } from "@tubeanty/shared";
import type { GoogleOAuthConfig, GoogleOAuthConfigInput } from "@tubeanty/shared";
import { getGoogleOAuthConfig, setGoogleOAuthConfig } from "../db/settings";

export function registerSettingsHandlers(): void {
  ipcMain.handle(IpcChannels.settings.getGoogleOAuthConfig, async (): Promise<GoogleOAuthConfig> => {
    const { clientId, clientSecret } = await getGoogleOAuthConfig();
    return { clientId: clientId ?? "", hasClientSecret: Boolean(clientSecret) };
  });

  ipcMain.handle(
    IpcChannels.settings.setGoogleOAuthConfig,
    async (_event, input: GoogleOAuthConfigInput): Promise<void> => {
      await setGoogleOAuthConfig(input.clientId, input.clientSecret);
    },
  );
}
