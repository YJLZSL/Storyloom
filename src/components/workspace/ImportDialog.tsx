import { useState, useRef, useEffect } from 'react';
import { X, Upload, Loader2, Check, FileJson, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useImportWorkspace } from '@/services/api-hooks.js';
import type { ExportData } from '../../../shared/types.js';

interface ImportDialogProps {
  open: boolean;
  onClose: () => void;
  workspaceId: string | null;
  onImported?: () => void;
}

type ConflictStrategy = 'overwrite' | 'merge' | 'skip';

interface ParsedFile {
  name: string;
  data: ExportData;
  size: number;
}

export function ImportDialog({ open, onClose, workspaceId, onImported }: ImportDialogProps) {
  const importWorkspace = useImportWorkspace();
  const [strategy, setStrategy] = useState<ConflictStrategy>('skip');
  const [parsedFile, setParsedFile] = useState<ParsedFile | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 重置状态
  useEffect(() => {
    if (!open) {
      setParsedFile(null);
      setParseError(null);
      setSuccess(false);
      setStrategy('skip');
      importWorkspace.reset();
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setParseError(null);
    setParsedFile(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const data = JSON.parse(content) as ExportData;

        // 基本校验
        if (!data.version || !data.workspace) {
          setParseError('文件格式不正确：缺少 version 或 workspace 字段');
          return;
        }

        setParsedFile({ name: file.name, data, size: file.size });
      } catch {
        setParseError('无法解析 JSON 文件，请检查文件内容');
      }
    };
    reader.onerror = () => {
      setParseError('读取文件失败');
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!parsedFile || !workspaceId) return;
    try {
      await importWorkspace.mutateAsync({
        workspaceId,
        data: parsedFile.data,
        strategy,
      });
      setSuccess(true);
      onImported?.();
    } catch {
      // 错误由 mutation 状态处理
    }
  };

  if (!open) return null;

  // 统计待导入数据规模
  const stats = parsedFile ? [
    { label: '事件', count: parsedFile.data.events?.length ?? 0 },
    { label: '轨道', count: parsedFile.data.tracks?.length ?? 0 },
    { label: '角色', count: parsedFile.data.characters?.length ?? 0 },
    { label: '关联', count: parsedFile.data.connections?.length ?? 0 },
    { label: '伏笔', count: parsedFile.data.foreshadowings?.length ?? 0 },
    { label: '世界观', count: parsedFile.data.worldSettings?.length ?? 0 },
  ] : [];

  const strategyOptions: Array<{ value: ConflictStrategy; label: string; desc: string }> = [
    { value: 'skip', label: '跳过', desc: '保留已有数据，跳过冲突项' },
    { value: 'merge', label: '合并', desc: '追加新数据，保留已有数据' },
    { value: 'overwrite', label: '覆盖', desc: '用导入数据替换冲突项' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div
        className="p-[1px] rounded-xl"
        style={{
          background: 'linear-gradient(135deg, hsl(var(--primary) / 0.5) 0%, hsl(var(--border)) 50%, hsl(var(--primary) / 0.3) 100%)',
        }}
      >
        <motion.div
          className="bg-card rounded-xl w-full max-w-md mx-4 p-6 max-h-[90vh] overflow-auto"
          style={{ boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-xl font-semibold flex items-center gap-2">
              <FileJson className="w-5 h-5" />
              导入工作区
            </h2>
            <button onClick={onClose} className="p-1.5 rounded-md hover:bg-accent transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {success ? (
            <div className="flex flex-col items-center justify-center py-8">
              <motion.div
                className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4"
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: [0, 1.2, 1], rotate: [-180, 0] }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              >
                <Check className="w-7 h-7 text-primary" />
              </motion.div>
              <p className="text-lg font-medium text-foreground mb-2">导入成功</p>
              <p className="text-sm text-muted-foreground mb-4">数据已导入到当前工作区</p>
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
              >
                完成
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* 文件选择区域 */}
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/json,.json"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full p-6 rounded-md border-2 border-dashed border-border hover:border-primary/50 hover:bg-accent/30 transition-colors flex flex-col items-center gap-2"
                >
                  <Upload className="w-8 h-8 text-muted-foreground" />
                  <span className="text-sm font-medium">点击选择 JSON 文件</span>
                  <span className="text-xs text-muted-foreground">支持 v4.0 格式的工作区导出文件</span>
                </button>
              </div>

              {/* 文件解析错误 */}
              {parseError && (
                <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/20 text-sm text-destructive">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{parseError}</span>
                </div>
              )}

              {/* 已选文件信息 */}
              {parsedFile && (
                <div className="p-3 rounded-md bg-muted/50 space-y-3">
                  <div className="flex items-center gap-2">
                    <FileJson className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium truncate flex-1">{parsedFile.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {(parsedFile.size / 1024).toFixed(1)} KB
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {stats.map((s) => (
                      <div key={s.label} className="text-center p-1.5 rounded bg-background/50">
                        <div className="text-sm font-semibold text-foreground">{s.count}</div>
                        <div className="text-[10px] text-muted-foreground">{s.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 冲突处理策略 */}
              {parsedFile && (
                <div>
                  <label className="block text-sm font-medium mb-2">冲突处理策略</label>
                  <div className="space-y-2">
                    {strategyOptions.map((opt) => (
                      <label
                        key={opt.value}
                        className={`flex items-start gap-2 p-2.5 rounded-md border cursor-pointer transition-colors ${
                          strategy === opt.value
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:bg-accent/30'
                        }`}
                      >
                        <input
                          type="radio"
                          name="strategy"
                          value={opt.value}
                          checked={strategy === opt.value}
                          onChange={(e) => setStrategy(e.target.value as ConflictStrategy)}
                          className="mt-0.5"
                        />
                        <div className="flex-1">
                          <div className="text-sm font-medium">{opt.label}</div>
                          <div className="text-xs text-muted-foreground">{opt.desc}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* 导入错误 */}
              {importWorkspace.isError && (
                <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/20 text-sm text-destructive">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>导入失败：{importWorkspace.error?.message || '未知错误'}</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-md border border-border text-sm hover:bg-accent transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleImport}
                  disabled={!parsedFile || importWorkspace.isPending || !workspaceId}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {importWorkspace.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      导入中...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      导入
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
