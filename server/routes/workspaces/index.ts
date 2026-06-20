import type { FastifyPluginAsync } from 'fastify';
import { crudRoutes } from './crud.js';
import { importExportRoutes } from './import-export.js';
import { autoSavesRoutes } from './auto-saves.js';

export const workspacesRoutes: FastifyPluginAsync = async (app) => {
  await app.register(crudRoutes);
  await app.register(importExportRoutes);
  await app.register(autoSavesRoutes);
};

export default workspacesRoutes;
