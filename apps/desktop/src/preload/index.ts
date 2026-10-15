import { contextBridge, ipcRenderer } from "electron";
import { IpcChannels } from "@tubeanty/shared";
import type {
  GoogleOAuthConfig,
  GoogleOAuthConfigInput,
  LaunchResult,
  Profile,
  ProfileInput,
  Proxy,
  ProxyInput,
  ProxyTestResult,
  YoutubeAccount,
  YoutubeConnectResult,
} from "@tubeanty/shared";

const api = {
  profiles: {
    list: (): Promise<Profile[]> => ipcRenderer.invoke(IpcChannels.profiles.list),
    create: (input: ProfileInput): Promise<Profile> => ipcRenderer.invoke(IpcChannels.profiles.create, input),
    update: (id: string, input: Partial<ProfileInput>): Promise<Profile> =>
      ipcRenderer.invoke(IpcChannels.profiles.update, id, input),
    delete: (id: string): Promise<void> => ipcRenderer.invoke(IpcChannels.profiles.delete, id),
    open: (id: string): Promise<LaunchResult> => ipcRenderer.invoke(IpcChannels.profiles.open, id),
    openYoutubeStudio: (id: string): Promise<LaunchResult> =>
      ipcRenderer.invoke(IpcChannels.profiles.openYoutubeStudio, id),
  },
  proxies: {
    list: (): Promise<Proxy[]> => ipcRenderer.invoke(IpcChannels.proxies.list),
    create: (input: ProxyInput): Promise<Proxy> => ipcRenderer.invoke(IpcChannels.proxies.create, input),
    update: (id: string, input: Partial<ProxyInput>): Promise<Proxy> =>
      ipcRenderer.invoke(IpcChannels.proxies.update, id, input),
    delete: (id: string): Promise<void> => ipcRenderer.invoke(IpcChannels.proxies.delete, id),
    test: (id: string | null, input: ProxyInput): Promise<ProxyTestResult> =>
      ipcRenderer.invoke(IpcChannels.proxies.test, id, input),
    rotateIp: (id: string): Promise<{ ok: boolean; error?: string }> =>
      ipcRenderer.invoke(IpcChannels.proxies.rotateIp, id),
  },
  settings: {
    getGoogleOAuthConfig: (): Promise<GoogleOAuthConfig> =>
      ipcRenderer.invoke(IpcChannels.settings.getGoogleOAuthConfig),
    setGoogleOAuthConfig: (input: GoogleOAuthConfigInput): Promise<void> =>
      ipcRenderer.invoke(IpcChannels.settings.setGoogleOAuthConfig, input),
  },
  youtube: {
    getAccount: (profileId: string): Promise<YoutubeAccount | null> =>
      ipcRenderer.invoke(IpcChannels.youtube.getAccount, profileId),
    connect: (profileId: string): Promise<YoutubeConnectResult> =>
      ipcRenderer.invoke(IpcChannels.youtube.connect, profileId),
    disconnect: (profileId: string): Promise<void> => ipcRenderer.invoke(IpcChannels.youtube.disconnect, profileId),
    refreshStats: (profileId: string): Promise<YoutubeConnectResult> =>
      ipcRenderer.invoke(IpcChannels.youtube.refreshStats, profileId),
  },
};

export type TubeAntyApi = typeof api;

contextBridge.exposeInMainWorld("api", api);
