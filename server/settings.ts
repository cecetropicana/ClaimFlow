interface AppSettings {
  useMockData: boolean;
}

class SettingsStore {
  private settings: AppSettings = {
    useMockData: true,
  };

  get(): AppSettings {
    return { ...this.settings };
  }

  update(updates: Partial<AppSettings>): AppSettings {
    this.settings = { ...this.settings, ...updates };
    return this.get();
  }

  isMockDataEnabled(): boolean {
    return this.settings.useMockData;
  }

  disableMockData(): void {
    this.settings.useMockData = false;
    console.log("[Settings] Mock data disabled - app will use connected data sources");
  }

  enableMockData(): void {
    this.settings.useMockData = true;
    console.log("[Settings] Mock data enabled");
  }
}

export const settingsStore = new SettingsStore();
