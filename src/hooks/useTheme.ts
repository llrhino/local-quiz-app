import { useEffect } from 'react';

import { useAppSettingsStore } from '../stores/appSettingsStore';

/**
 * テーマの変更を監視し、html要素のクラスを切り替えるフック
 */
export function useTheme() {
  const theme = useAppSettingsStore((s) => s.theme);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);
}
