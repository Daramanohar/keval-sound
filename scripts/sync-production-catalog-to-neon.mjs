import { createMetadataHash, createSearchDocument, groupPacks, readCatalogRecords } from "./lib/catalog.mjs";
import { withClient } from "./lib/db.mjs";

const requestedChunkSize = Number.parseInt(process.env.CATALOG_SYNC_CHUNK_SIZE ?? "500", 10);
const TRACK_CHUNK_SIZE = Number.isFinite(requestedChunkSize) && requestedChunkSize > 0
  ? requestedChunkSize
  : 500;

async function setupVectorSchema(client) {
  await client.query("create extension if not exists vector");
  await client.query(`
    alter table tracks
      add column if not exists metadata_hash text,
      add column if not exists embedding_model text,
      add column if not exists embedding_dimensions integer,
      add column if not exists embedding vector(1024)
  `);
}

function toPackRows(packs) {
  return packs.map((pack) => ({
    id: pack.id,
    title: pack.title,
    category: pack.category,
    cover_url: pack.coverUrl,
    track_count: pack.trackCount,
    total_duration: pack.totalDuration,
  }));
}

function toTrackRows(records) {
  return records.map((record) => {
    const searchDocument = createSearchDocument(record);

    return {
      id: record.id,
      title: record.title,
      pack_id: record.packId,
      category: record.category,
      source_category: record.sourceCategory,
      duration_seconds: record.durationSeconds,
      has_mp3: record.hasMp3,
      has_wav: record.hasWav,
      has_lyrics: record.hasLyrics,
      is_instrumental: record.isInstrumental,
      mp3_path: record.mp3Path || null,
      wav_path: record.wavPath || null,
      lyrics_url: record.lyricsUrl || null,
      source_path: record.sourcePath || null,
      metadata_text: record.metadataText || null,
      search_text: searchDocument,
      tags: record.tags ?? [],
      metadata_hash: createMetadataHash(searchDocument),
    };
  });
}

async function upsertPacks(client, packs) {
  await client.query(
    `
      with incoming as (
        select *
        from jsonb_to_recordset($1::jsonb) as pack_rows(
          id text,
          title text,
          category text,
          cover_url text,
          track_count integer,
          total_duration integer
        )
      )
      insert into music_packs (
        id, title, category, cover_url, track_count, total_duration, updated_at
      )
      select
        id, title, category, cover_url, track_count, total_duration, now()
      from incoming
      on conflict (id) do update set
        title = excluded.title,
        category = excluded.category,
        cover_url = excluded.cover_url,
        track_count = excluded.track_count,
        total_duration = excluded.total_duration,
        updated_at = now()
    `,
    [JSON.stringify(toPackRows(packs))]
  );
}

async function upsertTrackChunk(client, records) {
  await client.query(
    `
      with incoming as (
        select *
        from jsonb_to_recordset($1::jsonb) as track_rows(
          id text,
          title text,
          pack_id text,
          category text,
          source_category text,
          duration_seconds integer,
          has_mp3 boolean,
          has_wav boolean,
          has_lyrics boolean,
          is_instrumental boolean,
          mp3_path text,
          wav_path text,
          lyrics_url text,
          source_path text,
          metadata_text text,
          search_text text,
          tags jsonb,
          metadata_hash text
        )
      )
      insert into tracks (
        id,
        title,
        pack_id,
        category,
        source_category,
        duration_seconds,
        has_mp3,
        has_wav,
        has_lyrics,
        is_instrumental,
        mp3_path,
        wav_path,
        lyrics_url,
        source_path,
        metadata_text,
        search_text,
        tags,
        metadata_hash,
        updated_at
      )
      select
        id,
        title,
        pack_id,
        category,
        source_category,
        duration_seconds,
        has_mp3,
        has_wav,
        has_lyrics,
        is_instrumental,
        mp3_path,
        wav_path,
        lyrics_url,
        source_path,
        metadata_text,
        search_text,
        tags,
        metadata_hash,
        now()
      from incoming
      on conflict (id) do update set
        title = excluded.title,
        pack_id = excluded.pack_id,
        category = excluded.category,
        source_category = excluded.source_category,
        duration_seconds = excluded.duration_seconds,
        has_mp3 = excluded.has_mp3,
        has_wav = excluded.has_wav,
        has_lyrics = excluded.has_lyrics,
        is_instrumental = excluded.is_instrumental,
        mp3_path = excluded.mp3_path,
        wav_path = excluded.wav_path,
        lyrics_url = excluded.lyrics_url,
        source_path = excluded.source_path,
        metadata_text = excluded.metadata_text,
        search_text = excluded.search_text,
        tags = excluded.tags,
        metadata_hash = excluded.metadata_hash,
        embedding = case
          when tracks.metadata_hash is distinct from excluded.metadata_hash then null
          else tracks.embedding
        end,
        embedding_model = case
          when tracks.metadata_hash is distinct from excluded.metadata_hash then null
          else tracks.embedding_model
        end,
        embedding_dimensions = case
          when tracks.metadata_hash is distinct from excluded.metadata_hash then null
          else tracks.embedding_dimensions
        end,
        updated_at = now()
    `,
    [JSON.stringify(toTrackRows(records))]
  );
}

async function main() {
  const records = await readCatalogRecords();
  const packs = groupPacks(records);

  console.log(`Catalog source: ${packs.length} packs, ${records.length} tracks.`);
  console.log(`Syncing tracks in bulk chunks of ${TRACK_CHUNK_SIZE}.`);

  await withClient(async (client) => {
    await setupVectorSchema(client);
    await upsertPacks(client, packs);
    console.log(`Upserted ${packs.length} packs.`);

    let synced = 0;
    for (let start = 0; start < records.length; start += TRACK_CHUNK_SIZE) {
      const chunk = records.slice(start, start + TRACK_CHUNK_SIZE);
      await upsertTrackChunk(client, chunk);
      synced += chunk.length;
      console.log(`Upserted ${synced}/${records.length} tracks.`);
    }
  });

  const missingMetadata = records.filter((record) => !record.metadataText).length;
  console.log(`Catalog sync complete: ${packs.length} packs and ${records.length} tracks in Neon.`);
  console.log(`Tracks without metadataText: ${missingMetadata}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
