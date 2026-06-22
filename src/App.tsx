import { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { WorkspaceInitializer } from '@/components/workspace/WorkspaceInitializer';
import { UpdateNotifier } from '@/components/system/UpdateNotifier';
import { RenderLayer } from '@/components/_shared/RenderLayer';
import { LoomSplash } from '@/components/splash/LoomSplash';
import { PageTransition } from '@/components/transition/PageTransition';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useAnimationCleanup } from '@/animation/AnimationEngine';
import { isTauri, getServerPort, onServerPort } from '@/lib/tauri-api';
import { setApiBase } from '@/services/api';
import { ConfirmDialogProvider } from '@/components/_shared/ConfirmDialog';

function App() {
  const fontFamily = useSettingsStore((s) => s.fontFamily);
  const [booting, setBooting] = useState(isTauri());

  // 组件卸载时自动清理所有 GSAP 动画与 ScrollTrigger 实例
  useAnimationCleanup();

  useEffect(() => {
    document.documentElement.setAttribute('data-font', fontFamily);
  }, [fontFamily]);

  // Tauri 环境下：监听 server-port 事件，获取后端端口
  useEffect(() => {
    if (!isTauri()) {
      setBooting(false);
      return;
    }

    // 尝试立即获取端口
    getServerPort()
      .then((port) => {
        setApiBase(port);
        setBooting(false);
      })
      .catch(() => {
        // 如果立即获取失败，监听事件
        const off = onServerPort((port) => {
          setApiBase(port);
          setBooting(false);
        });
        // 5 秒后超时，最后一次重试获取端口
        const timer = setTimeout(() => {
          getServerPort()
            .then((port) => { setApiBase(port); setBooting(false); })
            .catch(() => setBooting(false));
        }, 5000);
        return () => {
          off();
          clearTimeout(timer);
        };
      });
  }, []);

  return (
    <>
      {/* 启动遮罩：使用 LoomSplash 替代原有的简单 spinner，提供主题感知动画 */}
      <LoomSplash visible={booting} />

      {/* 渲染层：统一入口，根据主题配置自动选择渲染方式（默认 Canvas 2D 粒子） */}
      <RenderLayer />

      {!booting && (
        <ConfirmDialogProvider>
          <WorkspaceInitializer />

          {/* 页面过渡包装：为 AppShell 提供统一的进入 / 退出动画 */}
          <PageTransition viewId="app-shell" preset="fade-slide">
            <AppShell />
          </PageTransition>

          <UpdateNotifier />
        </ConfirmDialogProvider>
      )}
    </>
  );
}

export default App;
