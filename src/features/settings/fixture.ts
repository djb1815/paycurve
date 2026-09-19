import type { SettingsPanelProps } from './SettingsPanel';

export const settingsFixture: Pick<
  SettingsPanelProps,
  'taxYearLabel' | 'theme' | 'storageStatus'
> = {
  taxYearLabel: '2026/27',
  theme: 'system',
  storageStatus: 'Saved locally',
};
