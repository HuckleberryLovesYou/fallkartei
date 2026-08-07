import { appState, availableEpisode, clamp, getEpisode, nowIso, saveUser, uid } from './core.js';
import { moodMatches } from './catalog.js';
import { buildTasteProfile, recommendationScore, similarEpisodes } from './recommendations.js';

export const CURATED_PLAYLISTS = [
  { id:'hugenay', icon:'♛', title:'Die Hugenay-Chronik', description:'Die wichtigsten Auftritte des Meisterdiebs.', category:'essentials', type:'numbers', numbers:[1,12,73,103,125,237], sequence:true },
  { id:'feuriges-auge', icon:'◆', title:'Vom Rubin zum Feurigen Auge', description:'Klassischer Ursprung und Jubiläumsfortsetzung.', category:'essentials', type:'numbers', numbers:[5,200], sequence:true },
  { id:'live-originals', icon:'◉', title:'Eigenständige Live-Fälle', description:'Geschichten, die eigens für die Bühne entstanden sind.', category:'essentials', type:'numbers', numbers:[10101,10102,10103], sequence:true },
  { id:'jubilaeum', icon:'★', title:'Die großen Jubiläen', description:'Die langen Jubiläumsfälle in Reihenfolge.', category:'essentials', type:'numbers', numbers:[100,125,150,175,200,225], sequence:true },
  { id:'halloween', icon:'☾', title:'Halloween in Rocky Beach', description:'Düstere und atmosphärische Fälle.', category:'essentials', type:'mood', mood:'grusel', max:14 },
  { id:'winter', icon:'❄', title:'Advent & Weihnachten', description:'Winterliche Hauptfolgen und Adventsspecials.', category:'essentials', type:'numbers', numbers:[77,142,202,10007,10008,10009,10010,10011,10012] },
  { id:'andre-marx', icon:'✎', title:'André Marx', description:'Fälle eines der prägendsten modernen Autoren.', category:'themes', type:'author', author:'André Marx', max:24 },
  { id:'summer', icon:'≈', title:'Sommer, Meer & Inseln', description:'Küste, Schiffe, Tauchen und Inseln.', category:'themes', type:'mood', mood:'meer', max:18 },
  { id:'skinny', icon:'⚡', title:'Skinny Norris', description:'Folgen mit dem ewigen Rivalen.', category:'themes', type:'mood', mood:'skinny', max:18 },
  { id:'familie', icon:'⌂', title:'Familie & Rocky Beach', description:'Tante Mathilda, Onkel Titus und vertraute Gesichter.', category:'themes', type:'mood', mood:'familie', max:18 },
  { id:'football', icon:'⚽', title:'Fußballfälle', description:'Stadien, Spieler, Fouls und Turniere.', category:'themes', type:'numbers', numbers:[63,81,123,141,153,164,176,245] },
];
export const STORY_RELATIONS = [
  { id:'brittany', title:'Hugenay & Brittany', type:'Direkte Fortsetzung', strength:100, ordered:true, numbers:[103,125], description:'Feuermond führt den in Das Erbe des Meisterdiebs begonnenen Hugenay- und Brittany-Strang direkt weiter.' },
  { id:'clarissa', title:'Clarissa Franklin', type:'Fortlaufender Handlungsstrang', strength:96, ordered:true, numbers:[76,99,188,226], description:'Clarissa Franklin kehrt über mehrere Fälle als zentrale Gegenspielerin zurück und ihre Geschichte wird wieder aufgegriffen.' },
  { id:'rubin', title:'Vom Fluch des Rubins zum Feurigen Auge', type:'Direkter Rückbezug', strength:95, ordered:true, numbers:[5,200], description:'Das Feurige Auge greift den Rubin und Motive aus dem frühen Fall Der Fluch des Rubins ausdrücklich wieder auf.' },
  { id:'hugenay', title:'Victor Hugenay', type:'Handlungsstrang', strength:92, ordered:true, numbers:[1,12,73,103,125,237], description:'Victor Hugenay kehrt als Meisterdieb in mehreren Fällen wieder; spätere Begegnungen bauen teilweise auf früheren auf.' },
  { id:'taipan-callbacks', title:'Der dunkle Taipan · klassische Rückbezüge', type:'Callback-Netz', strength:88, ordered:false, anchor:10103, numbers:[2,5,16,23,25,10103], description:'Der Live-Fall verbindet bewusst Figuren, Gegenstände und Motive aus mehreren klassischen Fällen.' },
  { id:'allie', title:'Allie Jamison & Familie Osborne', type:'Wiederkehrende Figuren', strength:74, ordered:true, numbers:[25,26,148,196,10103], description:'Allie Jamison und ihr familiäres Umfeld tauchen in mehreren Fällen wieder auf und verbinden die Geschichten miteinander.' },
  { id:'dick-perry', title:'Dick Perry', type:'Wiederkehrender Gegenspieler', strength:70, ordered:true, numbers:[104,124], description:'Dick Perry kehrt als Gegenspieler zurück; die spätere Folge knüpft an seine frühere Rolle an.' },
  { id:'jelena', title:'Jelena Charkova', type:'Wiederkehrende Figur', strength:66, ordered:true, numbers:[84,95,100,121], description:'Jelena Charkova ist eine wiederkehrende Figur und verbindet mehrere Fälle aus Bobs Umfeld.' },
  { id:'rubbish-george', title:'Rubbish-George', type:'Wiederkehrende Figur', strength:62, ordered:true, numbers:[125,129,152,197,200,214,237,238], description:'Rubbish-George kehrt als Informant und bekannte Figur in mehreren späteren Fällen zurück.' },
  { id:'skinny', title:'Skinny Norris', type:'Wiederkehrender Rivale', strength:58, ordered:true, numbers:[9,13,17,23,100,117,130,149,157,180], description:'Skinny Norris taucht über viele Jahre immer wieder als Rivale der drei ??? auf.' },
  { id:'weihnachten', title:'Weihnachtsspecials', type:'Themenreihe', strength:44, ordered:true, mandatory:false, numbers:[10007,10008,10009,10010,10011,10012], description:'Eigenständige Advents- und Weihnachtsgeschichten mit gemeinsamem saisonalem Rahmen.' },
  { id:'jubilaeum', title:'Jubiläumsfolgen', type:'Formatreihe', strength:30, ordered:true, mandatory:false, numbers:[100,125,150,175,200,225], description:'Die großen Jubiläumsfolgen bilden eine Formatreihe; das ist kein durchgehender Handlungsstrang.' },
  { id:'live-format', title:'Eigenständige Live-Fälle', type:'Live-Specials', strength:26, ordered:true, mandatory:false, numbers:[10101,10102,10103], description:'Eigenständige Geschichten, die eigens für große Live-Produktionen entstanden sind.' },
];
// Rückwärtskompatibel für externe Imports; die Smart-Playlist nutzt ab 1.4.0 STORY_RELATIONS.
export const STORY_BLOCKS = STORY_RELATIONS;
export function storyRelationsForEpisode(nr) {
  const number=Number(nr);
  if(!Number.isFinite(number)) return [];
  return STORY_RELATIONS
    .filter((relation)=>relation.numbers.includes(number))
    .map((relation)=>({
      ...relation,
      episodes:relation.numbers.map(getEpisode).filter(Boolean),
      relatedEpisodes:relation.numbers.filter((item)=>item!==number).map(getEpisode).filter(Boolean),
    }))
    .filter((relation)=>relation.relatedEpisodes.length)
    .sort((a,b)=>b.strength-a.strength);
}
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
function filteredSmartPool({status,mood,author,excludedNrs=new Set()}) {
  return appState.catalog.filter(availableEpisode)
    .filter((episode)=>status==='mixed'||(status==='heard')===Boolean(appState.user.episodes?.[episode.nr]?.heard))
    .filter((episode)=>mood==='any'||moodMatches(episode,mood))
    .filter((episode)=>author==='all'||episode.author===author)
    .filter((episode)=>!excludedNrs.has(episode.nr));
}
function smartCombinations(items,min=2,max=4) {
  const result=[];
  const limit=Math.min(max,items.length);
  function walk(start,current,size) {
    if(current.length===size){result.push([...current]);return;}
    for(let index=start;index<items.length;index++){
      current.push(items[index]);walk(index+1,current,size);current.pop();
    }
  }
  for(let size=min;size<=limit;size++) walk(0,[],size);
  return result;
}
function relationClusters(pool,target) {
  const byNr=new Map(pool.map((episode)=>[episode.nr,episode]));
  const clusters=[];
  const seen=new Set();

  for(const relation of STORY_RELATIONS) {
    const eligible=relation.numbers.map((nr)=>byNr.get(nr)).filter(Boolean);
    if(eligible.length<2) continue;

    let subsets=[];
    if(relation.anchor) {
      const anchor=byNr.get(relation.anchor);
      if(!anchor) continue;
      const others=eligible.filter((episode)=>episode.nr!==relation.anchor);
      for(const combo of smartCombinations(others,1,Math.min(3,others.length))) subsets.push([anchor,...combo]);
    } else if(relation.ordered) {
      for(let length=2;length<=Math.min(4,eligible.length);length++){
        for(let start=0;start<=eligible.length-length;start++) subsets.push(eligible.slice(start,start+length));
      }
    } else {
      subsets=smartCombinations(eligible,2,4);
    }

    for(const episodes of subsets) {
      const duration=episodes.reduce((sum,episode)=>sum+(Number(episode.durationMin)||55),0);
      if(duration>target+18) continue;
      const signature=`${relation.id}:${proposalSignature(episodes.map((episode)=>episode.nr))}`;
      if(seen.has(signature)) continue;
      seen.add(signature);
      clusters.push({
        relation,
        episodes,
        duration,
        mandatory:relation.mandatory!==false&&relation.strength>=55,
      });
    }
  }
  return clusters;
}
function relationAffinity(nr,anchorNrs=[]) {
  let best=0;
  const anchors=new Set(anchorNrs.map(Number));
  for(const relation of STORY_RELATIONS) {
    if(!relation.numbers.includes(Number(nr))) continue;
    if(relation.numbers.some((item)=>anchors.has(Number(item)))) best=Math.max(best,relation.strength);
  }
  return best;
}
function weightedRelationChoice(clusters,target,profile) {
  if(!clusters.length) return null;
  const ranked=clusters.map((cluster)=>{
    const quality=cluster.episodes.reduce(
      (sum,episode)=>sum+recommendationScore(episode,profile,{useDiversity:false}).total,
      0
    )/cluster.episodes.length;
    const fit=Math.max(0,1-Math.abs(target-cluster.duration)/Math.max(target,1));
    return {
      cluster,
      score:cluster.relation.strength*.38+quality*4.4+fit*20+Math.min(cluster.episodes.length,4)*2,
    };
  }).sort((a,b)=>b.score-a.score).slice(0,12);

  const floor=Math.min(...ranked.map((entry)=>entry.score));
  const weights=ranked.map((entry)=>Math.max(.25,entry.score-floor+1));
  let roll=Math.random()*weights.reduce((sum,value)=>sum+value,0);
  for(let index=0;index<ranked.length;index++){
    roll-=weights[index];
    if(roll<=0) return ranked[index].cluster;
  }
  return ranked[0].cluster;
}
function fillAroundRelation({pool,anchor,target,profile}) {
  const chosen=[...(anchor?.episodes||[])];
  const chosenSet=new Set(chosen.map((episode)=>episode.nr));
  let duration=chosen.reduce((sum,episode)=>sum+(Number(episode.durationMin)||55),0);
  const anchorNrs=chosen.map((episode)=>episode.nr);

  const candidates=pool.filter((episode)=>!chosenSet.has(episode.nr));
  const shuffled=candidates.map((episode)=>{
    const personal=recommendationScore(episode,profile,{useDiversity:false}).total;
    const affinity=anchor?relationAffinity(episode.nr,anchorNrs):0;
    return {
      episode,
      affinity,
      key:Math.random()+personal*.065+affinity*.011,
    };
  }).sort((a,b)=>b.key-a.key);

  for(const entry of shuffled) {
    const episode=entry.episode;
    const episodeDuration=Number(episode.durationMin)||55;
    const next=duration+episodeDuration;
    if(next>target+18) continue;
    const improves=Math.abs(target-next)<=Math.abs(target-duration);
    if(next<=target||improves||Math.random()<.12){
      chosen.push(episode);
      chosenSet.add(episode.nr);
      duration=next;
    }
  }
  return {episodes:chosen,duration};
}
function continuityMeta(anchor,enabled,clusters) {
  if(!enabled) return {enabled:false,used:false};
  if(!anchor) {
    return {
      enabled:true,
      used:false,
      reason:clusters.length
        ?'Eine Verbindung war vorhanden, passte aber nicht stabil in die beste Zusammenstellung.'
        :'Mit diesen Filtern und der Zielzeit war keine zusammenhängende Gruppe aus mindestens zwei Folgen möglich.',
    };
  }
  return {
    enabled:true,
    used:true,
    id:anchor.relation.id,
    title:anchor.relation.title,
    type:anchor.relation.type,
    strength:anchor.relation.strength,
    reason:anchor.relation.description||'',
    episodeNrs:anchor.episodes.map((episode)=>episode.nr),
  };
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

  for(const pass of passes) {
    const pool=filteredSmartPool({
      status,mood,author,
      excludedNrs:pass.excludedNrs,
    });
    if(!pool.length) continue;

    const clusters=continuity?relationClusters(pool,target):[];
    const mandatoryClusters=clusters.filter((cluster)=>cluster.mandatory);
    const requireConnection=continuity&&mandatoryClusters.length>0;
    const candidateMap=new Map();

    for(let attempt=0;attempt<700;attempt++) {
      let anchor=null;
      if(continuity&&clusters.length){
        const source=requireConnection?mandatoryClusters:clusters;
        // Bei vorhandener starker Verbindung ist ein Zusammenhang keine Option mehr,
        // sondern Pflicht. Schwächere Themenreihen dienen nur als Bonus.
        if(requireConnection||Math.random()<.62) anchor=weightedRelationChoice(source,target,profile);
      }

      const built=fillAroundRelation({pool,anchor,target,profile});
      const episodes=built.episodes;
      if(!episodes.length) continue;

      if(requireConnection&&(!anchor||anchor.episodes.length<2)) continue;

      const signature=proposalSignature(episodes.map((episode)=>episode.nr));
      if(!signature||rejectedSignatures.has(signature)) continue;

      const quality=episodes.reduce(
        (sum,episode)=>sum+recommendationScore(episode,profile,{useDiversity:false}).total,
        0
      )/episodes.length;
      const repeatedLatest=episodes.filter((episode)=>latestSet.has(episode.nr)).length;
      const repeatedRecent=episodes.filter((episode)=>recentSet.has(episode.nr)).length;
      const newEpisodes=episodes.length-repeatedLatest;
      const connectionBonus=anchor
        ? anchor.relation.strength*.16+Math.max(0,anchor.episodes.length-1)*4.2
        : 0;
      const score=
        -Math.abs(built.duration-target)
        +quality*7
        +Math.min(episodes.length,8)*.65
        +newEpisodes*2.4
        +connectionBonus
        -repeatedRecent*4.8
        -repeatedLatest*6.5;

      const candidate={
        episodes,
        duration:built.duration,
        score,
        signature,
        newEpisodes,
        repeatedEpisodes:repeatedLatest,
        cooldownRelaxed:pass.cooldownRelaxed,
        continuity:continuityMeta(anchor,continuity,clusters),
      };
      const existing=candidateMap.get(signature);
      if(!existing||candidate.score>existing.score) candidateMap.set(signature,candidate);
    }

    const candidates=[...candidateMap.values()].sort((a,b)=>b.score-a.score);
    const selected=weightedSmartChoice(candidates);
    if(!selected) continue;

    return {
      name:String(name||'Meine Hörsession').trim().slice(0,60)||'Meine Hörsession',
      description:selected.continuity?.used
        ?`Automatisch geplant für ungefähr ${target} Minuten · Zusammenhang: ${selected.continuity.title}.`
        :`Automatisch geplant für ungefähr ${target} Minuten.`,
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
