import { contextBridge, ipcRenderer } from "electron";
import { IpcChannels } from "@tubeanty/shared";
import type { LaunchResult, Profile, ProfileInput, Proxy, ProxyInput, ProxyTestResult } from "@tubeanty/shared";

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
};

export type TubeAntyApi = typeof api;

contextBridge.exposeInMainWorld("api", api);
