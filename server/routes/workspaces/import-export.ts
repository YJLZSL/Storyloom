import type { FastifyPluginAsync } from 'fastify';
import { eq } from 'drizzle-orm';
import { workspaces } from '../../db/schema.js';
import { idParam } from '../../lib/validation.js';
import { exportWorkspaceToWebGAL } from '../../services/exporters/webgal.js';
import type { ExportData } from '../../../shared/types.js';
import { ZipArchive } from 'archiver';
import path from 'path';
import fs from 'fs';
import { DATA_DIR } from '../../db/index.js';
import { collectExportData } from './helpers-collect.js';
import { importWorkspaceData } from './helpers-import.js';
import { buildPreviewScript } from './helpers-preview.js';

export const importExportRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Params: { id: string }; Querystring: { format?: string } }>('/:id/export', async (request, reply) => {
    const { id } = request.params;
    const format = request.query.format || 'json';

    const ws = app.db.select().from(workspaces).where(eq(workspaces.id, id)).get();
    if (!ws) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: '工作区不存在' } });
    }

    const allData = collectExportData(app, id, ws);

    if (format === 'zip') {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const safeName = ws.name.replace(/[^a-zA-Z0-9\u4e00-\u9fff_-]/g, '_');
      const zipName = `storyloom_export_${safeName}_${timestamp}.zip`;

      reply.header('Content-Type', 'application/zip');
      reply.header('Content-Disposition', `attachment; filename="${zipName}"`);

      const archive = new ZipArchive({ zlib: { level: 9 } });

      archive.append(JSON.stringify(allData.workspace, null, 2), { name: 'workspace.json' });
      archive.append(JSON.stringify(allData.events, null, 2), { name: 'events.json' });
      archive.append(JSON.stringify(allData.tracks, null, 2), { name: 'tracks.json' });
      archive.append(JSON.stringify(allData.characters, null, 2), { name: 'characters.json' });
      archive.append(JSON.stringify(allData.eventCharacters, null, 2), { name: 'event-characters.json' });
      archive.append(JSON.stringify(allData.eventWorldSettings, null, 2), { name: 'event-world-settings.json' });
      archive.append(JSON.stringify(allData.connections, null, 2), { name: 'connections.json' });
      archive.append(JSON.stringify(allData.foreshadowings, null, 2), { name: 'foreshadowings.json' });
      archive.append(JSON.stringify(allData.worldSettings, null, 2), { name: 'world-settings.json' });
      archive.append(JSON.stringify(allData.outlineVersions, null, 2), { name: 'outline-versions.json' });
      archive.append(JSON.stringify(allData.scenes, null, 2), { name: 'scenes.json' });
      archive.append(JSON.stringify(allData.beats, null, 2), { name: 'beats.json' });
      archive.append(JSON.stringify(allData.choices, null, 2), { name: 'choices.json' });
      archive.append(JSON.stringify(allData.flags, null, 2), { name: 'flags.json' });
      archive.append(JSON.stringify(allData.maps, null, 2), { name: 'maps.json' });
      archive.append(JSON.stringify(allData.assets, null, 2), { name: 'assets.json' });
      archive.append(JSON.stringify(allData.characterAssets, null, 2), { name: 'character-assets.json' });
      archive.append(JSON.stringify(allData.eventAssets, null, 2), { name: 'event-assets.json' });
      archive.append(JSON.stringify(allData.sceneAssets, null, 2), { name: 'scene-assets.json' });

      const readme = `Storyloom Export\n================\nExported: ${new Date().toISOString()}\nWorkspace: ${ws.name}\nVersion: ${allData.events.length} events, ${allData.scenes.length} scenes, ${allData.beats.length} beats\n`;
      archive.append(readme, { name: 'README.md' });

      const assetsDir = path.join(DATA_DIR, 'assets', id);
      if (fs.existsSync(assetsDir)) {
        archive.directory(assetsDir, 'assets');
      }

      archive.finalize();
      return reply.send(archive);
    }

    const exportData: ExportData = {
      version: '4.0',
      workspace: allData.workspace,
      events: allData.events,
      tracks: allData.tracks,
      characters: allData.characters,
      eventCharacters: allData.eventCharacters,
      eventWorldSettings: allData.eventWorldSettings,
      connections: allData.connections,
      foreshadowings: allData.foreshadowings,
      worldSettings: allData.worldSettings,
      outlineVersions: allData.outlineVersions,
      scenes: allData.scenes,
      beats: allData.beats,
      choices: allData.choices,
      flags: allData.flags,
      maps: allData.maps,
      assets: allData.assets,
      characterAssets: allData.characterAssets,
      eventAssets: allData.eventAssets,
      sceneAssets: allData.sceneAssets,
      exportedAt: Date.now(),
    };

    return { success: true, data: exportData };
  });

  app.post<{ Params: { id: string }; Body: ExportData; Querystring: { strategy?: string } }>('/:id/import', {
    schema: { params: idParam },
  }, async (request, reply) => {
    const { id } = request.params;
    const data = request.body;
    const strategy = (request.query.strategy || 'skip') as 'skip' | 'overwrite' | 'merge';

    const ws = app.db.select().from(workspaces).where(eq(workspaces.id, id)).get();
    if (!ws) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: '工作区不存在' } });
    }

    importWorkspaceData(app, id, data, strategy);

    return { success: true, data: { imported: true } };
  });

  app.get<{ Params: { id: string } }>('/:id/preview/script', {
    schema: { params: idParam },
  }, async (request, reply) => {
    const { id } = request.params;

    const ws = app.db.select({ id: workspaces.id }).from(workspaces).where(eq(workspaces.id, id)).get();
    if (!ws) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: '工作区不存在' } });
    }

    return buildPreviewScript(app, id);
  });

  app.post<{ Params: { id: string } }>('/:id/export/webgal', {
    schema: { params: idParam },
  }, async (request, reply) => {
    const { id } = request.params;

    const ws = app.db.select().from(workspaces).where(eq(workspaces.id, id)).get();
    if (!ws) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: '工作区不存在' } });
    }

    try {
      const { stream, fileName } = await exportWorkspaceToWebGAL(app, id);
      const encoded = encodeURIComponent(fileName);
      reply.header('Content-Type', 'application/zip');
      reply.header(
        'Content-Disposition',
        `attachment; filename="${encoded}"; filename*=UTF-8''${encoded}`,
      );
      return reply.send(stream);
    } catch (err) {
      const message = err instanceof Error ? err.message : '导出失败';
      return reply.status(500).send({ success: false, error: { code: 'EXPORT_FAILED', message } });
    }
  });
};
