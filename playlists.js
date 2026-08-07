import { appState, availableEpisode, clamp, getEpisode, nowIso, saveUser, uid } from './core.js';
import { moodMatches } from './catalog.js';
import { buildTasteProfile, recommendationScore, similarEpisodes } from './recommendations.js';

export const CURATED_PLAYLISTS = [
  { id:'hugenay', icon:'♛', title:'Die Hugenay-Chronik', description:'Die wichtigsten Auftritte des Meisterdiebs.', category:'essentials', type:'numbers', numbers:[1,12,16,103,125], sequence:true },
  { id:'feuriges-auge', icon:'◆', title:'Vom Rubin zum Feurigen Auge', description:'Klassischer Ursprung und Jubiläumsfortsetzung.', category:'essentials', type:'numbers', numbers:[5,200], sequence:true },
  { id:'jubilaeum', icon:'★', title:'Die großen Jubiläen', description:'Die langen Jubiläumsfälle in Reihenfolge.', category:'essentials', type:'numbers', numbers:[100,125,150,175,200,225], sequence:true },
  { id:'halloween', icon:'☾', title:'Halloween in Rocky Beach', description:'Düstere und atmosphärische Fälle.', category:'essentials', type:'mood', mood:'grusel', max:14 },
  { id:'winter', icon:'❄', title:'Advent & Weihnachten', description:'Winterliche Hauptfolgen und Adventsspecials.', category:'essentials', type:'numbers', numbers:[77,142,202,10007,10008,10009,10010,10011,10012] },
  { id:'andre-marx', icon:'✎', title:'André Marx', description:'Fälle eines der prägendsten modernen Autoren.', category:'themes', type:'author', author:'André Marx', max:24 },
  { id:'summer', icon:'≈', title:'Sommer, Meer & Inseln', description:'Küste, Schiffe, Tauchen und Inseln.', category:'themes', type:'mood', mood:'meer', max:18 },
  { id:'skinny', icon:'⚡', title:'Skinny Norris', description:'Folgen mit dem ewigen Rivalen.', category:'themes', type:'mood', mood:'skinny', max:18 },
  { id:'familie', icon:'⌂', title:'Familie & Rocky Beach', description:'Tante Mathilda, Onkel Titus und vertraute Gesichter.', category:'themes', type:'mood', mood:'familie', max:18 },
  { id:'football', icon:'⚽', title:'Fußballfälle', description:'Stadien, Spieler, Fouls und Turniere.', category:'themes', type:'numbers', numbers:[63,81,123,141,153,164,176,245] },
];
export const STORY_BLOCKS = [
  { id:'hugenay', title:'Hugenay-Chronik', numbers:[1,12,16,103,125] },
  { id:'feuriges-auge', title:'Fluch des Rubins → Feuriges Auge', numbers:[5,200] },
  { id:'jubilaeum', title:'Jubiläumsfolgen', numbers:[100,125,150,175,200,225] },
];
export function curatedPlaylists(category='essentials') { return CURATED_PLAYLISTS.filter((item) => item.category === category); }
export function resolveCuratedPlaylist(definition) {
  let episodes = [];
  if (definition.type === 'numbers') episodes = definition.numbers.map(getEpisode).filter(Boolean);
  if (definition.type === 'author') episodes = appState.catalog.filter((episode) => episode.author === definition.author && availableEpisode(episode));
  if (definition.type === 'mood') episodes = appState.catalog.filter((episode) => moodMatches(episode,definition.mood) && availableEpisode(episode));
  if (definition.max) episodes = episodes.slice(0,definition.max);
  return { ...definition,id:`curated:${definition.id}`,name:definition.title,episodes };
}
export function getPlaylist(id) {
  if (String(id).startsWith('curated:')) { const definition = CURATED_PLAYLISTS.find((item) => item.id === String(id).slice(8)); return definition ? resolveCuratedPlaylist(definition) : null; }
  const playlist = appState.user.playlists.find((item) => item.id === id); return playlist ? { ...playlist,episodes:playlist.episodeNrs.map(getEpisode).filter(Boolean) } : null;
}
export function createPlaylist({name,description='',episodeNrs=[],generated=false}) {
  const playlist = { id:uid('playlist'),name:String(name || 'Neue Playlist').trim().slice(0,60),description:String(description).trim().slice(0,240),episodeNrs:[...new Set(episodeNrs.map(Number).filter(Number.isFinite))],createdAt:nowIso(),updatedAt:nowIso(),generated };
  appState.user.playlists.unshift(playlist); saveUser(); return playlist;
}
export function updatePlaylist(id,patch) { const playlist = appState.user.playlists.find((item) => item.id === id); if (!playlist) return null; if (patch.name != null) playlist.name = String(patch.name).trim().slice(0,60); if (patch.description != null) playlist.description = String(patch.description).trim().slice(0,240); playlist.updatedAt = nowIso(); saveUser(); return playlist; }
export function deletePlaylist(id) { appState.user.playlists = appState.user.playlists.filter((item) => item.id !== id); saveUser(); }
export function addEpisodeToPlaylist(id,nr) { const playlist = appState.user.playlists.find((item) => item.id === id); if (!playlist) return; const number = Number(nr); if (!playlist.episodeNrs.includes(number)) playlist.episodeNrs.push(number); playlist.updatedAt = nowIso(); saveUser(); }
export function removeEpisodeFromPlaylist(id,nr) { const playlist = appState.user.playlists.find((item) => item.id === id); if (!playlist) return; playlist.episodeNrs = playlist.episodeNrs.filter((item) => item !== Number(nr)); playlist.updatedAt = nowIso(); saveUser(); }
export function movePlaylistEpisode(id,nr,direction) { const playlist = appState.user.playlists.find((item) => item.id === id); if (!playlist) return; const index = playlist.episodeNrs.indexOf(Number(nr)); const next = clamp(index + direction,0,playlist.episodeNrs.length - 1); if (index < 0 || index === next) return; [playlist.episodeNrs[index],playlist.episodeNrs[next]] = [playlist.episodeNrs[next],playlist.episodeNrs[index]]; playlist.updatedAt = nowIso(); saveUser(); }
export function playlistStats(episodes) {
  const total = episodes.length; const heard = episodes.filter((episode) => appState.user.episodes?.[episode.nr]?.heard).length;
  const duration = episodes.reduce((sum,episode) => sum + (Number(episode.durationMin) || 0),0); const remaining = episodes.filter((episode) => !appState.user.episodes?.[episode.nr]?.heard).reduce((sum,episode) => sum + (Number(episode.durationMin) || 0),0);
  return { total,heard,duration,remaining };
}
function proposalSignature(values=[]) {
  return [...new Set(values.map(Number).filter(Number.isFinite))].sort((a,b)=>a-b).join(',');
}
function normalizeProposalRounds(recentProposals=[],previousEpisodeNrs=[]) {
  const source=[...(Array.isArray(recentProposals)?recentProposals:[])];
  if (Array.isArray(previousEpisodeNrs)&&previousEpisodeNrs.length) source.push(previousEpisodeNrs);
  const rounds=[]; const signatures=new Set();
  for (const value of source) {
    const round=[...new Set((Array.isArray(value)?value:[]).map(Number).filter(Number.isFinite))];
    const signature=proposalSignature(round);
    if (!round.length||signatures.has(signature)) continue;
    signatures.add(signature); rounds.push(round);
  }
  return rounds.slice(-2);
}
function candidateBlocks({status,mood,author,continuity,excludedNrs=new Set()}) {
  const basePool=appState.catalog.filter(availableEpisode)
    .filter((episode)=>status==='mixed'||(status==='heard')===Boolean(appState.user.episodes?.[episode.nr]?.heard))
    .filter((episode)=>mood==='any'||moodMatches(episode,mood))
    .filter((episode)=>author==='all'||episode.author===author);
  const pool=basePool.filter((episode)=>!excludedNrs.has(episode.nr));
  const used=new Set(); const blocks=[];
  if (continuity) for (const block of STORY_BLOCKS) {
    const eligible=block.numbers.map((nr)=>basePool.find((episode)=>episode.nr===nr)).filter(Boolean);
    const episodes=eligible.filter((episode)=>!excludedNrs.has(episode.nr));
    if (eligible.length>1&&episodes.length===eligible.length&&!episodes.some((episode)=>used.has(episode.nr))) {
      blocks.push({episodes,duration:episodes.reduce((sum,item)=>sum+(item.durationMin||0),0),label:block.title});
      episodes.forEach((item)=>used.add(item.nr));
    }
  }
  for (const episode of pool) if (!used.has(episode.nr)) {
    blocks.push({episodes:[episode],duration:episode.durationMin||55,label:episode.titel});
  }
  return blocks;
}
function weightedSmartChoice(candidates) {
  const pool=candidates.slice(0,Math.min(12,candidates.length));
  if (!pool.length) return null;
  const floor=Math.min(...pool.map((entry)=>entry.score));
  const weights=pool.map((entry)=>Math.max(.18,entry.score-floor+.55));
  let roll=Math.random()*weights.reduce((sum,value)=>sum+value,0);
  for (let index=0;index<pool.length;index++) {
    roll-=weights[index];
    if (roll<=0) return pool[index];
  }
  return pool[0];
}
export function generateSmartPlaylist(
  {name,targetMinutes,mood='any',status='unheard',author='all',continuity=true},
  {recentProposals=[],previousEpisodeNrs=[]}={}
) {
  const target=Math.max(20,Number(targetMinutes)||120);
  const profile=buildTasteProfile();
  const rounds=normalizeProposalRounds(recentProposals,previousEpisodeNrs);
  const latestRound=rounds.at(-1)||[];
  const latestSet=new Set(latestRound);
  const recentSet=new Set(rounds.flat());
  const rejectedSignatures=new Set(rounds.map(proposalSignature));
  const passes=rounds.length
    ? [
        {excludedNrs:new Set(recentSet),cooldownRelaxed:false},
        ...(rounds.length>1?[{excludedNrs:new Set(latestSet),cooldownRelaxed:true}]:[]),
        {excludedNrs:new Set(),cooldownRelaxed:true},
      ]
    : [{excludedNrs:new Set(),cooldownRelaxed:false}];

  for (const pass of passes) {
    const blocks=candidateBlocks({status,mood,author,continuity,excludedNrs:pass.excludedNrs});
    if (!blocks.length) continue;
    const candidateMap=new Map();

    for (let attempt=0;attempt<700;attempt++) {
      const shuffled=blocks.map((block)=>({
        block,
        key:Math.random()+recommendationScore(block.episodes[0],profile,{useDiversity:false}).total*.065,
      })).sort((a,b)=>b.key-a.key).map((entry)=>entry.block);

      const chosen=[]; let estimatedDuration=0;
      for (const block of shuffled) {
        const next=estimatedDuration+block.duration;
        if (next>target+18) continue;
        const improves=Math.abs(target-next)<=Math.abs(target-estimatedDuration);
        if (next<=target||improves||Math.random()<.16) {
          chosen.push(block); estimatedDuration=next;
        }
      }
      if (!chosen.length) continue;

      const seen=new Set();
      const episodes=chosen.flatMap((block)=>block.episodes).filter((episode)=>{
        if (seen.has(episode.nr)) return false;
        seen.add(episode.nr); return true;
      });
      if (!episodes.length) continue;

      const signature=proposalSignature(episodes.map((episode)=>episode.nr));
      if (!signature||rejectedSignatures.has(signature)) continue;

      const duration=episodes.reduce((sum,episode)=>sum+(episode.durationMin||0),0);
      const quality=episodes.reduce(
        (sum,episode)=>sum+recommendationScore(episode,profile,{useDiversity:false}).total,
        0
      )/episodes.length;
      const repeatedLatest=episodes.filter((episode)=>latestSet.has(episode.nr)).length;
      const repeatedRecent=episodes.filter((episode)=>recentSet.has(episode.nr)).length;
      const newEpisodes=episodes.length-repeatedLatest;
      const score=
        -Math.abs(duration-target)
        +quality*7
        +Math.min(episodes.length,8)*.65
        +newEpisodes*2.4
        -repeatedRecent*4.8
        -repeatedLatest*6.5;

      const candidate={
        episodes,duration,score,signature,newEpisodes,
        repeatedEpisodes:repeatedLatest,
        cooldownRelaxed:pass.cooldownRelaxed,
      };
      const existing=candidateMap.get(signature);
      if (!existing||candidate.score>existing.score) candidateMap.set(signature,candidate);
    }

    const candidates=[...candidateMap.values()].sort((a,b)=>b.score-a.score);
    const selected=weightedSmartChoice(candidates);
    if (!selected) continue;

    return {
      name:String(name||'Meine Hörsession').trim().slice(0,60)||'Meine Hörsession',
      description:`Automatisch geplant für ungefähr ${target} Minuten.`,
      targetMinutes:target,
      options:{mood,status,author,continuity},
      episodeNrs:selected.episodes.map((episode)=>episode.nr),
      ...selected,
    };
  }
  return null;
}
export function playlistSuggestions(id,limit=6) {
  const playlist = getPlaylist(id); if (!playlist?.episodes?.length || String(id).startsWith('curated:')) return [];
  const excluded = new Set(playlist.episodes.map((episode) => episode.nr)); const scores = new Map();
  for (const source of playlist.episodes.slice(-5)) for (const entry of similarEpisodes(source,12)) if (!excluded.has(entry.episode.nr)) {
    const current = scores.get(entry.episode.nr) || {episode:entry.episode,score:0,reasons:[]}; current.score += entry.score; current.reasons.push(...entry.reasons); scores.set(entry.episode.nr,current);
  }
  return [...scores.values()].sort((a,b) => b.score-a.score).slice(0,limit);
}
