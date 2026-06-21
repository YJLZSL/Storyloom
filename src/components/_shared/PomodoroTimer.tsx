import { useState, useEffect, useCallback } from 'react';
import { PlayIcon, PauseIcon, ResetIcon, FireIcon } from '@/lib/icons';

export function PomodoroTimer() {
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [mode, setMode] = useState<'work' | 'break' | 'longBreak'>('work');
  const [cycles, setCycles] = useState(0);
  const [mcTheme, setMcTheme] = useState(true);
  const [pulseBlock, setPulseBlock] = useState<number | null>(null);

  const totalTime = mode === 'work' ? 25 : mode === 'break' ? 5 : 15;

  useEffect(() => {
    setTimeLeft(totalTime * 60);
  }, [totalTime]);

  useEffect(() => {
    if (!isRunning) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsRunning(false);
          if (mode === 'work') {
            setCycles((c) => {
              const nextC = c + 1;
              setMode(nextC % 4 === 0 ? 'longBreak' : 'break');
              return nextC;
            });
          } else {
            setMode('work');
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isRunning, mode]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  const reset = useCallback(() => {
    setIsRunning(false);
    setTimeLeft(totalTime * 60);
  }, [totalTime]);

  const progress = ((totalTime * 60 - timeLeft) / (totalTime * 60)) * 100;

  const modeLabel = mode === 'work' ? '⛏ 专注' : mode === 'break' ? '🍞 休息' : '💤 长休';

  // MC 配色
  const mcColors = {
    grass: '#567d46',
    grassLight: '#6a9e52',
    dirt: '#7a5c3a',
    dirtDark: '#5d4037',
    stone: '#8a8a8a',
    stoneDark: '#636363',
    wood: '#a67c52',
    woodDark: '#7a5c3a',
    work: '#e53935',
    break: '#43a047',
    longBreak: '#1e88e5',
  };

  const mcBlockColor = mode === 'work' ? mcColors.work : mode === 'break' ? mcColors.break : mcColors.longBreak;

  const pixelBtn = {
    boxShadow: 'inset 2px 2px 0 rgba(255,255,255,0.4), inset -2px -2px 0 rgba(0,0,0,0.3), 2px 2px 0 rgba(0,0,0,0.2)',
  };
  const pixelBtnPressed = {
    boxShadow: 'inset 2px 2px 0 rgba(0,0,0,0.3), inset -2px -2px 0 rgba(255,255,255,0.2)',
  };

  if (mcTheme) {
    return (
      <div
        className="rounded-sm border-2 p-2.5 relative overflow-hidden select-none"
        style={{
          borderColor: mcColors.dirtDark,
          background: '#d4c4a8',
          imageRendering: 'pixelated',
          boxShadow: 'inset 0 0 0 2px rgba(255,255,255,0.15), 3px 3px 0 rgba(93,64,55,0.3)',
        }}
      >
        {/* 草方块顶部 */}
        <div
          className="absolute top-0 left-0 right-0 h-1.5"
          style={{
            background: `repeating-linear-gradient(90deg, ${mcColors.grass} 0px, ${mcColors.grass} 6px, ${mcColors.grassLight} 6px, ${mcColors.grassLight} 12px)`,
          }}
        />
        <div className="absolute top-1.5 left-0 right-0 h-0.5" style={{ background: mcColors.dirt }} />

        <div className="flex items-center gap-2 relative z-10 pt-1">
          {/* 大数字方块 */}
          <div className="relative shrink-0">
            <div
              className="w-9 h-9 flex items-center justify-center"
              style={{
                background: mcBlockColor,
                border: `2px solid ${mcColors.dirtDark}`,
                boxShadow: 'inset 2px 2px 0 rgba(255,255,255,0.35), inset -2px -2px 0 rgba(0,0,0,0.35), 2px 2px 0 rgba(0,0,0,0.25)',
              }}
            >
              <span className="text-xs font-bold text-white leading-none" style={{ textShadow: '1px 1px 0 rgba(0,0,0,0.5)' }}>
                {String(minutes).padStart(2, '0')}
              </span>
            </div>
          </div>

          {/* 时间 + 模式 */}
          <div className="flex flex-col items-start flex-1 min-w-0 overflow-hidden">
            <span className="text-sm font-bold tabular-nums leading-none" style={{ color: mcColors.dirtDark }}>
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </span>
            <div className="flex items-center gap-1 mt-0.5">
              <span
                className="text-[10px] font-bold px-1 py-0.5 rounded-sm leading-none"
                style={{ background: mcBlockColor, color: '#fff', border: `1px solid ${mcColors.dirtDark}` }}
              >
                {modeLabel}
              </span>
              <span className="text-[10px] font-bold" style={{ color: mcColors.dirtDark }}>×{cycles}</span>
            </div>
          </div>

          {/* 控制按钮 */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              className="flex size-7 items-center justify-center transition-all active:translate-y-0.5"
              style={{ ...pixelBtn, background: isRunning ? mcColors.work : mcColors.grassLight, border: `2px solid ${mcColors.dirtDark}` }}
              onMouseDown={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = pixelBtnPressed.boxShadow; }}
              onMouseUp={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = pixelBtn.boxShadow; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = pixelBtn.boxShadow; }}
              onClick={() => setIsRunning(!isRunning)}
              title={isRunning ? '暂停' : '开始'}
            >
              <span className="text-white" style={{ filter: 'drop-shadow(1px 1px 0 rgba(0,0,0,0.3))' }}>
                {isRunning ? <PauseIcon size={12} /> : <PlayIcon size={12} />}
              </span>
            </button>
            <button
              className="flex size-7 items-center justify-center transition-all active:translate-y-0.5"
              style={{ ...pixelBtn, background: mcColors.stone, border: `2px solid ${mcColors.stoneDark}` }}
              onMouseDown={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = pixelBtnPressed.boxShadow; }}
              onMouseUp={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = pixelBtn.boxShadow; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = pixelBtn.boxShadow; }}
              onClick={reset}
              title="重置"
            >
              <span className="text-white" style={{ filter: 'drop-shadow(1px 1px 0 rgba(0,0,0,0.3))' }}>
                <ResetIcon size={12} />
              </span>
            </button>
            <button
              className="flex size-7 items-center justify-center transition-all active:translate-y-0.5"
              style={{ ...pixelBtn, background: mcColors.wood, border: `2px solid ${mcColors.woodDark}` }}
              onMouseDown={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = pixelBtnPressed.boxShadow; }}
              onMouseUp={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = pixelBtn.boxShadow; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = pixelBtn.boxShadow; }}
              onClick={() => setMcTheme(false)}
              title="切换简约"
            >
              <span className="text-white" style={{ filter: 'drop-shadow(1px 1px 0 rgba(0,0,0,0.3))' }}>
                <FireIcon size={12} />
              </span>
            </button>
          </div>
        </div>

        {/* 经验条 */}
        <div className="mt-2 flex gap-px h-3">
          {Array.from({ length: 20 }).map((_, i) => {
            const blockProgress = (i + 1) * 5;
            const isFilled = progress >= blockProgress - 2.5;
            const isPulsing = pulseBlock === i && isRunning;
            return (
              <div
                key={i}
                className="flex-1 transition-all duration-200"
                style={{
                  background: isFilled ? (isPulsing ? '#ffeb3b' : mcBlockColor) : mcColors.stone,
                  border: `1px solid ${mcColors.dirtDark}`,
                  boxShadow: isFilled ? 'inset 1px 1px 0 rgba(255,255,255,0.4), inset -1px -1px 0 rgba(0,0,0,0.3)' : 'inset 1px 1px 0 rgba(0,0,0,0.2)',
                  imageRendering: 'pixelated',
                  opacity: isFilled ? 1 : 0.5,
                }}
                onMouseEnter={() => setPulseBlock(i)}
                onMouseLeave={() => setPulseBlock(null)}
              />
            );
          })}
        </div>

        {/* 底部泥土 */}
        <div className="absolute bottom-0 left-0 right-0 h-1" style={{ background: `repeating-linear-gradient(90deg, ${mcColors.dirt} 0px, ${mcColors.dirt} 4px, ${mcColors.dirtDark} 4px, ${mcColors.dirtDark} 8px)` }} />
      </div>
    );
  }

  // 简约风格
  return (
    <div className="flex items-center gap-2 transition-all" title={`已完成 ${cycles} 个番茄钟`}>
      <div className="relative flex items-center justify-center shrink-0">
        <svg width="32" height="32" viewBox="0 0 32 32" className="-rotate-90">
          <circle cx="16" cy="16" r="13" fill="none" stroke="rgba(var(--muted-foreground), 0.15)" strokeWidth="2.5" />
          <circle cx="16" cy="16" r="13" fill="none" stroke={mode === 'work' ? '#e53935' : mode === 'break' ? '#43a047' : '#1e88e5'} strokeWidth="2.5" strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 13}`} strokeDashoffset={`${2 * Math.PI * 13 * (1 - progress / 100)}`} className="transition-all duration-1000" />
        </svg>
        <div className="absolute text-[10px] font-bold tabular-nums" style={{ color: mode === 'work' ? '#e53935' : mode === 'break' ? '#43a047' : '#1e88e5' }}>{minutes}</div>
      </div>
      <div className="flex flex-col items-start flex-1 min-w-0">
        <span className="text-sm font-mono font-semibold tabular-nums leading-none">{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}</span>
        <span className="text-[10px] text-muted-foreground/60 mt-0.5">{mode === 'work' ? '专注中' : mode === 'break' ? '休息中' : '长休'} · {cycles} 个周期</span>
      </div>
      <div className="flex items-center gap-0.5 shrink-0">
        <button className="flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-all hover:bg-muted/80 hover:text-foreground active:scale-90" onClick={() => setIsRunning(!isRunning)} title={isRunning ? '暂停' : '开始'}>
          {isRunning ? <PauseIcon size={14} /> : <PlayIcon size={14} />}
        </button>
        <button className="flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-all hover:bg-muted/80 hover:text-foreground active:scale-90" onClick={reset} title="重置">
          <ResetIcon size={14} />
        </button>
        <button className="flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-all hover:bg-muted/80 hover:text-foreground active:scale-90" onClick={() => setMcTheme(true)} title="MC主题">
          <FireIcon size={14} />
        </button>
      </div>
    </div>
  );
}
