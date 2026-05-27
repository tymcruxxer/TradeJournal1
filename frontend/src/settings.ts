export type AppSettings = {
  autoSync: boolean;
  syncInterval: number;
  defaultPeriod: number;
};

const DEFAULT_SETTINGS: AppSettings = {
  autoSync: true,
  syncInterval: 60000, // 60s
  defaultPeriod: 30,
};

export const getSettings = (): AppSettings => {
  const raw = localStorage.getItem("app_settings");
  return raw ? JSON.parse(raw) : DEFAULT_SETTINGS;
};

export const saveSettings = (settings: AppSettings) => {
  localStorage.setItem("app_settings", JSON.stringify(settings));
};