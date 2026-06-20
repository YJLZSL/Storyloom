import type { FastifyInstance, FastifyReply } from 'fastify';
import { eq, and, or, sql } from 'drizzle-orm';
import {
  workspaces,
  events,
  beats,
  scenes,
  characters,
  worldSettings,
  foreshadowings,
  outlineVersions,
} from '../db/schema.js';
import { searchQuery, replaceBody } from '../lib/validation.js';

type EntityType =
  | 'event'
  | 'beat'
  | 'outline'
  | 'character'
  | 'worldsetting'
  | 'foreshadowing'
  | 'scene';

const DEFAULT_SCOPES: EntityType[] = [
  'event',
  'beat',
  'outline',
  'character',
  'worldsetting',
  'foreshadowing',
  'scene',
];

interface SearchHit {
  entityType: EntityType;
  entityId: string;
  snippet: string;
  matchCount: number;
  title: string;
}

interface WillChangeItem {
  entityType: EntityType;
  entityId: string;
  oldText: string;
  newText: string;
  fieldName: string;
}

function escapeLike(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

function parseScope(scope: string | string[] | undefined): EntityType[] {
  if (!scope) return DEFAULT_SCOPES;
  const raw = Array.isArray(scope) ? scope : scope.split(',');
  const valid = new Set(DEFAULT_SCOPES);
  const list = raw
    .map((s) => s.trim().toLowerCase())
    .filter((s): s is EntityType => valid.has(s as EntityType));
  return list.length > 0 ? list : DEFAULT_SCOPES;
}

function countOccurrences(haystack: string, needle: string): number {
  if (!haystack || !needle) return 0;
  let count = 0;
  let pos = 0;
  while (true) {
    const idx = haystack.indexOf(needle, pos);
    if (idx === -1) break;
    count++;
    pos = idx + needle.length;
  }
  return count;
}

function makeSnippet(haystack: string, needle: string): string {
  if (!haystack) return '';
  const idx = haystack.indexOf(needle);
  if (idx === -1) return haystack.slice(0, 60);
  const start = Math.max(0, idx - 30);
  const end = Math.min(haystack.length, idx + needle.length + 30);
  const prefix = start > 0 ? '...' : '';
  const suffix = end < haystack.length ? '...' : '';
  return prefix + haystack.slice(start, end) + suffix;
}

function truncate(text: string, max: number): string {
  if (!text) return '';
  return text.length > max ? text.slice(0, max) : text;
}

export async function searchRoutes(app: FastifyInstance) {
  async function validateWorkspace(workspaceId: string, reply: FastifyReply): Promise<boolean> {
    const ws = app.db
      .select({ id: workspaces.id })
      .from(workspaces)
      .where(eq(workspaces.id, workspaceId))
      .get();
    if (!ws) {
      reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: '工作区不存在' } });
      return false;
    }
    return true;
  }

  // GET /search?q=&scope=
  app.get<{ Params: { workspaceId: string }; Querystring: { q: string; scope?: string } }>(
    '/search',
    { schema: { querystring: searchQuery } },
    async (request, reply) => {
      const { workspaceId } = request.params;
      if (!await validateWorkspace(workspaceId, reply)) return;
      const { q, scope } = request.query;
      const scopes = parseScope(scope);
      const escaped = escapeLike(q);
      const likePattern = `%${escaped}%`;

      const hits: SearchHit[] = [];

      if (scopes.includes('event')) {
        const rows = app.db
          .select({
            id: events.id,
            title: events.title,
            summary: events.summary,
            description: events.description,
            location: events.location,
          })
          .from(events)
          .where(
            and(
              eq(events.workspaceId, workspaceId),
              or(
                sql`${events.title} LIKE ${likePattern} ESCAPE '\\'`,
                sql`${events.summary} LIKE ${likePattern} ESCAPE '\\'`,
                sql`${events.description} LIKE ${likePattern} ESCAPE '\\'`,
                sql`${events.location} LIKE ${likePattern} ESCAPE '\\'`,
              ),
            ),
          )
          .all();
        for (const row of rows) {
          const fields = [row.title || '', row.summary || '', row.description || '', row.location || ''];
          const matchCount = fields.reduce((acc, f) => acc + countOccurrences(f, q), 0);
          const firstHitField = fields.find((f) => f.includes(q)) || row.title || '';
          hits.push({
            entityType: 'event',
            entityId: row.id,
            snippet: makeSnippet(firstHitField, q),
            matchCount,
            title: row.title || '',
          });
        }
      }

      if (scopes.includes('beat')) {
        const rows = app.db
          .select({ id: beats.id, text: beats.text, sceneId: beats.sceneId })
          .from(beats)
          .innerJoin(scenes, eq(beats.sceneId, scenes.id))
          .where(
            and(
              eq(scenes.workspaceId, workspaceId),
              sql`${beats.text} LIKE ${likePattern} ESCAPE '\\'`,
            ),
          )
          .all();
        for (const row of rows) {
          const text = row.text || '';
          const matchCount = countOccurrences(text, q);
          hits.push({
            entityType: 'beat',
            entityId: row.id,
            snippet: makeSnippet(text, q),
            matchCount,
            title: truncate(text, 20),
          });
        }
      }

      if (scopes.includes('outline')) {
        const rows = app.db
          .select({ id: outlineVersions.id, content: outlineVersions.content, description: outlineVersions.description })
          .from(outlineVersions)
          .where(
            and(
              eq(outlineVersions.workspaceId, workspaceId),
              sql`${outlineVersions.content} LIKE ${likePattern} ESCAPE '\\'`,
            ),
          )
          .all();
        for (const row of rows) {
          const content = row.content || '';
          const matchCount = countOccurrences(content, q);
          hits.push({
            entityType: 'outline',
            entityId: row.id,
            snippet: makeSnippet(content, q),
            matchCount,
            title: row.description || truncate(content, 20),
          });
        }
      }

      if (scopes.includes('character')) {
        const rows = app.db
          .select({ id: characters.id, name: characters.name, description: characters.description })
          .from(characters)
          .where(
            and(
              eq(characters.workspaceId, workspaceId),
              or(
                sql`${characters.name} LIKE ${likePattern} ESCAPE '\\'`,
                sql`${characters.description} LIKE ${likePattern} ESCAPE '\\'`,
              ),
            ),
          )
          .all();
        for (const row of rows) {
          const fields = [row.name || '', row.description || ''];
          const matchCount = fields.reduce((acc, f) => acc + countOccurrences(f, q), 0);
          const firstHitField = fields.find((f) => f.includes(q)) || row.name || '';
          hits.push({
            entityType: 'character',
            entityId: row.id,
            snippet: makeSnippet(firstHitField, q),
            matchCount,
            title: row.name || '',
          });
        }
      }

      if (scopes.includes('worldsetting')) {
        const rows = app.db
          .select({
            id: worldSettings.id,
            key: worldSettings.key,
            value: worldSettings.value,
            description: worldSettings.description,
          })
          .from(worldSettings)
          .where(
            and(
              eq(worldSettings.workspaceId, workspaceId),
              or(
                sql`${worldSettings.key} LIKE ${likePattern} ESCAPE '\\'`,
                sql`${worldSettings.value} LIKE ${likePattern} ESCAPE '\\'`,
                sql`${worldSettings.description} LIKE ${likePattern} ESCAPE '\\'`,
              ),
            ),
          )
          .all();
        for (const row of rows) {
          const fields = [row.key || '', row.value || '', row.description || ''];
          const matchCount = fields.reduce((acc, f) => acc + countOccurrences(f, q), 0);
          const firstHitField = fields.find((f) => f.includes(q)) || row.key || '';
          hits.push({
            entityType: 'worldsetting',
            entityId: row.id,
            snippet: makeSnippet(firstHitField, q),
            matchCount,
            title: row.key || '',
          });
        }
      }

      if (scopes.includes('foreshadowing')) {
        const rows = app.db
          .select({ id: foreshadowings.id, title: foreshadowings.title, description: foreshadowings.description })
          .from(foreshadowings)
          .where(
            and(
              eq(foreshadowings.workspaceId, workspaceId),
              or(
                sql`${foreshadowings.title} LIKE ${likePattern} ESCAPE '\\'`,
                sql`${foreshadowings.description} LIKE ${likePattern} ESCAPE '\\'`,
              ),
            ),
          )
          .all();
        for (const row of rows) {
          const fields = [row.title || '', row.description || ''];
          const matchCount = fields.reduce((acc, f) => acc + countOccurrences(f, q), 0);
          const firstHitField = fields.find((f) => f.includes(q)) || row.title || '';
          hits.push({
            entityType: 'foreshadowing',
            entityId: row.id,
            snippet: makeSnippet(firstHitField, q),
            matchCount,
            title: row.title || '',
          });
        }
      }

      if (scopes.includes('scene')) {
        const rows = app.db
          .select({ id: scenes.id, name: scenes.name })
          .from(scenes)
          .where(
            and(
              eq(scenes.workspaceId, workspaceId),
              sql`${scenes.name} LIKE ${likePattern} ESCAPE '\\'`,
            ),
          )
          .all();
        for (const row of rows) {
          const name = row.name || '';
          const matchCount = countOccurrences(name, q);
          hits.push({
            entityType: 'scene',
            entityId: row.id,
            snippet: makeSnippet(name, q),
            matchCount,
            title: name,
          });
        }
      }

      return { success: true, data: { hits, total: hits.length } };
    },
  );

  // POST /replace
  app.post<{
    Params: { workspaceId: string };
    Body: { q: string; replacement: string; scope?: string | string[]; dryRun?: boolean };
  }>(
    '/replace',
    { schema: { body: replaceBody } },
    async (request, reply) => {
      const { workspaceId } = request.params;
      if (!await validateWorkspace(workspaceId, reply)) return;
      const { q, replacement, scope, dryRun = true } = request.body;
      const scopes = parseScope(scope);
      const escaped = escapeLike(q);
      const likePattern = `%${escaped}%`;

      const willChange: WillChangeItem[] = [];

      const replaceStr = (text: string): string => text.split(q).join(replacement);

      // event
      if (scopes.includes('event')) {
        const rows = app.db
          .select()
          .from(events)
          .where(
            and(
              eq(events.workspaceId, workspaceId),
              or(
                sql`${events.title} LIKE ${likePattern} ESCAPE '\\'`,
                sql`${events.summary} LIKE ${likePattern} ESCAPE '\\'`,
                sql`${events.description} LIKE ${likePattern} ESCAPE '\\'`,
                sql`${events.location} LIKE ${likePattern} ESCAPE '\\'`,
              ),
            ),
          )
          .all();
        for (const row of rows) {
          const fieldNames: Array<'title' | 'summary' | 'description' | 'location'> = [
            'title',
            'summary',
            'description',
            'location',
          ];
          for (const fn of fieldNames) {
            const oldText = (row[fn] as string | null) || '';
            if (oldText.includes(q)) {
              const newText = replaceStr(oldText);
              willChange.push({ entityType: 'event', entityId: row.id, oldText, newText, fieldName: fn });
            }
          }
        }
      }

      // beat
      if (scopes.includes('beat')) {
        const rows = app.db
          .select({ id: beats.id, text: beats.text })
          .from(beats)
          .innerJoin(scenes, eq(beats.sceneId, scenes.id))
          .where(
            and(
              eq(scenes.workspaceId, workspaceId),
              sql`${beats.text} LIKE ${likePattern} ESCAPE '\\'`,
            ),
          )
          .all();
        for (const row of rows) {
          const oldText = row.text || '';
          if (oldText.includes(q)) {
            willChange.push({
              entityType: 'beat',
              entityId: row.id,
              oldText,
              newText: replaceStr(oldText),
              fieldName: 'text',
            });
          }
        }
      }

      // outline (skipped — JSON-like content, do not replace to avoid breaking structure)
      if (scopes.includes('outline')) {
        const rows = app.db
          .select({ id: outlineVersions.id, content: outlineVersions.content })
          .from(outlineVersions)
          .where(
            and(
              eq(outlineVersions.workspaceId, workspaceId),
              sql`${outlineVersions.content} LIKE ${likePattern} ESCAPE '\\'`,
            ),
          )
          .all();
        for (const row of rows) {
          const oldText = row.content || '';
          if (oldText.includes(q)) {
            willChange.push({
              entityType: 'outline',
              entityId: row.id,
              oldText,
              newText: oldText,
              fieldName: 'contentJson(skipped)',
            });
          }
        }
      }

      // character
      if (scopes.includes('character')) {
        const rows = app.db
          .select()
          .from(characters)
          .where(
            and(
              eq(characters.workspaceId, workspaceId),
              or(
                sql`${characters.name} LIKE ${likePattern} ESCAPE '\\'`,
                sql`${characters.description} LIKE ${likePattern} ESCAPE '\\'`,
              ),
            ),
          )
          .all();
        for (const row of rows) {
          const fieldNames: Array<'name' | 'description'> = ['name', 'description'];
          for (const fn of fieldNames) {
            const oldText = (row[fn] as string | null) || '';
            if (oldText.includes(q)) {
              willChange.push({
                entityType: 'character',
                entityId: row.id,
                oldText,
                newText: replaceStr(oldText),
                fieldName: fn,
              });
            }
          }
        }
      }

      // worldsetting
      if (scopes.includes('worldsetting')) {
        const rows = app.db
          .select()
          .from(worldSettings)
          .where(
            and(
              eq(worldSettings.workspaceId, workspaceId),
              or(
                sql`${worldSettings.key} LIKE ${likePattern} ESCAPE '\\'`,
                sql`${worldSettings.value} LIKE ${likePattern} ESCAPE '\\'`,
                sql`${worldSettings.description} LIKE ${likePattern} ESCAPE '\\'`,
              ),
            ),
          )
          .all();
        for (const row of rows) {
          const fieldNames: Array<'key' | 'value' | 'description'> = ['key', 'value', 'description'];
          for (const fn of fieldNames) {
            const oldText = (row[fn] as string | null) || '';
            if (oldText.includes(q)) {
              willChange.push({
                entityType: 'worldsetting',
                entityId: row.id,
                oldText,
                newText: replaceStr(oldText),
                fieldName: fn,
              });
            }
          }
        }
      }

      // foreshadowing
      if (scopes.includes('foreshadowing')) {
        const rows = app.db
          .select()
          .from(foreshadowings)
          .where(
            and(
              eq(foreshadowings.workspaceId, workspaceId),
              or(
                sql`${foreshadowings.title} LIKE ${likePattern} ESCAPE '\\'`,
                sql`${foreshadowings.description} LIKE ${likePattern} ESCAPE '\\'`,
              ),
            ),
          )
          .all();
        for (const row of rows) {
          const fieldNames: Array<'title' | 'description'> = ['title', 'description'];
          for (const fn of fieldNames) {
            const oldText = (row[fn] as string | null) || '';
            if (oldText.includes(q)) {
              willChange.push({
                entityType: 'foreshadowing',
                entityId: row.id,
                oldText,
                newText: replaceStr(oldText),
                fieldName: fn,
              });
            }
          }
        }
      }

      // scene
      if (scopes.includes('scene')) {
        const rows = app.db
          .select({ id: scenes.id, name: scenes.name })
          .from(scenes)
          .where(
            and(
              eq(scenes.workspaceId, workspaceId),
              sql`${scenes.name} LIKE ${likePattern} ESCAPE '\\'`,
            ),
          )
          .all();
        for (const row of rows) {
          const oldText = row.name || '';
          if (oldText.includes(q)) {
            willChange.push({
              entityType: 'scene',
              entityId: row.id,
              oldText,
              newText: replaceStr(oldText),
              fieldName: 'name',
            });
          }
        }
      }

      if (dryRun) {
        return { success: true, data: { willChange, total: willChange.length } };
      }

      // Real write — group by entity to apply all field changes in single UPDATE
      const now = new Date();
      const applied: WillChangeItem[] = [];

      app.sqlite.transaction(() => {
        // Group changes by entityType + entityId
        const groups = new Map<string, WillChangeItem[]>();
        for (const item of willChange) {
          if (item.fieldName === 'contentJson(skipped)') continue; // never write outline
          const key = `${item.entityType}::${item.entityId}`;
          const arr = groups.get(key) || [];
          arr.push(item);
          groups.set(key, arr);
        }

        for (const [key, items] of groups) {
          const [entityType, entityId] = key.split('::') as [EntityType, string];
          const updateData: Record<string, unknown> = {};
          for (const it of items) {
            updateData[it.fieldName] = it.newText;
          }

          switch (entityType) {
            case 'event':
              app.db.update(events).set({ ...updateData, updatedAt: now })
                .where(and(eq(events.id, entityId), eq(events.workspaceId, workspaceId)))
                .run();
              applied.push(...items);
              break;
            case 'beat':
              app.db.update(beats).set({ ...updateData, updatedAt: now })
                .where(eq(beats.id, entityId))
                .run();
              applied.push(...items);
              break;
            case 'character':
              app.db.update(characters).set(updateData)
                .where(and(eq(characters.id, entityId), eq(characters.workspaceId, workspaceId)))
                .run();
              applied.push(...items);
              break;
            case 'worldsetting':
              app.db.update(worldSettings).set(updateData)
                .where(and(eq(worldSettings.id, entityId), eq(worldSettings.workspaceId, workspaceId)))
                .run();
              applied.push(...items);
              break;
            case 'foreshadowing':
              app.db.update(foreshadowings).set({ ...updateData, updatedAt: now })
                .where(and(eq(foreshadowings.id, entityId), eq(foreshadowings.workspaceId, workspaceId)))
                .run();
              applied.push(...items);
              break;
            case 'scene':
              app.db.update(scenes).set({ ...updateData, updatedAt: now })
                .where(and(eq(scenes.id, entityId), eq(scenes.workspaceId, workspaceId)))
                .run();
              applied.push(...items);
              break;
            case 'outline':
              // skipped intentionally
              break;
          }
        }
      })();

      // Include skipped outline entries in response so caller is aware
      const skipped = willChange.filter((w) => w.fieldName === 'contentJson(skipped)');
      return {
        success: true,
        data: {
          applied,
          skipped,
          total: applied.length,
        },
      };
    },
  );
}
