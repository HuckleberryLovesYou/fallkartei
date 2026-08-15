#!/usr/bin/env node

import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const SOURCE_URL = 'https://www.rocky-beach.com/php/project/f_ausgabe.html';
const CATALOG_PATH = resolve(process.cwd(), 'episodes.json');
const OUTPUT_PATH = resolve(process.cwd(), 'rocky-rankings.json');
const MIN_PARSED_ROWS = 200;
const MIN_MATCHED_ROWS = 180;
const REQUEST_TIMEOUT_MS = 20_000;
const USER_AGENT = 'Die-Fallkartei-Ranking-Updater/1.5.11 (+https://github.com/LetsMAgic/fallkartei)';

function normalizeText(value) {
  return String(value ?? '')
    .toLocaleLowerCase('de-DE')
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function canonicalTitle(value) {
  return normalizeText(value)
    .replace(/^die drei fragezeichen\s+/, '')
    .replace(/^die drei\s+/, '')
    .replace(/^und\s+/, '')
    .replace(/\s+/g, '')
    .trim();
}

function decodeHtml(value) {
  const named = {
    amp: '&', apos: "'", quot: '"', lt: '<', gt: '>', nbsp: ' ',
    auml: 'ä', ouml: 'ö', uuml: 'ü', Auml: 'Ä', Ouml: 'Ö', Uuml: 'Ü', szlig: 'ß',
  };
  return String(value ?? '')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number.parseInt(dec, 10)))
    .replace(/&([a-z]+);/gi, (match, name) => Object.hasOwn(named, name) ? named[name] : match);
}

