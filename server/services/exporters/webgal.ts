import type { FastifyInstance } from 'fastify';
import { eq, inArray } from 'drizzle-orm';
import { existsSync, createReadStream } from 'fs';
import path from 'path';
import { ZipArchive } from 'archiver';
import {
  workspaces,
  scenes,
  beats,
  choices,
  flags,
  assets,
  characters,
} from '../../db/schema.js';

type Asset = typeof assets.$inferSelect;
type Scene = typeof scenes.$inferSelect;
type Beat = typeof beats.$inferSelect;
type Choice = typeof choices.$inferSelect;
type Character = typeof characters.$inferSelect;

interface ExportResult {
  stream: ZipArchive;
  fileName: string;
}

function getAssetsRootDir(): string {
  const dataDir = process.env.DATA_DIR || path.resolve(process.cwd(), 'data');
  return path.join(dataDir, 'assets');
}

function getAssetPhysicalPath(workspaceId: string, sha256: string): string {
  return path.join(getAssetsRootDir(), workspaceId, sha256.slice(0, 2), sha256);
}

function sanitizeFsName(name: string): string {
  const cleaned = (name || '').trim().replace(/[\\/:*?"<>|]+/g, '_').replace(/\s+/g, '_');
  return cleaned.length > 0 ? cleaned : 'unnamed';
}

function sanitizeWorkspaceNameForFile(name: string): string {
  const cleaned = (name || '').trim().replace(/[^a-zA-Z0-9\u4e00-\u9fff_-]/g, '_');
  return cleaned.length > 0 ? cleaned : 'workspace';
}

function formatTimestamp(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    d.getFullYear().toString() +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) +
    pad(d.getHours()) +
    pad(d.getMinutes()) +
    pad(d.getSeconds())
  );
}

function stripNewlines(s: string): string {
  return (s || '').replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim();
}

function safeJsonParse<T = Record<string, unknown>>(raw: unknown, fallback: T): T {
  if (raw == null) return fallback;
  if (typeof raw !== 'string') return fallback;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as T) : fallback;
  } catch {
    return fallback;
  }
}

function pickAssetBaseName(asset: Asset | undefined): string | null {
  if (!asset) return null;
  const fname = asset.fileName || asset.sha256;
  return path.basename(fname);
}

function resolveBgmFileName(scene: Scene, assetMap: Map<string, Asset>): string | null {
  if (!scene.bgm) return null;
  // bgm 字段可能存放 assetId 或文件名；先尝试当 assetId 查
  const asset = assetMap.get(scene.bgm);
  if (asset) return pickAssetBaseName(asset);
  return path.basename(scene.bgm);
}

