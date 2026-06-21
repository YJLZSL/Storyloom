import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider } from 'tdesign-react';
import 'tdesign-react/es/_util/react-19-adapter';
import { queryClient } from './lib/queryClient.js';
import './lib/i18n';
import App from './App.js';
import 'tdesign-react/es/style/index.css';
import './index.css';
import { TDesignThemeAdapter, getTDesignGlobalConfig } from './components/ui-tdesign/theme-adapter.js';
import { AppErrorBoundary } from './components/system/ErrorBoundary.js';

// 主题引导脚本：避免首屏闪烁
const savedTheme = localStorage.getItem('theme');
if (savedTheme) {
  document.documentElement.setAttribute('data-theme', savedTheme);
} else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
  document.documentElement.setAttribute('data-theme', 'dark');
}

const root = createRoot(document.getElementById('root')!);
root.render(
  <StrictMode>
    <ConfigProvider globalConfig={getTDesignGlobalConfig()}>
      <TDesignThemeAdapter>
        <QueryClientProvider client={queryClient}>
          <AppErrorBoundary>
            <App />
          </AppErrorBoundary>
        </QueryClientProvider>
      </TDesignThemeAdapter>
    </ConfigProvider>
  </StrictMode>
);