function stripTags(value) {
  return decodeHtml(String(value ?? '')
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

function parseAttributes(source) {
  const attrs = {};
  const pattern = /([:\w-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let match;
  while ((match = pattern.exec(source || ''))) {
    attrs[match[1].toLowerCase()] = decodeHtml(match[2] ?? match[3] ?? match[4] ?? '');
  }
  return attrs;
}

function parseOptions(selectBody) {
  const options = [];
  const optionPattern = /<option\b([^>]*)>([\s\S]*?)(?=<option\b|<\/select>|$)/gi;
  let match;
  while ((match = optionPattern.exec(selectBody || ''))) {
    const attrs = parseAttributes(match[1]);
    options.push({
      value: attrs.value ?? stripTags(match[2]),
      label: stripTags(match[2]),
      selected: Object.hasOwn(attrs, 'selected'),
    });
  }
  return options;
}

function parseFormControls(formBody) {
  const controls = [];
  const inputPattern = /<input\b([^>]*)>/gi;
  let match;
  while ((match = inputPattern.exec(formBody || ''))) {
    const attrs = parseAttributes(match[1]);
    const type = String(attrs.type || 'text').toLowerCase();
    if (!attrs.name || ['button', 'reset', 'file'].includes(type)) continue;
    if (['checkbox', 'radio'].includes(type) && !Object.hasOwn(attrs, 'checked')) continue;
    controls.push({ type, name: attrs.name, value: attrs.value ?? '' });
  }

  const selectPattern = /<select\b([^>]*)>([\s\S]*?)<\/select>/gi;
  while ((match = selectPattern.exec(formBody || ''))) {
    const attrs = parseAttributes(match[1]);
    if (!attrs.name) continue;
    const options = parseOptions(match[2]);
    const selected = options.find((option) => option.selected) || options[0] || { value: '' };
    controls.push({ type: 'select', name: attrs.name, value: selected.value, options });
  }
  return controls;
}

function findRatingForm(html) {
  const formPattern = /<form\b([^>]*)>([\s\S]*?)<\/form>/gi;
  const forms = [];
  let match;
  while ((match = formPattern.exec(html || ''))) {
    const attrs = parseAttributes(match[1]);
    const controls = parseFormControls(match[2]);
    const seriesControl = controls.find((control) => control.type === 'select' && control.options?.some((option) => /hörspiel/i.test(option.label)));
    if (!seriesControl) continue;
    const seriesOption = seriesControl.options.find((option) => /hörspiel/i.test(option.label));
    const viewControl = controls.find((control) => control.type === 'select' && control.options?.some((option) => /wertungsansicht|ergebnis/i.test(option.label)));
    const viewOption = viewControl?.options.find((option) => /wertungsansicht|ergebnis/i.test(option.label));
    forms.push({ attrs, controls, seriesControl, seriesOption, viewControl, viewOption });
  }
  if (!forms.length) throw new Error('Das Rocky-Beach-Formular mit einer Hörspiel-Auswahl wurde nicht gefunden.');
  return forms[0];
}

function buildFormRequest(form, baseUrl) {
  const params = new URLSearchParams();
  for (const control of form.controls) {
    if (control.type === 'submit') continue;
    params.set(control.name, control.value ?? '');
  }
  params.set(form.seriesControl.name, form.seriesOption.value);
  if (form.viewControl && form.viewOption) params.set(form.viewControl.name, form.viewOption.value);

  const submit = form.controls.find((control) => control.type === 'submit' && control.name);
  if (submit) params.set(submit.name, submit.value ?? '');

  const method = String(form.attrs.method || 'get').toUpperCase();
  const action = new URL(form.attrs.action || baseUrl, baseUrl);
  if (method === 'GET') {
    for (const [key, value] of params) action.searchParams.set(key, value);
    return { url: action.href, options: { method: 'GET' } };
  }
  return {
    url: action.href,
    options: {
      method,
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    },
  };
}

async function fetchHtml(url, options = {}, cookie = '') {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const headers = new Headers(options.headers || {});
    headers.set('user-agent', USER_AGENT);
    headers.set('accept', 'text/html,application/xhtml+xml');
    headers.set('accept-language', 'de-DE,de;q=0.9,en;q=0.5');
    if (cookie) headers.set('cookie', cookie);
    const response = await fetch(url, { ...options, headers, signal: controller.signal, redirect: 'follow' });
    if (!response.ok) throw new Error(`Rocky Beach antwortete mit HTTP ${response.status}.`);
    const bytes = new Uint8Array(await response.arrayBuffer());
    const contentType = response.headers.get('content-type') || '';
    const headAscii = Buffer.from(bytes.slice(0, 4096)).toString('latin1');
    const charset = contentType.match(/charset\s*=\s*['"]?([^;\s'"]+)/i)?.[1]
      || headAscii.match(/charset\s*=\s*['"]?([^;\s'">]+)/i)?.[1]
      || 'utf-8';
    let html;
    try { html = new TextDecoder(charset).decode(bytes); }
    catch { html = new TextDecoder('utf-8').decode(bytes); }
    return { html, headers: response.headers, url: response.url };
  } finally {
    clearTimeout(timer);
  }
}

function responseCookie(headers) {
  if (typeof headers.getSetCookie === 'function') {
    return headers.getSetCookie().map((item) => item.split(';', 1)[0]).join('; ');
  }
  const raw = headers.get('set-cookie');
  return raw ? raw.split(',').map((item) => item.trim().split(';', 1)[0]).join('; ') : '';
}

async function fetchHoerspielRatingPage() {
  const first = await fetchHtml(SOURCE_URL);
  const form = findRatingForm(first.html);
  const request = buildFormRequest(form, first.url || SOURCE_URL);
  const second = await fetchHtml(request.url, request.options, responseCookie(first.headers));
  const pageText = normalizeText(stripTags(second.html));
  if (!pageText.includes('folgenbewertungen der die drei horspielserie') && !pageText.includes('folgenbewertungen der die drei fragezeichen horspielserie')) {
    const heading = stripTags(second.html).match(/Folgenbewertungen[^\n]{0,120}/i)?.[0] || 'unbekannte Ansicht';
    throw new Error(`Rocky Beach lieferte nicht die Hörspielserie (${heading}). Die Daten werden aus Sicherheitsgründen nicht übernommen.`);
  }
  if (pageText.includes('folgenbewertungen der die drei fragezeichen buchserie')) {
    throw new Error('Rocky Beach lieferte die Buchserie. Die Daten werden nicht übernommen.');
  }
  return second.html;
}

function parseRatingRows(html) {
  const rows = [];
  const trPattern = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
  let match;
  while ((match = trPattern.exec(html || ''))) {
    const text = stripTags(match[1]);
    const tail = text.match(/([1-6](?:[.,]\d{1,6})?)\s+(\d+)\s+(\d+)\s*$/);
    if (!tail) continue;
    const before = text.slice(0, tail.index).trim();
    const titleAndNumber = before.match(/(.+?)\s*\((\d+)\)\s*$/);
    if (!titleAndNumber) continue;
    const number = Number(titleAndNumber[2]);
    const rating = Number(tail[1].replace(',', '.'));
    const rank = Number(tail[2]);
    const votes = Number(tail[3]);
    if (!Number.isInteger(number) || number <= 0 || !Number.isFinite(rating) || !Number.isInteger(rank) || !Number.isInteger(votes)) continue;
    rows.push({ number, title: titleAndNumber[1].trim(), rating, rank, votes });
  }
  return rows;
}

function validateAndMap(rows, catalog) {
  if (rows.length < MIN_PARSED_ROWS) throw new Error(`Nur ${rows.length} Bewertungszeilen erkannt; erwartet werden mindestens ${MIN_PARSED_ROWS}.`);

  const duplicateNumbers = rows.map((row) => row.number).filter((number, index, all) => all.indexOf(number) !== index);
  if (duplicateNumbers.length) throw new Error(`Doppelte Rocky-Beach-Folgennummern erkannt: ${[...new Set(duplicateNumbers)].join(', ')}`);

  const catalogByNumber = new Map(
    catalog
      .filter((episode) => Number.isInteger(Number(episode.nr)) && Number(episode.nr) > 0 && (episode.collection || 'main') === 'main')
      .map((episode) => [Number(episode.nr), episode]),
  );

  const mismatches = [];
  const mapped = {};
  for (const row of rows) {
    if (row.rating < 1 || row.rating > 6) throw new Error(`Ungültige Bewertung für Folge ${row.number}: ${row.rating}`);
    if (row.rank < 1 || row.rank > 2000) throw new Error(`Ungültiger Rang für Folge ${row.number}: ${row.rank}`);
    if (row.votes < 0 || row.votes > 1_000_000) throw new Error(`Ungültige Stimmenzahl für Folge ${row.number}: ${row.votes}`);

    const local = catalogByNumber.get(row.number);
    if (!local) continue;
    if (canonicalTitle(local.titel ?? local.title) !== canonicalTitle(row.title)) {
      mismatches.push(`#${row.number}: lokal „${local.titel ?? local.title}“ / Rocky Beach „${row.title}“`);
      continue;
    }
    mapped[String(row.number)] = {
      title: String(local.titel ?? local.title).trim(),
      rating: row.rating,
      rank: row.rank,
      votes: row.votes,
    };
  }

  if (mismatches.length) {
    throw new Error(`Titel-/Nummern-Abgleich fehlgeschlagen. Kein Update wird geschrieben.\n${mismatches.slice(0, 12).join('\n')}`);
  }
  if (Object.keys(mapped).length < MIN_MATCHED_ROWS) {
    throw new Error(`Nur ${Object.keys(mapped).length} Hörspielfolgen konnten sicher dem lokalen Katalog zugeordnet werden; erwartet werden mindestens ${MIN_MATCHED_ROWS}.`);
  }
  return mapped;
}

async function readJson(path, fallback) {
  try { return JSON.parse(await readFile(path, 'utf8')); } catch { return fallback; }
}

async function main() {
  const catalog = await readJson(CATALOG_PATH, null);
  if (!Array.isArray(catalog) || !catalog.length) throw new Error('episodes.json fehlt oder enthält keinen gültigen Katalog.');

  const html = await fetchHoerspielRatingPage();
  const rows = parseRatingRows(html);
  const episodes = validateAndMap(rows, catalog);
  const previous = await readJson(OUTPUT_PATH, { episodes: {} });

  const previousEpisodes = previous?.episodes && typeof previous.episodes === 'object' ? previous.episodes : {};
  if (JSON.stringify(previousEpisodes) === JSON.stringify(episodes)) {
    console.log(`Keine Änderung: ${Object.keys(episodes).length} Rocky-Beach-Hörspielwertungen sind bereits aktuell.`);
    return;
  }

  const output = {
    schemaVersion: 1,
    source: 'rocky-beach.com',
    sourceView: 'Die drei ??? Hörspielserie',
    updatedAt: new Date().toISOString(),
    episodes,
  };
  await writeFile(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
  console.log(`Aktualisiert: ${Object.keys(episodes).length} sicher zugeordnete Hörspielwertungen.`);
}

main().catch((error) => {
  console.error(`Rocky-Beach-Update abgebrochen: ${error.message}`);
  process.exitCode = 1;
});
