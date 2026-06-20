import type { FastifyInstance } from 'fastify';
import { eq, inArray } from 'drizzle-orm';
import { characters, scenes, beats, choices, flags, assets } from '../../db/schema.js';

export function buildPreviewScript(app: FastifyInstance, id: string) {
  const sceneRows = app.db.select().from(scenes)
    .where(eq(scenes.workspaceId, id))
    .orderBy(scenes.sceneOrder)
    .all();

  const sceneIds = sceneRows.map(s => s.id);
  const bgAssetIds = sceneRows.map(s => s.backgroundAssetId).filter((v): v is string => !!v);

  const beatRows = sceneIds.length
    ? app.db.select().from(beats).where(inArray(beats.sceneId, sceneIds)).orderBy(beats.beatOrder).all()
    : [];

  const charIds = beatRows.map(b => b.characterId).filter((v): v is string => !!v);
  const portraitAssetIds = beatRows.map(b => b.portraitAssetId).filter((v): v is string => !!v);

  const charRows = charIds.length
    ? app.db.select({ id: characters.id, name: characters.name, avatarUrl: characters.avatarUrl })
        .from(characters).where(inArray(characters.id, charIds)).all()
    : [];
  const charMap = new Map(charRows.map(c => [c.id, c]));

  const allAssetIds = Array.from(new Set([...bgAssetIds, ...portraitAssetIds]));
  const assetRows = allAssetIds.length
    ? app.db.select({ id: assets.id, fileName: assets.fileName, sha256: assets.sha256, mimeType: assets.mimeType })
        .from(assets).where(inArray(assets.id, allAssetIds)).all()
    : [];
  const assetMap = new Map(assetRows.map(a => [a.id, a]));

  const choiceBeatIds = beatRows.filter(b => b.kind === 'choice').map(b => b.id);
  const choiceRows = choiceBeatIds.length
    ? app.db.select().from(choices).where(inArray(choices.beatId, choiceBeatIds)).orderBy(choices.choiceOrder).all()
    : [];
  const choiceMap = new Map<string, typeof choiceRows>();
  for (const c of choiceRows) {
    const arr = choiceMap.get(c.beatId) || [];
    arr.push(c);
    choiceMap.set(c.beatId, arr);
  }

  const beatsByScene = new Map<string, typeof beatRows>();
  for (const b of beatRows) {
    const arr = beatsByScene.get(b.sceneId) || [];
    arr.push(b);
    beatsByScene.set(b.sceneId, arr);
  }

  const flagRows = app.db.select({
    id: flags.id, name: flags.name, defaultValueJson: flags.defaultValueJson, description: flags.description,
  }).from(flags).where(eq(flags.workspaceId, id)).all();

  const scenesPayload = sceneRows.map(s => {
    const bgAsset = s.backgroundAssetId ? assetMap.get(s.backgroundAssetId) : null;
    const sceneBeats = beatsByScene.get(s.id) || [];
    return {
      id: s.id,
      name: s.name,
      sceneOrder: s.sceneOrder,
      background: bgAsset ? { id: bgAsset.id, fileName: bgAsset.fileName, sha256: bgAsset.sha256 } : null,
      bgm: s.bgm || null,
      beats: sceneBeats.map(b => {
        const character = b.characterId ? charMap.get(b.characterId) : null;
        const portraitAsset = b.portraitAssetId ? assetMap.get(b.portraitAssetId) : null;
        const beatPayload: Record<string, unknown> = {
          id: b.id,
          kind: b.kind,
          beatOrder: b.beatOrder,
          text: b.text || '',
          metadataJson: b.metadataJson || '{}',
          character: character ? { id: character.id, name: character.name, avatarUrl: character.avatarUrl || '' } : null,
          portrait: portraitAsset ? { id: portraitAsset.id, fileName: portraitAsset.fileName, sha256: portraitAsset.sha256 } : null,
        };
        if (b.kind === 'choice') {
          const cs = choiceMap.get(b.id) || [];
          beatPayload.choices = cs.map(c => ({
            id: c.id,
            label: c.label,
            nextSceneId: c.nextSceneId,
            condition: c.condition || '',
            choiceOrder: c.choiceOrder,
          }));
        }
        return beatPayload;
      }),
    };
  });

  const entrySceneId = sceneRows.length > 0 ? sceneRows[0].id : null;

  return {
    version: '1.0',
    entrySceneId,
    scenes: scenesPayload,
    flags: flagRows.map(f => ({
      id: f.id,
      name: f.name,
      defaultValueJson: f.defaultValueJson || 'null',
      description: f.description || '',
    })),
  };
}
