/** Nomes de canal IPC compartilhados entre main, preload e renderer. */
export const IpcChannels = {
  profiles: {
    list: "profiles:list",
    create: "profiles:create",
    update: "profiles:update",
    delete: "profiles:delete",
    open: "profiles:open",
    openYoutubeStudio: "profiles:openYoutubeStudio",
  },
  proxies: {
    list: "proxies:list",
    create: "proxies:create",
    update: "proxies:update",
    delete: "proxies:delete",
    test: "proxies:test",
    rotateIp: "proxies:rotateIp",
  },
  settings: {
    getGoogleOAuthConfig: "settings:getGoogleOAuthConfig",
    setGoogleOAuthConfig: "settings:setGoogleOAuthConfig",
  },
  youtube: {
    connect: "youtube:connect",
    disconnect: "youtube:disconnect",
    getAccount: "youtube:getAccount",
    refreshStats: "youtube:refreshStats",
  },
} as const;