export async function exportWorkspaceToWebGAL(
  app: FastifyInstance,
  workspaceId: string,
): Promise<ExportResult> {
  const db = app.db;

  const workspace = db.select().from(workspaces).where(eq(workspaces.id, workspaceId)).get();
  if (!workspace) {
    throw new Error('工作区不存在');
  }

  // 1) 加载 IR
  const allScenes = db
    .select()
    .from(scenes)
    .where(eq(scenes.workspaceId, workspaceId))
    .orderBy(scenes.sceneOrder)
    .all();

  const sceneIds = allScenes.map((s) => s.id);
  const allBeats: Beat[] = sceneIds.length
    ? db.select().from(beats).where(inArray(beats.sceneId, sceneIds)).orderBy(beats.beatOrder).all()
    : [];

  const beatIds = allBeats.map((b) => b.id);
  const allChoices: Choice[] = beatIds.length
    ? db.select().from(choices).where(inArray(choices.beatId, beatIds)).orderBy(choices.choiceOrder).all()
    : [];

  const allFlags = db.select().from(flags).where(eq(flags.workspaceId, workspaceId)).all();

  const allCharacters: Character[] = db
    .select()
    .from(characters)
    .where(eq(characters.workspaceId, workspaceId))
    .all();
  const characterMap = new Map<string, Character>();
  for (const ch of allCharacters) characterMap.set(ch.id, ch);

  // 2) 收集所有引用资产 ID（含 bgm 字段中可能的 assetId）
  const referencedAssetIds = new Set<string>();
  for (const sc of allScenes) {
    if (sc.backgroundAssetId) referencedAssetIds.add(sc.backgroundAssetId);
    if (sc.bgm) referencedAssetIds.add(sc.bgm);
  }
  for (const b of allBeats) {
    if (b.portraitAssetId) referencedAssetIds.add(b.portraitAssetId);
  }

  const assetMap = new Map<string, Asset>();
  if (referencedAssetIds.size > 0) {
    const assetRows = db
      .select()
      .from(assets)
      .where(inArray(assets.id, Array.from(referencedAssetIds)))
      .all();
    for (const a of assetRows) assetMap.set(a.id, a);
  }

  // 同 scene 内 sceneName -> .txt 映射；为避免重名，附加序号
  const sceneFileBaseById = new Map<string, string>();
  const usedNames = new Set<string>();
  for (const sc of allScenes) {
    let base = sanitizeFsName(sc.name);
    let candidate = base;
    let n = 2;
    while (usedNames.has(candidate.toLowerCase())) {
      candidate = `${base}_${n++}`;
    }
    usedNames.add(candidate.toLowerCase());
    sceneFileBaseById.set(sc.id, candidate);
  }

  // 3) 创建 archive
  const archive = new ZipArchive({ zlib: { level: 9 } });

  // 4) 翻译 + 写入场景文件
  // group beats by scene
  const beatsByScene = new Map<string, Beat[]>();
  for (const b of allBeats) {
    const list = beatsByScene.get(b.sceneId) || [];
    list.push(b);
    beatsByScene.set(b.sceneId, list);
  }
  // group choices by beat
  const choicesByBeat = new Map<string, Choice[]>();
  for (const c of allChoices) {
    const list = choicesByBeat.get(c.beatId) || [];
    list.push(c);
    choicesByBeat.set(c.beatId, list);
  }

  // entry: start.txt 串联第一个 scene
  if (allScenes.length > 0) {
    const firstBase = sceneFileBaseById.get(allScenes[0].id)!;
    const startContent = `changeScene:${firstBase}.txt;\n`;
    archive.append(startContent, { name: 'game/scene/start.txt' });
  } else {
    archive.append(';\n', { name: 'game/scene/start.txt' });
  }

  for (const scene of allScenes) {
    const lines: string[] = [];

    // 4.1 scene 头：changeBg + bgm
    const bgAsset = scene.backgroundAssetId ? assetMap.get(scene.backgroundAssetId) : undefined;
    const bgFileName = pickAssetBaseName(bgAsset);
    if (bgFileName) {
      lines.push(`changeBg:${bgFileName} -next;`);
    }
    const bgmFileName = resolveBgmFileName(scene, assetMap);
    if (bgmFileName) {
      lines.push(`bgm:${bgmFileName};`);
    }

    // 4.2 翻译 beats
    const sceneBeats = beatsByScene.get(scene.id) || [];
    let lastPortraitByPosition = new Map<string, string>(); // position -> assetId

    for (const beat of sceneBeats) {
      const meta = safeJsonParse<Record<string, unknown>>(beat.metadataJson, {});
      const position =
        typeof meta.position === 'string' && meta.position.length > 0
          ? (meta.position as string)
          : 'left';

      // 立绘变化检测
      if (beat.portraitAssetId) {
        const prev = lastPortraitByPosition.get(position);
        if (prev !== beat.portraitAssetId) {
          const portraitAsset = assetMap.get(beat.portraitAssetId);
          const portraitFile = pickAssetBaseName(portraitAsset);
          if (portraitFile) {
            lines.push(`changeFigure:${portraitFile} -${position} -next;`);
            lastPortraitByPosition.set(position, beat.portraitAssetId);
          }
        }
      }

      switch (beat.kind) {
        case 'line': {
          const text = stripNewlines(beat.text || '');
          if (beat.characterId) {
            const ch = characterMap.get(beat.characterId);
            const charName = ch ? ch.name : '';
            lines.push(`${charName}:${text};`);
          } else {
            lines.push(`:${text};`);
          }
          break;
        }
        case 'jump': {
          const targetSceneId =
            typeof meta.targetSceneId === 'string' ? (meta.targetSceneId as string) : '';
          const targetBase = targetSceneId ? sceneFileBaseById.get(targetSceneId) : undefined;
          if (targetBase) {
            lines.push(`changeScene:${targetBase}.txt;`);
          }
          break;
        }
        case 'sfx': {
          // 优先走 portraitAssetId 不合理；改从 metadata.assetId 或 text 当文件名
          const sfxAssetId =
            typeof meta.assetId === 'string' ? (meta.assetId as string) : '';
          let sfxFile: string | null = null;
          if (sfxAssetId) {
            const sfxAsset = assetMap.get(sfxAssetId);
            sfxFile = pickAssetBaseName(sfxAsset);
            if (!sfxFile && sfxAsset == null) {
              // 资产未在 referencedAssetIds 中，回退 fetch
              const a = db.select().from(assets).where(eq(assets.id, sfxAssetId)).get();
              if (a) {
                assetMap.set(a.id, a);
                referencedAssetIds.add(a.id);
                sfxFile = pickAssetBaseName(a);
              }
            }
          }
          if (!sfxFile && beat.text) sfxFile = path.basename(beat.text);
          if (sfxFile) {
            lines.push(`playEffect:${sfxFile};`);
          }
          break;
        }
        case 'anim': {
          const animKey =
            typeof meta.animKey === 'string' && (meta.animKey as string).length > 0
              ? (meta.animKey as string)
              : stripNewlines(beat.text || '');
          if (animKey) {
            lines.push(`setAnimation:${animKey} -target=fig-${position};`);
          }
          break;
        }
        case 'choice': {
          const beatChoices = choicesByBeat.get(beat.id) || [];
          if (beatChoices.length > 0) {
            const parts = beatChoices.map((c) => {
              const label = stripNewlines(c.label || '');
              const nextBase = c.nextSceneId
                ? sceneFileBaseById.get(c.nextSceneId)
                : undefined;
              return `${label}:${nextBase ? `${nextBase}.txt` : ''}`;
            });
            lines.push(`choose:${parts.join('|')};`);
          }
          break;
        }
        default:
          // 未知 kind 跳过
          break;
      }
    }

    const sceneBase = sceneFileBaseById.get(scene.id)!;
    const fileContent = lines.join('\n') + (lines.length ? '\n' : '');
    archive.append(fileContent, { name: `game/scene/${sceneBase}.txt` });
  }

  // 5) 写入资产文件
  // 重新解析（包括 sfx 触发追加的 assetId）
  for (const assetId of referencedAssetIds) {
    const asset = assetMap.get(assetId);
    if (!asset) continue;
    const physical = getAssetPhysicalPath(asset.workspaceId, asset.sha256);
    if (!existsSync(physical)) continue;

    const base = pickAssetBaseName(asset);
    if (!base) continue;

    let zipPath: string;
    const role = (safeJsonParse<Record<string, unknown>>(asset.metadataJson, {}).role as string) || '';

    switch (asset.kind) {
      case 'background':
        zipPath = `game/background/${base}`;
        break;
      case 'portrait':
      case 'avatar':
        zipPath = `game/figure/${base}`;
        break;
      case 'bgm':
        zipPath = `game/bgm/${base}`;
        break;
      case 'sfx':
        zipPath = `game/vocal/${base}`;
        break;
      default: {
        // 兜底：scene/map 等按 background 处理；不识别的按 figure
        if (role === 'background') zipPath = `game/background/${base}`;
        else if (role === 'bgm') zipPath = `game/bgm/${base}`;
        else if (role === 'sfx') zipPath = `game/vocal/${base}`;
        else zipPath = `game/figure/${base}`;
        break;
      }
    }

    archive.append(createReadStream(physical), { name: zipPath });
  }

  // 6) README
  const exportedAt = new Date();
  const readmeLines = [
    'Storyloom WebGAL Export',
    '=======================',
    `Exporter Version: 1.3`,
    `Exported At: ${exportedAt.toISOString()}`,
    `Workspace: ${workspace.name}`,
    `Workspace ID: ${workspace.id}`,
    `Scenes: ${allScenes.length}`,
    `Beats: ${allBeats.length}`,
    `Choices: ${allChoices.length}`,
    `Flags: ${allFlags.length}`,
    '',
    '把整个 zip 解压到 WebGAL 编辑器的项目目录后即可加载。',
  ];
  archive.append(readmeLines.join('\n') + '\n', { name: 'README-storyloom.txt' });

  archive.finalize();

  const fileName = `storyloom_webgal_${sanitizeWorkspaceNameForFile(workspace.name)}_${formatTimestamp(exportedAt)}.zip`;
  return { stream: archive, fileName };
}
