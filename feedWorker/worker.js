import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import RSSParser from "rss-parser";
import crypto from "crypto";
import fetch from "node-fetch";
import { Pool } from "pg";
import { config as dotenvConfig } from "dotenv";

dotenvConfig({ path: path.join(process.cwd(), ".env.local") });

const SOURCES_FILE = process.env.SOURCES_FILE || path.join(process.cwd(), "sources.yml");
const DATABASE_URL = process.env.NODE_ENV === "development" ? process.env.DATABASE_URL : process.env.PROD_DATABASE_URL;

if (!DATABASE_URL) process.exit(1);

const parser = new RSSParser({ customFields: { item: ["category", "categories", "link"] } });
const pg = new Pool({ connectionString: DATABASE_URL, max: 10 });

const loadSources = () => {
  try {
    const raw = fs.readFileSync(SOURCES_FILE, "utf8");
    return yaml.load(raw).sources || [];
  } catch {
    console.error("Failed to load sources.yml:", err);
    return [];
  }
};

const normalizeDate = (dateStr) => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d.toISOString();
};

const normalizeCategories = (itemCats, sourceTags) => {
  const cats = [];
  if (Array.isArray(itemCats)) {
    itemCats.forEach(c => {
      const s = String(c || "").toLowerCase().trim();
      if (s && !cats.includes(s)) cats.push(s);
    });
  }
  if (cats.length === 0 && Array.isArray(sourceTags)) {
    sourceTags.forEach(c => {
      const s = String(c || "").toLowerCase().trim();
      if (s && !cats.includes(s)) cats.push(s);
    });
  }
  return cats.length ? cats : ["general"];
};

const formatArrayForPostgres = (arr) => {
  if (!arr || arr.length === 0) return "{}";
  return `{${arr.map(v => `"${v.replace(/"/g, '\\"')}"`).join(",")}}`;
};

const normalizeUrl = (url) => {
  if (!url) return "";
  try {
    const u = new URL(url);
    const qp = new URLSearchParams(u.search);
    [...qp.keys()].forEach(key => {
      if (key.toLowerCase().startsWith("utm_")) qp.delete(key);
    });
    u.search = new URLSearchParams([...qp.entries()].sort()).toString();
    u.hash = "";
    return u.toString();
  } catch {
    return url;
  }
};

const itemIdFrom = (url, title, published, sourceId) => {
  if (url) {
    const n = normalizeUrl(url);
    return crypto.createHash("sha256").update(n).digest("hex");
  }
  const fallback = `${sourceId || ""}|${title || ""}|${published || ""}`;
  return crypto.createHash("sha256").update(fallback).digest("hex");
};

async function ensureItemsTable(pool) {
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS items (
      item_id TEXT PRIMARY KEY,
      url TEXT,
      canonical_url TEXT,
      title TEXT,
      summary TEXT,
      content TEXT,
      published_at TIMESTAMPTZ,
      source_id TEXT,
      source_name TEXT,
      categories TEXT[],
      raw JSONB
    );
  `;
  await pool.query(createTableSQL);
}

async function upsertItems(pool, items, sourceName) {
  if (!items || items.length === 0) return;
  const columns = [
    "item_id",
    "url",
    "canonical_url",
    "title",
    "summary",
    "content",
    "published_at",
    "source_id",
    "source_name",
    "categories",
    "raw"
  ];
  const values = [];
  const placeholders = items.map((item, i) => {
    const base = i * columns.length;
    values.push(
      item.item_id,
      item.url,
      item.canonical_url,
      item.title,
      item.summary,
      item.content,
      item.published_at,
      item.source_id,
      item.source_name,
      item.categories,
      item.raw
    );
    return `(${columns.map((_, j) => `$${base + j + 1}`).join(", ")})`;
  });
  const query = `
    INSERT INTO items (${columns.join(", ")})
    VALUES ${placeholders.join(", ")}
    ON CONFLICT (item_id) DO UPDATE SET
      url = EXCLUDED.url,
      canonical_url = EXCLUDED.canonical_url,
      title = EXCLUDED.title,
      summary = EXCLUDED.summary,
      content = EXCLUDED.content,
      published_at = EXCLUDED.published_at,
      source_id = EXCLUDED.source_id,
      source_name = EXCLUDED.source_name,
      categories = EXCLUDED.categories,
      raw = EXCLUDED.raw;
  `;
  await pool.query(query, values);
  console.log(`[${new Date().toISOString()}] Upserted ${items.length} items from ${sourceName}`);
}

async function fetchAndParseFeed(url) {
  const res = await fetch(url);
  let xml = await res.text();
  xml = xml.replace(/&(?![a-zA-Z0-9#]+;)/g, "&amp;");
  return parser.parseString(xml);
}

async function fetchAndUpsertAll() {
  const sources = loadSources();
  if (!sources.length) return;

  await ensureItemsTable(pg);

  const client = await pg.connect();
  let existingIds = new Set();
  try {
    const res = await client.query("SELECT item_id FROM items");
    res.rows.forEach(r => existingIds.add(r.item_id));
  } finally {
    client.release();
  }

  for (const source of sources) {
    const urls = Array.isArray(source.url) ? source.url : [source.url];
    for (const feedUrl of urls) {
      console.log(`[${new Date().toISOString()}] Fetching ${source.name} -> ${feedUrl}`);
      try {
        const feed = await fetchAndParseFeed(feedUrl);
        const itemsToInsert = [];

        for (const rawItem of feed.items || []) {
          let linkVal = "";
          if (typeof rawItem.link === "string") linkVal = rawItem.link;
          else if (rawItem.link?.href) linkVal = rawItem.link.href;
          else if (Array.isArray(rawItem.link) && rawItem.link[0]?.href) linkVal = rawItem.link[0].href;
          else linkVal = rawItem.guid || "";

          const canonical = normalizeUrl(linkVal);
          const published = normalizeDate(
            rawItem.isoDate || rawItem.pubDate || rawItem.published || rawItem.updated
          );

          const pubDateObj = published ? new Date(published) : null;
          const item_id = itemIdFrom(canonical || linkVal, rawItem.title, published, source.id || source.name);

          if (existingIds.has(item_id)) continue;
          if (pubDateObj && (Date.now() - pubDateObj.getTime()) > (30 * 24 * 60 * 60 * 1000)) continue;

          const categories = normalizeCategories(rawItem.categories || rawItem.category || [], source.tags || []);
          const titleVal = typeof rawItem.title === "string"
            ? rawItem.title.trim()
            : JSON.stringify(rawItem.title);
          const summary = (rawItem.contentSnippet || rawItem.summary || "").substring(0, 2000);
          const content = rawItem.content || rawItem["content:encoded"] || "";

          itemsToInsert.push({
            item_id,
            url: linkVal,
            canonical_url: canonical,
            title: titleVal,
            summary,
            content,
            published_at: published,
            source_id: source.id || source.name,
            source_name: source.name,
            categories: formatArrayForPostgres(categories),
            raw: rawItem
          });

          existingIds.add(item_id);
        }

        if (itemsToInsert.length > 0) {
          await upsertItems(pg, itemsToInsert, source.name);
        }
      } catch {}
    }
  }
}

export default fetchAndUpsertAll;
