import {
  APP_VERSION, STREAMING_SERVICES, appState, RATING_LABELS, RATING_ORDER, activityCount, addListen, addManyToQueue, availableEpisode, beginArchiveDebugSession, completionEligibleEpisode,
  cleanProfileName, downloadBlob, esc, formatDate, formatDuration, formatRelativeDate, getArchiveCode, getEpisode, loadUser, moveQueueItem, nowIso, persistFilters,
  endArchiveDebugSession, normalizeText, profileInitials, profileRatingCount, removeFromQueue, removeListen, resetRuntimeState, saveUser, setArchiveShareStyle, setHeard, setNote, setRating, setStoredFilters,
  togglePinned, toggleQueue, unlockArchiveDossier, unlockFourthQuestionMark,
} from './core.js';
import { catalogValidation, clearCatalogCache, loadCatalog, moodMatches, refreshMetadata, searchScore, timeMatches } from './catalog.js';
import {
  adjustFeatureFeedback, buildTasteProfile, chooseRecommendation, feedbackOptions, hideRecommendation, matchPresentation,
  recommendationScore, restoreHiddenRecommendations, similarEpisodes, snoozeRecommendation, topProfileInsights,
} from './recommendations.js';
import {
  addEpisodeToPlaylist, createPlaylist, curatedPlaylists, deletePlaylist, generateSmartPlaylist, getPlaylist,
  movePlaylistEpisode, playlistStats, playlistSuggestions, removeEpisodeFromPlaylist, resolveCuratedPlaylist, updatePlaylist,
} from './playlists.js';
import { applyImport, backupPreview, emptyPersonalData, exportBackup, parseBackupText } from './backup.js';

const $ = (id) => document.getElementById(id);
const $$ = (selector,root=document) => [...root.querySelectorAll(selector)];
const symbols = { minus:'−',neutral:'0',plus:'+',super:'★' };
let toastTimer, confirmResolver, noteTimer, pendingWorker, reloadingForUpdate = false, smartPlaylistBusy = false, profileEditorReturn = 'profile';
let achievementChecksEnabled=false,archiveCheckQueued=false,archiveBadgeTapCount=0,archiveBadgeTapTimer,settingsSecretTapCount=0,settingsSecretTimer;
const ARCHIVE_DEBUG_PASSWORD='AKTE100';

function toast(message,type='default') { const node=$('toast'); node.textContent=message; node.dataset.type=type; node.classList.remove('hidden'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>node.classList.add('hidden'),2700); }
function resetSheetPosition(dialog) {
  if (!dialog) return;
  dialog.classList.remove('is-dragging','is-resetting','is-dismissing');
  dialog.style.removeProperty('transform');
  dialog.style.removeProperty('--sheet-drag-progress');
}
function openDialog(id) {
  const dialog=$(id);
  if (!dialog) return;
  resetSheetPosition(dialog);
  dialog.tabIndex=-1;
  if (!dialog.open) dialog.showModal();
  document.documentElement.classList.add('dialog-open');
  requestAnimationFrame(()=>{
    if (!dialog.open) return;
    try { dialog.focus({preventScroll:true}); }
    catch { dialog.focus(); }
  });
}
function closeDialog(id) {
  const dialog=$(id);
  if (dialog?.open) dialog.close();
  resetSheetPosition(dialog);
  if (!$$('dialog[open]').length) document.documentElement.classList.remove('dialog-open');
}
function dismissSheet(dialog) {
  if (!dialog?.open || dialog.classList.contains('is-dismissing')) return;
  dialog.classList.remove('is-dragging','is-resetting');
  dialog.classList.add('is-dismissing');
  dialog.style.setProperty('--sheet-drag-progress','1');
  dialog.style.transform='translateY(calc(100% + 28px))';
  window.setTimeout(()=>closeDialog(dialog.id),180);
}
function setupSheetInteractions() {
  $$('.sheet-dialog').forEach((dialog)=>{
    if (dialog.dataset.sheetInteractions==='ready') return;
    dialog.dataset.sheetInteractions='ready';

    const isOutsideSheet=(clientX,clientY)=>{
      const rect=dialog.getBoundingClientRect();
      return clientX<rect.left||clientX>rect.right||clientY<rect.top||clientY>rect.bottom;
    };
    const dismissFromBackdrop=(target,clientX,clientY)=>{
      if (target!==dialog||!dialog.open||!Number.isFinite(clientX)||!Number.isFinite(clientY)) return;
      if (isOutsideSheet(clientX,clientY)) dismissSheet(dialog);
    };

    dialog.addEventListener('click',(event)=>{
      dismissFromBackdrop(event.target,event.clientX,event.clientY);
    });
    dialog.addEventListener('pointerdown',(event)=>{
      if (event.pointerType==='touch') return;
      dismissFromBackdrop(event.target,event.clientX,event.clientY);
    });
    dialog.addEventListener('touchend',(event)=>{
      const touch=event.changedTouches?.[0];
      if (touch) dismissFromBackdrop(event.target,touch.clientX,touch.clientY);
    },{passive:true});

    dialog.addEventListener('close',()=>{
      resetSheetPosition(dialog);
      if (!$$('dialog[open]').length) document.documentElement.classList.remove('dialog-open');
    });

    const handle=dialog.querySelector('.dialog-handle');
    if (!handle) return;

    let dragType=null,dragId=null,startY=0,lastY=0,startTime=0;

    const beginDrag=(type,id,clientY)=>{
      if (!dialog.open||dragType!==null||!Number.isFinite(clientY)) return false;
      dragType=type;
      dragId=id;
      startY=lastY=clientY;
      startTime=performance.now();
      dialog.classList.remove('is-resetting','is-dismissing');
      dialog.classList.add('is-dragging');
      return true;
    };

    const moveDrag=(clientY)=>{
      if (dragType===null||!Number.isFinite(clientY)) return;
      lastY=clientY;
      const distance=Math.max(0,clientY-startY);
      const range=Math.max(150,Math.min(260,dialog.getBoundingClientRect().height*.34));
      const progress=Math.min(1,distance/range);
      dialog.style.setProperty('--sheet-drag-progress',String(progress));
      dialog.style.transform=`translate3d(0,${distance}px,0)`;
    };

    const finishDrag=(clientY,cancelled=false)=>{
      if (dragType===null) return;
      const endY=Number.isFinite(clientY)?clientY:lastY;
      const distance=Math.max(0,endY-startY);
      const duration=Math.max(1,performance.now()-startTime);
      const velocity=distance/duration;
      dragType=null;
      dragId=null;

      if (!cancelled&&(distance>=72||(distance>=34&&velocity>=0.5))) {
        dismissSheet(dialog);
        return;
      }

      dialog.classList.remove('is-dragging');
      dialog.classList.add('is-resetting');
      dialog.style.setProperty('--sheet-drag-progress','0');
      dialog.style.transform='translate3d(0,0,0)';
      window.setTimeout(()=>resetSheetPosition(dialog),190);
    };

    /* Maus und Stift: Pointer Events */
    handle.addEventListener('pointerdown',(event)=>{
      if (event.pointerType==='touch'||(event.pointerType==='mouse'&&event.button!==0)) return;
      if (!beginDrag('pointer',event.pointerId,event.clientY)) return;
      handle.setPointerCapture?.(event.pointerId);
      event.preventDefault();
    });
    handle.addEventListener('pointermove',(event)=>{
      if (dragType!=='pointer'||dragId!==event.pointerId) return;
      moveDrag(event.clientY);
      event.preventDefault();
    });
    handle.addEventListener('pointerup',(event)=>{
      if (dragType==='pointer'&&dragId===event.pointerId) finishDrag(event.clientY);
    });
    handle.addEventListener('pointercancel',(event)=>{
      if (dragType==='pointer'&&dragId===event.pointerId) finishDrag(event.clientY,true);
    });
    handle.addEventListener('lostpointercapture',(event)=>{
      if (dragType==='pointer'&&dragId===event.pointerId) finishDrag(lastY,true);
    });

    /* iPhone, iPad und Android: explizite Touch Events */
    handle.addEventListener('touchstart',(event)=>{
      if (event.touches.length!==1) return;
      const touch=event.touches[0];
      if (!beginDrag('touch',touch.identifier,touch.clientY)) return;
      event.preventDefault();
    },{passive:false});

    handle.addEventListener('touchmove',(event)=>{
      if (dragType!=='touch') return;
      const touch=Array.from(event.touches).find((item)=>item.identifier===dragId);
      if (!touch) return;
      moveDrag(touch.clientY);
      event.preventDefault();
    },{passive:false});

    handle.addEventListener('touchend',(event)=>{
      if (dragType!=='touch') return;
      const touch=Array.from(event.changedTouches).find((item)=>item.identifier===dragId);
      finishDrag(touch?.clientY??lastY);
      event.preventDefault();
    },{passive:false});

    handle.addEventListener('touchcancel',(event)=>{
      if (dragType!=='touch') return;
      const touch=Array.from(event.changedTouches).find((item)=>item.identifier===dragId);
      finishDrag(touch?.clientY??lastY,true);
    },{passive:false});
  });
}
function confirmAction({title,text,accept='Bestätigen',danger=true,eyebrow='Bestätigen'}) {
  $('confirmEyebrow').textContent=eyebrow; $('confirmTitle').textContent=title; $('confirmText').textContent=text; $('confirmAccept').textContent=accept;
  $('confirmAccept').classList.toggle('danger',danger); $('confirmAccept').classList.toggle('primary',!danger); openDialog('confirmDialog');
  return new Promise((resolve)=>{confirmResolver=resolve;});
}
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve,milliseconds));
const waitForPaint = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
function setSmartPlannerButtonLoading(loading) {
  const button=$('createSmartPlaylist'); if (!button) return;
  button.disabled=loading; button.classList.toggle('is-loading',loading); button.setAttribute('aria-busy',String(loading));
  button.innerHTML=loading?'<span class="button-spinner" aria-hidden="true"></span><span>Vorschläge werden gesucht …</span>':'Vorschläge anzeigen';
}
function renderSmartPlaylistLoading(regenerate=false) {
  $('smartPlaylistDialogTitle').innerHTML=`<span class="eyebrow">Smart Playlist</span><h2>${regenerate?'Neue Kombination':'Passende Folgen'} wird gesucht</h2>`;
  $('smartPlaylistPreview').setAttribute('aria-busy','true');
  $('smartPlaylistPreview').innerHTML=`<div class="smart-loading" role="status" aria-live="polite"><span class="smart-loading-spinner" aria-hidden="true"></span><strong>${regenerate?'Andere Folgen werden zusammengestellt':'Dein Vorschlag wird zusammengestellt'}</strong><p>Die Fallkartei prüft Laufzeit, Filter, Zusammenhänge und persönliche Passung.</p></div>`;
}
function streamingOptions(episode) {
  const links=episode?.streamingLinks||{};
  return STREAMING_SERVICES.map((service)=>({ ...service, url:links[service.id]||episode?.[`${service.id}Url`]||'' })).filter((service)=>service.url);
}
function preferredStreaming(episode,service=appState.user.settings.preferredService) {
  const options=streamingOptions(episode);
  return options.find((entry)=>entry.id===service)||options[0]||null;
}
function streamingUrl(episode,service=appState.user.settings.preferredService) { return preferredStreaming(episode,service)?.url||''; }
function streamingName(url) {
  const host=String(url||'').toLowerCase();
  if(host.includes('music.apple.com'))return'Apple Music'; if(host.includes('bookbeat'))return'BookBeat'; if(host.includes('music.amazon'))return'Amazon Music';
  if(host.includes('music.youtube'))return'YouTube Music'; if(host.includes('deezer'))return'Deezer'; if(host.includes('amazon.'))return'Amazon'; return'Spotify';
}
function episodeTypeLabel(episode) {
  if(episode?.collection==='live') return 'Live-Special';
  return episode?.nr>=10000?'Spezialfolge':`Folge ${episode.nr}`;
}
function episodeTitle(episode) {
  return episode.nr>=10000 ? `${episode.collection==='live'?'Live':'Spezial'} · ${episode.titel}` : `${episode.nr} · ${episode.titel}`;
}
function metaLine(episode) { return [episode.author,episode.durationMin?formatDuration(episode.durationMin):null,episode.featuredCharacters?.[0],episode.year].filter(Boolean).map(esc).join(' · '); }
function statusOf(nr) { return appState.user.episodes?.[nr] || {}; }
function cloneValue(value) { return value == null ? value : JSON.parse(JSON.stringify(value)); }
function ratingButtons(nr,current,compact=false) { return `<div class="rating-buttons ${compact?'compact':''}">${['minus','neutral','plus','super'].map((rating)=>`<button class="rating-${rating} ${current===rating?'active':''}" data-action="rate" data-nr="${nr}" data-rating="${rating}" aria-label="${RATING_LABELS[rating]}">${symbols[rating]}${compact?'':`<small>${RATING_LABELS[rating]}</small>`}</button>`).join('')}</div>`; }
function miniRow(episode,queueControls=false) {
  const status=statusOf(episode.nr); return `<article class="mini-row"><button class="mini-main" data-open-episode="${episode.nr}"><span class="episode-number">${episode.nr>=10000?'✦':episode.nr}</span><span><strong>${esc(episode.titel)}</strong><small>${metaLine(episode)}</small></span></button>${queueControls?`<div class="row-actions"><button data-action="queue-up" data-nr="${episode.nr}">↑</button><button data-action="queue-down" data-nr="${episode.nr}">↓</button><button data-action="queue-remove" data-nr="${episode.nr}">×</button></div>`:`<div class="status-dots">${status.rating?`<span class="rating-dot ${status.rating}">${symbols[status.rating]}</span>`:status.heard?'<span class="heard-dot">✓</span>':''}</div>`}</article>`;
}
function compactCard(episode) {
  const status=statusOf(episode.nr),pinned=appState.user.pinned.includes(episode.nr);
  return `<article class="episode-card compact-card"><button class="episode-card-main" data-open-episode="${episode.nr}"><span class="episode-number">${episode.nr>=10000?'✦':episode.nr}</span><span class="episode-card-copy"><strong>${esc(episode.titel)}</strong><small>${metaLine(episode)}</small></span></button><div class="compact-actions">${status.rating?`<span class="rating-pill ${status.rating}">${symbols[status.rating]}</span>`:status.heard?'<span class="heard-pill">✓</span>':''}<button data-action="pin" data-nr="${episode.nr}" class="icon-button ${pinned?'active':''}">${pinned?'📌':'○'}</button></div></article>`;
}
function detailedCard(episode) {
  const status=statusOf(episode.nr),pinned=appState.user.pinned.includes(episode.nr),queued=appState.user.settings.queue.includes(episode.nr);
  return `<article class="episode-card detailed-card"><button class="episode-card-header" data-open-episode="${episode.nr}"><span class="episode-number">${episode.nr>=10000?'✦':episode.nr}</span><span><strong>${esc(episode.titel)}</strong><small>${metaLine(episode)}</small></span><span class="chevron">›</span></button>${episode.beschreibung?`<p>${esc(episode.beschreibung.slice(0,230))}${episode.beschreibung.length>230?' …':''}</p>`:''}<div class="episode-tags">${episode.tags.slice(0,4).map((tag)=>`<span>${esc(tag)}</span>`).join('')}</div>${ratingButtons(episode.nr,status.rating,true)}<div class="episode-card-footer"><button data-action="heard" data-nr="${episode.nr}" class="text-icon-button ${status.heard?'active':''}">${status.heard?'✓ Gehört':'Als gehört markieren'}</button><button data-action="queue" data-nr="${episode.nr}" class="text-icon-button ${queued?'active':''}">${queued?'✓ Als Nächstes':'＋ Als Nächstes'}</button><button data-action="pin" data-nr="${episode.nr}" class="text-icon-button ${pinned?'active':''}">${pinned?'📌 Angeheftet':'○ Anheften'}</button></div></article>`;
}
function coverCard(episode) {
  const status=statusOf(episode.nr),statusHtml=status.rating?`<span class="rating-pill ${status.rating}">${symbols[status.rating]}</span>`:status.heard?'<span class="heard-pill">✓</span>':'';
  const cover=episode.coverUrl?`<img src="${esc(episode.coverUrl)}" alt="Cover zu ${esc(episode.titel)}" loading="lazy" decoding="async" referrerpolicy="no-referrer" data-cover-image>`:'';
  return `<article class="cover-card"><button class="cover-card-main" data-open-episode="${episode.nr}"><span class="cover-art"><span class="cover-placeholder"><b>${episode.nr>=10000?'✦':episode.nr}</b><small>Die drei ???</small></span>${cover}<span class="cover-status">${statusHtml}</span></span><span class="cover-card-copy"><small>${episodeTypeLabel(episode)}</small><strong>${esc(episode.titel)}</strong><span>${esc(episode.author||'Autor unbekannt')}</span></span></button></article>`;
}

function actualArchiveProgress() {
  const available=appState.catalog.filter(completionEligibleEpisode);
  const heard=available.filter((episode)=>statusOf(episode.nr).heard).length;
  return {heard,total:available.length,percent:available.length?Math.round(heard/available.length*100):0};
}
function archiveUnlocked() {
  return Boolean(appState.user.settings.archiveUnlockedAt)||Boolean(appState.debugArchivePreview);
}
function archiveDisplayProgress() {
  const actual=actualArchiveProgress();
  if(appState.debugArchivePreview&&actual.total) return {...actual,heard:actual.total,percent:100,debug:true};
  return {...actual,debug:false};
}
function archiveDate() {
  return appState.debugArchivePreview?nowIso():appState.user.settings.archiveUnlockedAt;
}
function confettiHtml(count=44) {
  const colors=['#f6d06f','#fff0b2','#c99932','#e9b949','#ffffff','#8e6b24'];
  return Array.from({length:count},(_,index)=>{
    const left=Math.round(Math.random()*100);
    const delay=(Math.random()*.8).toFixed(2);
    const duration=(2.2+Math.random()*1.8).toFixed(2);
    const drift=Math.round(-90+Math.random()*180);
    const rotate=Math.round(Math.random()*540);
    return `<i style="--x:${left}%;--delay:${delay}s;--duration:${duration}s;--drift:${drift}px;--rotate:${rotate}deg;--confetti:${colors[index%colors.length]}"></i>`;
  }).join('');
}
function archiveCodeSearchMatch(query=appState.search) {
  const code=getArchiveCode();
  return Boolean(code)&&String(query||'').trim().toUpperCase()===code;
}
function fourthQuestionMarkName() {
  return cleanProfileName(appState.user.settings.profileName)||'Detektiv';
}
function fourthQuestionMarkSearchCard() {
  const name=fourthQuestionMarkName();
  return `<article class="episode-card fourth-question-search-result"><button data-action="open-fourth-question-mark"><span class="fourth-question-search-symbol" aria-hidden="true"><i>?</i><i>?</i><i>?</i><i>?</i></span><span class="fourth-question-search-copy"><small>Verborgene Sonderfolge</small><strong>Herzlichen Glückwunsch, ${esc(name)}</strong><em>Eine letzte Spur wurde gefunden.</em></span><b>›</b></button></article>`;
}
function archiveStats() {
  const progress=archiveDisplayProgress();
  const totalMinutes=appState.user.history.reduce((sum,item)=>sum+(getEpisode(item.nr)?.durationMin||0),0);
  const listenCounts=new Map();
  for(const item of appState.user.history) listenCounts.set(item.nr,(listenCounts.get(item.nr)||0)+1);
  const mostListened=[...listenCounts.entries()].sort((a,b)=>b[1]-a[1])[0];
  const mostEpisode=mostListened?getEpisode(mostListened[0]):null;
  const ratings=Object.values(appState.user.episodes).filter((status)=>status.rating);
  const ratingCounts={minus:0,neutral:0,plus:0,super:0};
  ratings.forEach((status)=>{ratingCounts[status.rating]=(ratingCounts[status.rating]||0)+1;});
  const commonRating=Object.entries(ratingCounts).sort((a,b)=>b[1]-a[1])[0];
  const historyDates=appState.user.history
    .map((item)=>new Date(item.at))
    .filter((date)=>!Number.isNaN(date.getTime()))
    .sort((a,b)=>a-b);
  const firstListenAt=historyDates[0]?.toISOString()||null;
  const heardEpisodes=appState.catalog.filter((episode)=>statusOf(episode.nr).heard);
  const oldestRevisit=heardEpisodes
    .map((episode)=>({episode,at:statusOf(episode.nr).heardAt}))
    .filter((entry)=>entry.at&&!Number.isNaN(new Date(entry.at).getTime()))
    .sort((a,b)=>new Date(a.at)-new Date(b.at))[0]||null;
  const unlockedAt=archiveDate();
  const completionDays=firstListenAt&&unlockedAt
    ?Math.max(0,Math.round((new Date(unlockedAt)-new Date(firstListenAt))/86400000))
    :0;
  const profile=buildTasteProfile();
  const insights=topProfileInsights(profile);
  return {
    ...progress,
    hours:Math.round(totalMinutes/60),
    ratings:ratings.length,
    ratedPercent:progress.total?Math.round(ratings.length/progress.total*100):0,
    reheard:[...listenCounts.values()].filter((count)=>count>1).length,
    mostEpisode,
    mostCount:mostListened?.[1]||0,
    commonRating:commonRating?.[1]?RATING_LABELS[commonRating[0]]:'Noch offen',
    firstListenAt,
    oldestRevisit,
    completionDays,
    favoriteTheme:insights.tags[0]?.label||'Noch nicht ermittelt',
    unlockedAt,
  };
}
function showArchiveCelebration({debug=false}={}) {
  const content=$('archiveCelebrationContent');
  content.innerHTML=`<div class="archive-confetti" aria-hidden="true">${confettiHtml()}</div><section class="archive-celebration-card"><div class="archive-file-animation" aria-hidden="true"><div class="archive-file-tab">DIE FALLKARTEI</div><div class="archive-file-sheet"><span>LETZTE AKTE</span><strong>✓</strong></div><div class="archive-seal">100 %</div></div><span class="eyebrow">${debug?'Debug-Vorschau':'Meilenstein erreicht'}</span><h2>Fallkartei vollständig</h2><p>Du hast jede aktuell verfügbare Folge gehört. Das vollständige Archiv gehört jetzt dir.</p><div class="archive-celebration-reward"><strong>${debug?'Testansicht des Archivabzeichens':'Vollständiges Archiv'}</strong><span>${debug?'Nur temporäre Vorschau – nichts wird freigeschaltet oder gespeichert.':'Abzeichen und Archivgold-Banner für dein teilbares Profil dauerhaft freigeschaltet'}</span></div><div class="archive-celebration-actions"><button class="button primary full" data-action="archive-relisten">Lange nicht gehörte Folge finden</button><button class="button secondary full" data-action="archive-open-profile">Archivprofil ansehen</button><button class="text-button muted-button" data-close-dialog="archiveCelebrationDialog">Schließen</button></div></section>`;
  openDialog('archiveCelebrationDialog');
  try {navigator.vibrate?.([24,45,24]);} catch {}
}
function renderArchiveDossier() {
  const unlock=unlockArchiveDossier();
  const data=archiveStats();
  const firstDiscovery=unlock.first;
  const code=unlock.code||getArchiveCode();
  const firstListen=data.firstListenAt?formatDate(data.firstListenAt):'Nicht dokumentiert';
  const oldestTrace=data.oldestRevisit
    ?`${data.oldestRevisit.episode.nr}. ${data.oldestRevisit.episode.titel}`
    :'Noch keine Spur';
  $('archiveDossierContent').innerHTML=`<section class="archive-dossier ${data.debug?'is-debug':''} ${firstDiscovery?'first-discovery':''}">
    <div class="archive-dossier-stamp">${data.debug?'TEST':'STRENG VERTRAULICH'}</div>
    ${firstDiscovery?`<div class="archive-secret-unlock"><span class="archive-secret-key">✦</span><div><small>ZUSATZFREIGABE ERTEILT</small><strong>Archivgold-Hintergrund</strong><p>Du hast Akte 100 gefunden. Der goldene Hintergrund für teilbare Profilbilder wurde freigeschaltet und kann ab jetzt jederzeit ein- oder ausgeschaltet werden.</p></div></div>`:''}
    <div class="archive-dossier-heading"><span>AKTE 100 · VERSCHLUSSSTUFE GOLD</span><strong>Hüter des vollständigen Archivs</strong><small>${data.debug?'Temporäre Debug-Vorschau':`Erstmals vollständig am ${formatDate(data.unlockedAt)}`}</small></div>
    <button class="archive-clearance-card" data-action="copy-archive-code" data-code="${esc(code)}"><span>PERSONALISIERTER ARCHIVCODE</span><strong>${esc(code)}</strong><small>Lokaler Schlüssel. Für spätere Ermittlungen aufbewahren.</small></button>
    <div class="archive-dossier-grid archive-dossier-grid-six">
      <div><span>Status</span><strong>${data.percent===100?'Vollständig':`${data.heard}/${data.total}`}</strong></div>
      <div><span>Hörzeit</span><strong>${data.hours} Std.</strong></div>
      <div><span>Bewertet</span><strong>${data.ratedPercent} %</strong></div>
      <div><span>Mehrfach gehört</span><strong>${data.reheard}</strong></div>
      <div><span>Erste Spur</span><strong>${esc(firstListen)}</strong></div>
      <div><span>Archivweg</span><strong>${data.completionDays} Tage</strong></div>
    </div>
    <div class="archive-dossier-feature"><span>Meistgehörter Fall</span><strong>${data.mostEpisode?`${data.mostEpisode.nr}. ${esc(data.mostEpisode.titel)}`:'Noch keiner'}</strong><small>${data.mostCount?`${data.mostCount} dokumentierte Hörvorgänge`:'Noch kein Verlauf vorhanden'}</small></div>
    <div class="archive-dossier-feature"><span>Älteste Wiederhörspur</span><strong>${esc(oldestTrace)}</strong><small>${data.oldestRevisit?`Zuletzt gehört: ${formatDate(data.oldestRevisit.at)}`:'Noch nicht ermittelt'}</small></div>
    <div class="archive-dossier-feature"><span>Archivsignatur</span><strong>${esc(data.favoriteTheme)} · ${esc(data.commonRating)}</strong><small>Bevorzugtes Motiv und häufigste Bewertung deiner Fallkartei.</small></div>
    <div class="archive-secret-protocol"><span>GEHEIMES PROTOKOLL</span><p>Die vollständige Fallkartei ist kein Endpunkt. Neue Akten dürfen hinzukommen – der Rang bleibt bestehen.</p><div><i></i><i></i><i></i></div></div>
  </section>`;
  if(firstDiscovery&&$('profileDialog')?.open) renderProfile();
  openDialog('archiveDossierDialog');
}
function renderFourthQuestionMarkCase() {
  const unlock=unlockFourthQuestionMark();
  if(!unlock.unlocked) return;
  const name=fourthQuestionMarkName();
  const debug=appState.debugArchivePreview;
  $('fourthQuestionMarkDialogTitle').textContent=`Herzlichen Glückwunsch, ${name}`;
  $('fourthQuestionMarkContent').innerHTML=`<section class="fourth-question-case ${debug?'is-debug':''} ${unlock.first?'first-unlock':''}">
    <div class="fourth-question-sequence" aria-hidden="true"><span>?</span><span>?</span><span>?</span><span>?</span></div>
    <span class="eyebrow">${debug?'Temporäre Vorschau':'Letzte Spur entschlüsselt'}</span>
    <h3>Herzlichen Glückwunsch, ${esc(name)}</h3>
    <p>Du hast alle verborgenen Rätsel der Fallkartei gefunden. Du hast nicht nur jede verfügbare Folge gehört, sondern auch bewiesen, dass du selbst ein außergewöhnlicher Detektiv bist.</p>
    <div class="fourth-question-unlock"><span class="fourth-question-unlock-mark">????</span><div><small>${debug?'NICHT GESPEICHERT':'DAUERHAFT FREIGESCHALTET'}</small><strong>Das vierte Fragezeichen</strong><em>Alle verborgenen Spuren gefunden</em></div></div>
    <div class="fourth-question-message"><span>ABSCHLUSSMELDUNG</span><p>Fall gelöst. Archiv vollständig. Ermittlerstatus bestätigt.</p></div>
    <button class="button primary full" data-close-dialog="fourthQuestionMarkDialog">Zur Fallkartei zurückkehren</button>
  </section>`;
  if(unlock.first) {
    renderProfileProgress();
    try {navigator.vibrate?.([18,35,18,35,42]);} catch {}
  }
  openDialog('fourthQuestionMarkDialog');
}
function scheduleArchiveAchievementCheck() {
  if(!achievementChecksEnabled||archiveCheckQueued||appState.debugArchivePreview) return;
  archiveCheckQueued=true;
  queueMicrotask(async()=>{
    archiveCheckQueued=false;
    const progress=actualArchiveProgress();
    if(!progress.total) return;
    const settings=appState.user.settings;
    if(progress.heard>=progress.total&&!settings.archiveUnlockedAt) {
      settings.archiveUnlockedAt=nowIso();
      settings.archiveUnlockTotal=progress.total;
      settings.archiveCelebrationSeen=false;
      await saveUser(true);
    }
    if(settings.archiveUnlockedAt&&!settings.archiveCelebrationSeen) {
      settings.archiveCelebrationSeen=true;
      await saveUser(true);
      renderHome();
      setTimeout(()=>showArchiveCelebration(),180);
    }
  });
}
function archiveBadgeHtml(data) {
  if(!data.archiveUnlocked) return '';
  const current=data.percent===100
    ?`${data.total} von ${data.total} Folgen · aktuell vollständig`
    :`Einmal vollständig abgeschlossen · aktuell ${data.heard} von ${data.total}`;
  return `<button class="archive-profile-badge ${data.debugArchive?'is-debug':''}" data-action="archive-badge"><span class="archive-badge-mark">✓</span><span>${data.debugArchive?'<small>DEBUG-VORSCHAU</small>':''}<strong>Vollständiges Archiv</strong><em>${esc(current)}</em></span><b>Archivgold</b></button>`;
}
function archiveShareStyleHtml(data) {
  if(!data.archiveUnlocked||!data.archiveGoldBackgroundUnlocked) return '';
  return `<section class="archive-share-style"><div><span>Hintergrund fürs Teilen</span><small>Der Archivgold-Banner bleibt in beiden Varianten sichtbar.</small></div><div class="archive-share-style-options" role="group" aria-label="Hintergrund für das teilbare Profil"><button class="${data.archiveShareStyle==='normal'?'active':''}" data-action="archive-share-style" data-style="normal">Normal</button><button class="${data.archiveShareStyle==='gold'?'active':''}" data-action="archive-share-style" data-style="gold">Archivgold</button></div></section>`;
}
function fourthQuestionMarkBannerHtml(data) {
  if(!data.fourthQuestionMarkUnlocked) return '';
  return `<button class="fourth-question-profile-banner ${data.debugArchive?'is-debug':''}" data-action="fourth-question-mark-banner"><span class="fourth-question-banner-symbol" aria-hidden="true">????</span><span>${data.debugArchive?'<small>DEBUG-VORSCHAU</small>':''}<strong>Das vierte Fragezeichen</strong><em>Alle verborgenen Spuren gefunden</em></span><b>›</b></button>`;
}
function renderProfileProgress() {
  const progress=archiveDisplayProgress();
  $('profileProgress').textContent=`${progress.percent} %`;
  $('profileButton').classList.toggle('archive-unlocked',archiveUnlocked());
  $('profileButton').classList.toggle('archive-complete',progress.percent===100);
}
function recommendationStatusLabel() {
  return appState.recommendationStatus==='heard'
    ?'gehörte'
    :appState.recommendationStatus==='all'
      ?'gehörte oder ungehörte'
      :'ungehörte';
}
function setRecommendationNotice(message='',type='info') {
  const node=$('recommendationNotice');
  node.textContent=message;
  node.dataset.type=type;
  node.classList.toggle('hidden',!message);
}
function updateRecommendationIntro() {
  const progress=actualArchiveProgress();
  const intro=$('recommendationIntro');
  if(appState.recommendationStatus==='heard') {
    intro.textContent='Ein bekannter Fall, passend zu deinem Geschmack und möglichst lange nicht gehört.';
  } else if(appState.recommendationStatus==='all') {
    intro.textContent='Neue und bekannte Fälle dürfen gemeinsam vorgeschlagen werden.';
  } else if(progress.total&&progress.heard>=progress.total) {
    intro.textContent='Dein Archiv ist vollständig. Wähle „Nur gehörte“, um einen Fall wiederzuentdecken.';
  } else {
    intro.textContent='Persönlich, verfügbar und noch ungehört.';
  }
}
function pickRecommendation() {
  const previousNr=appState.recommendationNr;
  const result=chooseRecommendation({
    time:appState.time,
    mood:appState.mood,
    status:appState.recommendationStatus,
    author:appState.recommendationAuthor,
    era:appState.recommendationEra,
    currentNr:previousNr,
    recentNrs:appState.recommendationSessionHistory,
    timeMatcher:timeMatches,
    moodMatcher:moodMatches,
  });

  if(result.state==='empty') {
    const label=recommendationStatusLabel();
    const message=appState.recommendationStatus==='unheard'
      ?'Keine ungehörte Folge mit diesen Filtern gefunden. Wähle bei Hörstatus „Nur gehörte“ oder passe die Filter an.'
      :`Keine ${label} Folge mit diesen Filtern gefunden. Passe die Auswahl an.`;
    setRecommendationNotice(message,'warning');
    if(!previousNr) appState.recommendationNr=null;
    renderRecommendation();
    toast(message,'warning');
    return;
  }

  if(result.state==='no-alternative') {
    const label=recommendationStatusLabel();
    const message=`Keine weitere ${label} Folge mit diesen Filtern gefunden. Passe die Filter bei Bedarf an.`;
    setRecommendationNotice(message,'warning');
    renderRecommendation();
    toast(message,'warning');
    return;
  }

  appState.recommendationNr=result.episode.nr;
  appState.recommendationSessionHistory=[
    ...appState.recommendationSessionHistory.filter((nr)=>nr!==result.episode.nr),
    result.episode.nr,
  ].slice(-3);
  setRecommendationNotice('');
  renderRecommendation();
}
function renderRecommendation() {
  updateRecommendationIntro();
  const episode=getEpisode(appState.recommendationNr);
  $('recommendationResult').classList.toggle('hidden',!episode);
  if(!episode) return;
  const profile=buildTasteProfile(),score=recommendationScore(episode,profile),match=matchPresentation(episode,profile,score),stream=preferredStreaming(episode),status=statusOf(episode.nr);
  const modeChip=status.heard
    ?`<span>Zuletzt gehört: ${esc(formatRelativeDate(status.heardAt))}</span>`
    :'<span>Noch ungehört</span>';
  $('recommendationCard').innerHTML=`<div class="recommendation-topline"><span class="match-level">${esc(match.level)}</span><span>Score ${match.scoreValue}</span></div><button class="recommendation-title" data-open-episode="${episode.nr}"><small>${episodeTypeLabel(episode)}</small><strong>${esc(episode.titel)}</strong></button><p class="recommendation-description">${esc(episode.beschreibung?.slice(0,260)||'Ein starker Vorschlag aus deinem Katalog.')}${episode.beschreibung?.length>260?' …':''}</p><div class="reason-chips">${modeChip}${match.reasons.map((reason)=>`<span>${esc(reason)}</span>`).join('')}</div><div class="profile-confidence">Profilstärke: <strong>${match.strength}</strong> · ${match.ratingCount} Bewertung${match.ratingCount===1?'':'en'}</div>${stream?`<a class="button primary full" href="${esc(stream.url)}" target="_blank" rel="noopener">▶ In ${esc(stream.label)} anhören</a>`:`<button class="button primary full" data-open-episode="${episode.nr}">Details öffnen</button>`}<div class="recommendation-secondary"><button data-open-episode="${episode.nr}" class="text-button">Details</button><button data-action="queue" data-nr="${episode.nr}" class="text-button">${appState.user.settings.queue.includes(episode.nr)?'Aus Warteschlange':'Als Nächstes'}</button><button data-action="snooze" data-nr="${episode.nr}" class="text-button">Heute nicht</button><button data-action="hide-recommendation" data-nr="${episode.nr}" class="text-button">Ausblenden</button></div>`;
}
function backupDue() {
  const current=activityCount(),last=Number(appState.user.settings.lastBackupActivityCount)||0,newActivity=current-last,lastDate=appState.user.settings.lastBackupAt?new Date(appState.user.settings.lastBackupAt):null;
  const days=lastDate?Math.floor((Date.now()-lastDate.getTime())/86400000):Infinity; const dismissed=appState.user.settings.backupReminderDismissedAt&&Date.now()-new Date(appState.user.settings.backupReminderDismissedAt).getTime()<7*86400000;
  return !dismissed && current>10 && (newActivity>=25||days>=30);
}
function renderHome() {
  renderProfileProgress(); renderRecommendation();
  const queue=appState.user.settings.queue.map(getEpisode).filter(Boolean); $('homeQueue').innerHTML=queue.length?queue.slice(0,4).map((episode)=>miniRow(episode)).join(''):'<p class="muted">Noch keine Folge vorgemerkt.</p>';
  const pinned=appState.user.pinned.map(getEpisode).filter(Boolean); $('homePinned').innerHTML=pinned.length?pinned.slice(0,5).map((episode)=>miniRow(episode)).join(''):'<p class="muted">Noch nichts angeheftet.</p>';
  const seen=new Set(),history=[]; for (const item of appState.user.history) if (!seen.has(item.nr)&&getEpisode(item.nr)) { seen.add(item.nr); history.push(getEpisode(item.nr)); }
  $('homeHistory').innerHTML=history.length?history.slice(0,5).map((episode)=>miniRow(episode)).join(''):'<p class="muted">Noch kein Hörvorgang erfasst.</p>';
  const due=backupDue(); $('backupReminder').classList.toggle('hidden',!due); if (due) $('backupReminderText').textContent=`Seit dem letzten Backup sind ${Math.max(0,activityCount()-(appState.user.settings.lastBackupActivityCount||0))} neue Aktivitäten gespeichert.`;
  scheduleArchiveAchievementCheck();
}

function filteredEpisodes() {
  const profile=buildTasteProfile(); let rows=appState.catalog.map((episode)=>({episode,search:searchScore(episode,appState.search)})).filter((row)=>!appState.search||row.search>0);
  rows=rows.filter(({episode})=>{ const status=statusOf(episode.nr); if (appState.filter==='unheard') return !status.heard; if (appState.filter==='heard') return status.heard; if (RATING_ORDER.includes(appState.filter)) return status.rating===appState.filter; if (appState.filter==='notes') return Boolean(status.note?.trim()); if (appState.filter==='reheard') return (status.listenCount||0)>1; return true; }).filter(({episode})=>appState.authorFilter==='all'||episode.author===appState.authorFilter).filter(({episode})=>appState.eraFilter==='all'||episode.era===appState.eraFilter).filter(({episode})=>appState.yearFilter==='all'||String(episode.year)===appState.yearFilter);
  rows.sort((a,b)=>{ if (appState.search&&b.search!==a.search) return b.search-a.search; switch(appState.sort){case'nr-desc':return b.episode.nr-a.episode.nr;case'title':return a.episode.titel.localeCompare(b.episode.titel,'de');case'author':return (a.episode.author||'').localeCompare(b.episode.author||'','de')||a.episode.nr-b.episode.nr;case'duration-asc':return (a.episode.durationMin||9999)-(b.episode.durationMin||9999);case'duration-desc':return (b.episode.durationMin||0)-(a.episode.durationMin||0);case'rocky-best':return (a.episode.rockyRanking??999)-(b.episode.rockyRanking??999);case'recommendation':return recommendationScore(b.episode,profile,{useDiversity:false}).total-recommendationScore(a.episode,profile,{useDiversity:false}).total;case'own':{const rank={super:4,plus:3,neutral:2,minus:1};return (rank[statusOf(b.episode.nr).rating]||0)-(rank[statusOf(a.episode.nr).rating]||0)||a.episode.nr-b.episode.nr;}default:return a.episode.nr-b.episode.nr;}}); return rows.map((row)=>row.episode);
}
function renderActiveFilters() {
  const chips=[]; if (appState.filter!=='all') chips.push(['filter','Status']); if (appState.authorFilter!=='all') chips.push(['author',appState.authorFilter]); if (appState.eraFilter!=='all') chips.push(['era',appState.eraFilter]); if (appState.yearFilter!=='all') chips.push(['year',appState.yearFilter]); if (appState.search) chips.push(['search',`„${appState.search}“`]);
  $('activeFilters').classList.toggle('hidden',!chips.length); $('activeFilters').innerHTML=chips.map(([key,label])=>`<button data-clear-filter="${key}">${esc(label)} ×</button>`).join('')+(chips.length>1?'<button data-clear-filter="all">Alle zurücksetzen</button>':'');
}
function renderEpisodes() {
  const view=appState.user.settings.episodeView;
  if(archiveCodeSearchMatch()) {
    $('episodeCount').textContent='1 Sonderfolge';
    $('episodeList').className='episode-list';
    $('episodeList').innerHTML=fourthQuestionMarkSearchCard();
    $('loadMoreEpisodes').classList.add('hidden');
    renderActiveFilters();
    $('clearSearch').classList.remove('hidden');
    $$('#statusFilters [data-filter]').forEach((button)=>button.classList.toggle('active',button.dataset.filter===appState.filter));
    $$('[data-episode-view]').forEach((button)=>button.classList.toggle('active',button.dataset.episodeView===view));
    return;
  }
  const episodes=filteredEpisodes(),visible=episodes.slice(0,appState.episodeRenderLimit);
  $('episodeCount').textContent=`${episodes.length} Folge${episodes.length===1?'':'n'}`; $('episodeList').className=`episode-list ${view==='cover'?'cover-view':''}`; $('episodeList').innerHTML=visible.length?visible.map((episode)=>view==='detailed'?detailedCard(episode):view==='cover'?coverCard(episode):compactCard(episode)).join(''):'<div class="info-card">Keine passenden Folgen gefunden.</div>';
  $('loadMoreEpisodes').classList.toggle('hidden',visible.length>=episodes.length); renderActiveFilters(); $('clearSearch').classList.toggle('hidden',!appState.search);
  $$('#statusFilters [data-filter]').forEach((button)=>button.classList.toggle('active',button.dataset.filter===appState.filter));
  $$('[data-episode-view]').forEach((button)=>button.classList.toggle('active',button.dataset.episodeView===view));
}

function renderRanking() {
  $$('#rankingMode [data-ranking]').forEach((button)=>button.classList.toggle('active',button.dataset.ranking===appState.ranking)); const profile=buildTasteProfile(); let html='';
  if (appState.ranking==='rocky') {
    const list=appState.catalog.filter((episode)=>Number.isFinite(episode.rockyRanking)).sort((a,b)=>a.rockyRanking-b.rockyRanking); $('rankingInfo').innerHTML=`<strong>Rocky-Beach Community-Ranking</strong><p>${list.length} Folgen mit vorhandener Wertung. Niedrigere Werte stehen weiter oben.</p>`;
    html=list.map((episode,index)=>`<article class="ranking-row"><span>${index+1}</span><button data-open-episode="${episode.nr}"><strong>${esc(episodeTitle(episode))}</strong><small>${metaLine(episode)}</small></button><span class="ranking-value">${episode.rockyRanking.toFixed(2)}</span></article>`).join('');
  } else if (appState.ranking==='mine') {
    const groups={super:[],plus:[],neutral:[],minus:[]}; for (const episode of appState.catalog) { const rating=statusOf(episode.nr).rating; if (rating) groups[rating].push(episode); }
    $('rankingInfo').innerHTML='<strong>Meine Bewertungen</strong><p>Eine ehrliche Bewertungsübersicht statt einer künstlichen Rangnummer.</p>';
    html=RATING_ORDER.map((rating)=>groups[rating].length?`<h3 class="ranking-group-title">${symbols[rating]} ${RATING_LABELS[rating]} · ${groups[rating].length}</h3>${groups[rating].sort((a,b)=>(a.rockyRanking??999)-(b.rockyRanking??999)).map((episode)=>`<article class="ranking-row"><span class="rating-pill ${rating}">${symbols[rating]}</span><button data-open-episode="${episode.nr}"><strong>${esc(episodeTitle(episode))}</strong><small>${metaLine(episode)}</small></button><span>›</span></article>`).join('')}`:'').join('')||'<div class="info-card">Noch keine Folgen bewertet.</div>';
  } else {
    const list=appState.catalog.filter((episode)=>availableEpisode(episode)&&!statusOf(episode.nr).heard).map((episode)=>({episode,score:recommendationScore(episode,profile,{useDiversity:false})})).sort((a,b)=>b.score.total-a.score.total).slice(0,100);
    const strength=profile.ratingCount>=18?'hoch':profile.ratingCount>=7?'mittel':profile.ratingCount>=2?'im Aufbau':'noch allgemein'; $('rankingInfo').innerHTML=`<strong>Persönliche Empfehlungen</strong><p>Profilstärke ${strength} auf Basis von ${profile.ratingCount} Bewertungen.</p>`;
    html=list.map((entry,index)=>{const match=matchPresentation(entry.episode,profile,entry.score);return`<article class="ranking-row"><span>${index+1}</span><button data-open-episode="${entry.episode.nr}"><strong>${episodeTitle(entry.episode)}</strong><small>${match.reasons.map(esc).join(' · ')||metaLine(entry.episode)}</small></button><span class="ranking-value">${match.scoreValue}</span></article>`;}).join('')||'<div class="info-card">Keine ungehörten Folgen verfügbar.</div>';
  }
  $('rankingList').innerHTML=html;
}

function playlistCard(item,curated=false) {
  const playlist=curated?resolveCuratedPlaylist(item):getPlaylist(item.id); const stats=playlistStats(playlist.episodes); const id=curated?`curated:${item.id}`:item.id;
  return `<button class="playlist-card" data-open-playlist="${esc(id)}"><span class="playlist-icon">${curated?item.icon:'☷'}</span><span><strong>${esc(curated?item.title:item.name)}</strong><p>${esc((curated?item.description:item.description)||'Eigene Playlist')}</p></span><small>${stats.heard}/${stats.total} gehört · ${formatDuration(stats.duration)}</small></button>`;
}
function renderPlaylists() {
  const queue=appState.user.settings.queue.map(getEpisode).filter(Boolean); $('queueList').innerHTML=queue.length?queue.map((episode)=>miniRow(episode,true)).join(''):'<p class="muted">Noch keine Folge in „Als Nächstes“.</p>';
  $$('#playlistTabs [data-playlist-tab]').forEach((button)=>button.classList.toggle('active',button.dataset.playlistTab===appState.playlistTab));
  if (appState.playlistTab==='mine') $('playlistGrid').innerHTML=appState.user.playlists.length?appState.user.playlists.map((item)=>playlistCard(item)).join(''):'<div class="info-card">Noch keine eigene Playlist.</div>';
  else $('playlistGrid').innerHTML=curatedPlaylists(appState.playlistTab).map((item)=>playlistCard(item,true)).join('');
}
function playlistSearchResultsHtml(id,query='') {
  const playlist=getPlaylist(id);
  const clean=String(query||'').trim();
  if(!playlist||!clean) return '<p class="muted playlist-search-help">Nach Nummer, Titel, Autor oder Ära suchen.</p>';

  const normalized=normalizeText(clean);
  const existing=new Set(playlist.episodes.map((episode)=>episode.nr));
  const results=appState.catalog
    .filter((episode)=>availableEpisode(episode)&&!existing.has(episode.nr))
    .map((episode)=>{
      const number=String(episode.nr);
      const hay=normalizeText(`${number} ${episode.titel} ${episode.author||''} ${episode.era||''} ${(episode.tags||[]).join(' ')}`);
      let score=searchScore(episode,clean);
      if(number===clean) score+=500;
      else if(number.startsWith(clean)) score+=220;
      if(normalized&&hay.includes(normalized)) score=Math.max(score,135);
      return {episode,score};
    })
    .filter((entry)=>entry.score>0)
    .sort((a,b)=>b.score-a.score||a.episode.nr-b.episode.nr)
    .slice(0,12);

  if(!results.length) return '<p class="muted playlist-search-help">Keine noch nicht enthaltene Folge gefunden.</p>';

  return results.map(({episode})=>`<article class="playlist-search-result"><button data-open-episode="${episode.nr}"><strong>${episodeTitle(episode)}</strong><small>${metaLine(episode)}</small></button><button data-action="playlist-add" data-playlist-id="${esc(id)}" data-nr="${episode.nr}" aria-label="${esc(episode.titel)} hinzufügen">＋</button></article>`).join('');
}
function renderPlaylistSearchResults(id) {
  const target=$('playlistEpisodeSearchResults');
  if(!target) return;
  target.innerHTML=playlistSearchResultsHtml(id,appState.playlistSearch);
  const clear=$('clearPlaylistEpisodeSearch');
  if(clear) clear.classList.toggle('hidden',!appState.playlistSearch);
}
function renderPlaylistDetail(id) {
  const playlist=getPlaylist(id); if (!playlist) return;
  if(appState.currentPlaylistId!==id) appState.playlistSearch='';
  appState.currentPlaylistId=id;

  const stats=playlistStats(playlist.episodes);
  const personal=!String(id).startsWith('curated:')?id:null;
  const suggestions=personal?playlistSuggestions(personal):[];
  const searchSection=personal?`<section class="detail-section playlist-add-section"><h3>Folgen hinzufügen</h3><div class="playlist-episode-search"><input id="playlistEpisodeSearch" type="search" value="${esc(appState.playlistSearch)}" placeholder="Folge, Nummer, Autor oder Ära"><button id="clearPlaylistEpisodeSearch" class="icon-button subtle ${appState.playlistSearch?'':'hidden'}" data-action="clear-playlist-search" aria-label="Suche leeren">×</button></div><div id="playlistEpisodeSearchResults" class="playlist-search-results">${playlistSearchResultsHtml(personal,appState.playlistSearch)}</div></section>`:'';

  $('playlistDialogTitle').innerHTML=`<span class="eyebrow">${personal?'Eigene Playlist':'Kuratierte Liste'}</span><h2>${esc(playlist.name||playlist.title)}</h2>`;
  $('playlistDialogBody').innerHTML=`<section class="playlist-detail-hero"><p>${esc(playlist.description||'')}</p><div class="progress-track"><span style="width:${stats.total?stats.heard/stats.total*100:0}%"></span></div><strong>${stats.heard} von ${stats.total} gehört</strong><small>${formatDuration(stats.duration)} gesamt · ${formatDuration(stats.remaining)} offen</small><div class="button-row"><button data-action="queue-playlist" data-playlist-id="${esc(id)}" class="button primary">＋ Alles als Nächstes</button><button data-action="share-playlist" data-playlist-id="${esc(id)}" class="button secondary">Teilen</button></div></section>${searchSection}<section class="detail-section"><h3>Folgen</h3><div class="playlist-items">${playlist.episodes.length?playlist.episodes.map((episode)=>`<article class="playlist-item"><button data-open-episode="${episode.nr}"><span>${episode.nr>=10000?'✦':episode.nr}</span><strong>${esc(episode.titel)}</strong><small>${formatDuration(episode.durationMin)}</small></button>${personal?`<div><button data-action="playlist-up" data-playlist-id="${esc(personal)}" data-nr="${episode.nr}">↑</button><button data-action="playlist-down" data-playlist-id="${esc(personal)}" data-nr="${episode.nr}">↓</button><button data-action="playlist-remove" data-playlist-id="${esc(personal)}" data-nr="${episode.nr}">×</button></div>`:''}</article>`).join(''):'<p class="muted">Diese Liste ist leer.</p>'}</div></section>${suggestions.length?`<section class="detail-section"><h3>Passt dazu</h3><div class="suggestion-list">${suggestions.map((entry)=>`<article><button data-open-episode="${entry.episode.nr}"><strong>${episodeTitle(entry.episode)}</strong><small>${entry.reasons.map(esc).join(' · ')||metaLine(entry.episode)}</small></button><button data-action="playlist-add" data-playlist-id="${esc(personal)}" data-nr="${entry.episode.nr}">＋</button></article>`).join('')}</div></section>`:''}${personal?`<div class="button-row"><button data-action="edit-playlist" data-playlist-id="${esc(personal)}" class="button secondary">Bearbeiten</button><button data-action="delete-playlist" data-playlist-id="${esc(personal)}" class="button danger">Löschen</button></div>`:''}`;
  openDialog('playlistDialog');
}
function openPlaylistEditor(id=null,seedNr=null) {
  const playlist=id?appState.user.playlists.find((item)=>item.id===id):null; $('playlistEditorTitle').textContent=playlist?'Playlist bearbeiten':'Playlist erstellen'; $('playlistEditorId').value=playlist?.id||''; $('playlistEditorSeedNr').value=seedNr||''; $('playlistName').value=playlist?.name||''; $('playlistDescription').value=playlist?.description||''; openDialog('playlistEditorDialog'); setTimeout(()=>$('playlistName').focus(),100);
}

function smartPlaylistOptionsFromForm() {
  return {
    name:$('smartName').value,
    targetMinutes:(Number($('smartHours').value)||0)*60+(Number($('smartMinutes').value)||0),
    mood:$('smartMood').value,
    status:$('smartStatus').value,
    author:$('smartAuthor').value,
    continuity:$('smartContinuity').checked,
  };
}
function smartProposalSignature(values=[]) {
  return [...new Set(values.map(Number).filter(Number.isFinite))].sort((a,b)=>a-b).join(',');
}
function renderSmartPlaylistPreview() {
  const draft=appState.smartPlaylistDraft; if (!draft) return;
  const difference=draft.duration-draft.targetMinutes;
  const differenceText=Math.abs(difference)<=5?'nahezu genau passend':difference>0?`${difference} Min. länger als geplant`:`${Math.abs(difference)} Min. kürzer als geplant`;
  const variationText=draft.cooldownRelaxed
    ? 'Die Auswahl war eng. Der Cooldown wurde deshalb teilweise gelockert, dieselbe reine Umsortierung bleibt aber ausgeschlossen.'
    : 'Bei „Andere Vorschläge“ werden die letzten zwei verworfenen Zusammenstellungen vorübergehend gemieden.';
  const connection=draft.continuity;
  const continuityHtml=connection?.enabled
    ?connection.used
      ?`<section class="smart-continuity-card"><span class="smart-continuity-icon">⌁</span><div><small>${esc(connection.type||'Zusammenhang')}</small><strong>${esc(connection.title)}</strong><p>${connection.episodeNrs.length} verbundene Folgen bilden den Kern dieses Vorschlags.</p></div></section>`
      :`<section class="smart-continuity-card subtle"><span class="smart-continuity-icon">⌁</span><div><small>Zusammenhänge beachten</small><strong>Keine passende Gruppe für diese Auswahl</strong><p>${esc(connection.reason||'Die übrigen Filter und die Zielzeit waren zu eng.')}</p></div></section>`
    :'';
  $('smartPlaylistDialogTitle').innerHTML=`<span class="eyebrow">Smart Playlist · Vorschau</span><h2>${esc(draft.name)}</h2>`;
  $('smartPlaylistPreview').innerHTML=`<section class="smart-preview-hero"><div class="smart-preview-stats"><div><strong>${draft.episodes.length}</strong><span>Folgen</span></div><div><strong>${formatDuration(draft.duration)}</strong><span>Vorschlag</span></div><div><strong>${formatDuration(draft.targetMinutes)}</strong><span>Zielzeit</span></div></div><p>${esc(differenceText)}. Es wird noch nichts gespeichert.</p></section>${continuityHtml}<section class="smart-preview-list" aria-label="Vorgeschlagene Folgen">${draft.episodes.map((episode,index)=>`<article class="smart-preview-item"><button class="smart-preview-main" data-open-episode="${episode.nr}" aria-label="Details zu ${esc(episode.titel)} öffnen"><span class="smart-preview-position">${index+1}</span><span class="smart-preview-copy"><strong>${esc(episodeTitle(episode))}</strong><small>${metaLine(episode)}</small></span></button><button class="icon-button subtle" data-action="smart-remove" data-nr="${episode.nr}" aria-label="${esc(episode.titel)} aus dem Vorschlag entfernen">×</button></article>`).join('')||'<div class="info-card">Der Vorschlag enthält keine Folgen mehr.</div>'}</section><div class="smart-preview-actions"><button class="button secondary full" data-action="smart-regenerate">Andere Vorschläge</button><small class="smart-regenerate-hint">${esc(variationText)}</small><div class="button-row"><button class="button secondary" data-action="smart-queue" ${draft.episodes.length?'':'disabled'}>Als Nächstes übernehmen</button><button class="button primary" data-action="smart-save" ${draft.episodes.length?'':'disabled'}>Playlist speichern</button></div></div>`;
}
async function createSmartPlaylistPreview(options=smartPlaylistOptionsFromForm(),{regenerate=false}={}) {
  if (smartPlaylistBusy) return; smartPlaylistBusy=true;
  const previousDraft=appState.smartPlaylistDraft;
  const currentRound=regenerate?[...(previousDraft?.episodeNrs||[])]:[];
  let proposalHistory=regenerate?[...(appState.smartPlaylistHistory||[])]:[];
  if (currentRound.length) {
    const currentSignature=smartProposalSignature(currentRound);
    proposalHistory=proposalHistory.filter((round)=>smartProposalSignature(round)!==currentSignature);
    proposalHistory.push(currentRound);
    proposalHistory=proposalHistory.slice(-2);
  }
  appState.smartPlaylistHistory=proposalHistory;
  setSmartPlannerButtonLoading(!regenerate); renderSmartPlaylistLoading(regenerate); openDialog('smartPlaylistDialog');
  const started=performance.now();
  try {
    await waitForPaint();
    const result=generateSmartPlaylist(options,{recentProposals:proposalHistory});
    const remaining=180-(performance.now()-started); if (remaining>0) await wait(remaining);
    if (!result) {
      if (previousDraft) {
        appState.smartPlaylistDraft=previousDraft;
        renderSmartPlaylistPreview();
        toast('Mit diesen Filtern wurde keine wirklich andere Kombination gefunden.','warning');
      } else {
        closeDialog('smartPlaylistDialog');
        toast('Für diese Auswahl wurden keine passenden Vorschläge gefunden.','warning');
      }
      return;
    }
    appState.smartPlaylistOptions=options; appState.smartPlaylistDraft=result; renderSmartPlaylistPreview();
    if (regenerate) {
      const count=Number(result.newEpisodes)||0;
      if (count>=result.episodes.length) toast('Komplett neuer Vorschlag.');
      else if (count>0) toast(`${count} neue Folge${count===1?'':'n'} im Vorschlag.`);
      else toast('Neue Zusammenstellung gefunden.');
    }
  } finally {
    $('smartPlaylistPreview')?.removeAttribute('aria-busy'); setSmartPlannerButtonLoading(false); smartPlaylistBusy=false;
  }
}
function profileSummary(insights,count) {
  if (count<2) return 'Bewerte ein paar bekannte Folgen. Danach kann Die Fallkartei deinen Hörgeschmack deutlich besser erklären und berücksichtigen.';
  const parts=[]; if (insights.tags[0]) parts.push(`Du magst besonders ${insights.tags.slice(0,2).map((item)=>item.label).join(' und ')}`); if (insights.authors[0]) parts.push(`${insights.authors[0].label} passt überdurchschnittlich gut zu dir`); if (insights.characters[0]) parts.push(`wiederkehrende Fälle mit ${insights.characters[0].label} fallen positiv auf`); return `${parts.join('. ')}${parts.length?'.':''}`;
}
function automaticProfileFavorites() {
  const rank={super:4,plus:3,neutral:2,minus:1};
  return appState.catalog.filter((episode)=>statusOf(episode.nr).rating).sort((a,b)=>(rank[statusOf(b.nr).rating]||0)-(rank[statusOf(a.nr).rating]||0)||(a.rockyRanking??999)-(b.rockyRanking??999)||a.nr-b.nr);
}
function resolvedProfileFavorites() {
  const manual=[...new Set((appState.user.settings.profileFavoriteNrs||[]).map(Number).filter(Number.isFinite))].map(getEpisode).filter(Boolean).slice(0,3);
  const selected=new Set(manual.map((episode)=>episode.nr));
  const automatic=automaticProfileFavorites().filter((episode)=>!selected.has(episode.nr));
  return [...manual,...automatic].slice(0,3);
}
function profileSnapshot() {
  const profile=buildTasteProfile(),insights=topProfileInsights(profile),available=appState.catalog.filter(completionEligibleEpisode);
  const statuses=Object.values(appState.user.episodes),actualHeard=available.filter((episode)=>statusOf(episode.nr).heard).length;
  const heard=appState.debugArchivePreview?available.length:actualHeard;
  const ratings=statuses.filter((status)=>status.rating).length;
  const listens=appState.user.history.length;
  const reheard=statuses.filter((status)=>(status.listenCount||0)>1).length;
  const hours=Math.round(appState.user.history.reduce((sum,item)=>sum+(getEpisode(item.nr)?.durationMin||0),0)/60);
  const ratingCounts={minus:0,neutral:0,plus:0,super:0}; for(const status of statuses)if(status.rating)ratingCounts[status.rating]=(ratingCounts[status.rating]||0)+1;
  const displayName=cleanProfileName(appState.user.settings.profileName),initials=profileInitials(displayName),favorites=resolvedProfileFavorites();
  return {
    profile,insights,heard,actualHeard,total:available.length,
    percent:available.length?Math.round(heard/available.length*100):0,
    ratings,listens,reheard,hours,ratingCounts,favorites,displayName,initials,
    archiveUnlocked:archiveUnlocked(),
    archiveUnlockedAt:archiveDate(),
    archiveUnlockTotal:appState.debugArchivePreview?available.length:appState.user.settings.archiveUnlockTotal,
    archiveDossierFoundAt:appState.user.settings.archiveDossierFoundAt,
    archiveGoldBackgroundUnlocked:Boolean(appState.user.settings.archiveDossierFoundAt),
    archiveShareStyle:appState.user.settings.archiveDossierFoundAt&&appState.user.settings.archiveShareStyle==='gold'?'gold':'normal',
    fourthQuestionMarkUnlocked:Boolean(appState.user.settings.fourthQuestionMarkUnlockedAt),
    fourthQuestionMarkUnlockedAt:appState.user.settings.fourthQuestionMarkUnlockedAt,
    debugArchive:appState.debugArchivePreview,
  };
}
function roundedRect(ctx,x,y,width,height,radius,fill,stroke=null) {
  const r=Math.min(radius,width/2,height/2); ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+width,y,x+width,y+height,r); ctx.arcTo(x+width,y+height,x,y+height,r); ctx.arcTo(x,y+height,x,y,r); ctx.arcTo(x,y,x+width,y,r); ctx.closePath();
  if(fill){ctx.fillStyle=fill;ctx.fill();} if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.stroke();}
}
function drawWrappedText(ctx,text,x,y,maxWidth,lineHeight,maxLines=3) {
  const words=String(text||'').split(/\s+/).filter(Boolean); let line='',lines=[];
  for(const word of words){const test=line?`${line} ${word}`:word;if(ctx.measureText(test).width>maxWidth&&line){lines.push(line);line=word;}else line=test;}
  if(line)lines.push(line); if(lines.length>maxLines){lines=lines.slice(0,maxLines);while(ctx.measureText(`${lines[maxLines-1]}…`).width>maxWidth&&lines[maxLines-1].length>1)lines[maxLines-1]=lines[maxLines-1].slice(0,-1);lines[maxLines-1]+='…';}
  lines.forEach((entry,index)=>ctx.fillText(entry,x,y+index*lineHeight)); return lines.length*lineHeight;
}
async function profileImageBlob() {
  const data=profileSnapshot(),canvas=document.createElement('canvas');
  canvas.width=1080; canvas.height=1350;
  const ctx=canvas.getContext('2d');
  if(!ctx) throw new Error('Canvas wird von diesem Browser nicht unterstützt.');

  const archive=data.archiveUnlocked;
  const goldBackground=archive&&data.archiveGoldBackgroundUnlocked&&data.archiveShareStyle==='gold';

  const outerLine=goldBackground?'#a98339':'#344255';
  const innerLine=goldBackground?'rgba(221,186,101,.24)':'rgba(121,145,180,.13)';
  const sectionColor=goldBackground?'#d0b675':'#eef1f5';
  const muted=goldBackground?'#aaa083':'#9ba4b2';
  const cardFill=goldBackground?'rgba(30,27,20,.92)':'rgba(20,24,32,.92)';
  const cardStroke=goldBackground?'#574827':'#303a49';

  // Hintergrund – bewusst näher am älteren, ruhigeren Profilbild.
  const background=ctx.createLinearGradient(0,0,1080,1350);
  if(goldBackground){
    background.addColorStop(0,'#201a0e');
    background.addColorStop(.46,'#090a0d');
    background.addColorStop(1,'#151108');
  } else {
    background.addColorStop(0,'#151b26');
    background.addColorStop(.48,'#090b10');
    background.addColorStop(1,'#0d1118');
  }
  ctx.fillStyle=background;
  ctx.fillRect(0,0,1080,1350);

  const glow=ctx.createRadialGradient(920,62,0,920,62,540);
  glow.addColorStop(0,goldBackground?'rgba(207,160,57,.20)':'rgba(44,99,176,.18)');
  glow.addColorStop(1,goldBackground?'rgba(207,160,57,0)':'rgba(44,99,176,0)');
  ctx.fillStyle=glow;
  ctx.fillRect(0,0,1080,610);

  if(goldBackground){
    ctx.save();
    ctx.globalAlpha=.07;
    ctx.strokeStyle='#c79b43';
    ctx.lineWidth=1;
    for(let x=-240;x<1300;x+=64){
      ctx.beginPath();
      ctx.moveTo(x,0);
      ctx.lineTo(x+480,1350);
      ctx.stroke();
    }
    ctx.restore();
  }

  roundedRect(ctx,25,25,1030,1300,38,'rgba(0,0,0,0)',outerLine);
  roundedRect(ctx,39,39,1002,1272,31,'rgba(0,0,0,0)',innerLine);

  // Kopf – wie beim alten Lieblingslayout.
  const heading=data.displayName
    ?`HÖRPROFIL VON ${data.displayName.toLocaleUpperCase('de-DE')}`
    :'MEIN HÖRPROFIL';
  ctx.fillStyle=goldBackground?'#c9b57d':'#b7bec9';
  ctx.font='800 20px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';
  ctx.letterSpacing='4px';
  ctx.fillText(heading,76,88);
  ctx.letterSpacing='0px';

  ctx.fillStyle='#f6f7f9';
  ctx.font='900 52px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';
  ctx.fillText('DIE FALLKARTEI',76,154);

  ctx.fillStyle=muted;
  ctx.font='600 20px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';
  ctx.fillText(
    data.displayName?`Persönliches Hörprofil von ${data.displayName}`:'Persönliches Hörprofil',
    78,198
  );

  if(data.initials){
    roundedRect(
      ctx,892,72,108,108,54,
      goldBackground?'rgba(55,44,25,.95)':'rgba(27,33,45,.96)',
      goldBackground?'#a98a48':'#526078'
    );
    ctx.fillStyle='#f7f8fa';
    ctx.font='900 38px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';
    ctx.textAlign='center';
    ctx.fillText(data.initials,946,140);
    ctx.textAlign='left';
  }

  // Fortschritt.
  ctx.fillStyle='#f7f8fa';
  ctx.font='900 112px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';
  ctx.fillText(`${data.percent} %`,76,329);

  ctx.fillStyle=muted;
  ctx.font='600 27px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';
  ctx.fillText(`${data.heard} von ${data.total} verfügbaren Folgen gehört`,80,378);

  // Drei Kernwerte aus der älteren Karte.
  const statY=430,statW=288,statH=126,gap=30;
  const statData=[
    ['Bewertet',data.ratings],
    ['Hörstunden',data.hours],
    ['Wiedergehört',data.reheard],
  ];
  statData.forEach(([label,value],index)=>{
    const x=76+index*(statW+gap);
    roundedRect(ctx,x,statY,statW,statH,24,cardFill,cardStroke);
    ctx.fillStyle='#f4f6f8';
    ctx.font='900 44px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';
    ctx.fillText(String(value),x+26,statY+58);
    ctx.fillStyle=goldBackground?'#9d916f':'#929aa7';
    ctx.font='700 17px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';
    ctx.fillText(label,x+26,statY+96);
  });

  // Geschmack direkt nach oben – Bewertungen-Balken entfallen vollständig.
  ctx.fillStyle=sectionColor;
  ctx.font='850 22px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';
  ctx.fillText('MEIN GESCHMACK',76,622);

  const taste=[
    ['THEMA',data.insights.tags[0]?.label||'Noch offen'],
    ['AUTOR',data.insights.authors[0]?.label||'Noch offen'],
    ['FIGUR',data.insights.characters[0]?.label||'Noch offen'],
  ];
  const tasteY=650,tasteH=118;
  taste.forEach(([label,value],index)=>{
    const x=76+index*(statW+gap);
    roundedRect(ctx,x,tasteY,statW,tasteH,22,cardFill,cardStroke);
    ctx.fillStyle=goldBackground?'#9c906f':'#8993a2';
    ctx.font='800 13px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';
    ctx.letterSpacing='1.1px';
    ctx.fillText(label,x+22,tasteY+31);
    ctx.letterSpacing='0px';
    ctx.fillStyle='#f2f4f7';
    ctx.font='800 23px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';
    drawWrappedText(ctx,value,x+22,tasteY+70,statW-44,27,2);
  });

  // Favoriten wieder als ruhige Liste statt großer Karten.
  ctx.fillStyle=sectionColor;
  ctx.font='850 22px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';
  ctx.fillText('MEINE FAVORITEN',76,826);

  const favoriteStartY=854;
  if(data.favorites.length){
    data.favorites.slice(0,3).forEach((episode,index)=>{
      const y=favoriteStartY+index*48;

      if(index>0){
        ctx.strokeStyle=goldBackground?'rgba(178,151,86,.13)':'rgba(128,145,168,.13)';
        ctx.lineWidth=1;
        ctx.beginPath();
        ctx.moveTo(76,y-13);
        ctx.lineTo(1004,y-13);
        ctx.stroke();
      }

      ctx.fillStyle=goldBackground?'#c6aa67':'#89a1c2';
      ctx.font='850 18px ui-monospace,SFMono-Regular,Menlo,Consolas,monospace';
      const numberText=episode.nr>=10000?'✦':String(episode.nr);
      ctx.fillText(numberText,78,y+20);

      ctx.fillStyle='#f1f3f6';
      ctx.font='750 22px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';
      const title=String(episode.titel||'');
      let shown=title;
      const maxWidth=820;
      while(ctx.measureText(shown).width>maxWidth&&shown.length>2) shown=shown.slice(0,-1);
      if(shown!==title) shown=shown.trimEnd()+'…';
      ctx.fillText(shown,145,y+20);
    });
  } else {
    ctx.fillStyle=muted;
    ctx.font='600 19px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';
    ctx.fillText('Noch keine Favoriten ausgewählt.',78,favoriteStartY+22);
  }

  // Auszeichnungen – nur zeigen, wenn es wirklich mindestens eine gibt.
  if(archive){
    ctx.fillStyle=sectionColor;
    ctx.font='850 22px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';
    ctx.fillText(data.fourthQuestionMarkUnlocked?'AUSZEICHNUNGEN':'AUSZEICHNUNG',76,1035);

    if(data.fourthQuestionMarkUnlocked){
      const badgeY=1063,badgeH=150,badgeGap=18,badgeW=(928-badgeGap)/2;

      // Archivgold – gleiche Typografie/Wertigkeit wie das zweite Badge.
      const agX=76;
      const agGradient=ctx.createLinearGradient(agX,badgeY,agX+badgeW,badgeY+badgeH);
      agGradient.addColorStop(0,'rgba(61,44,15,.98)');
      agGradient.addColorStop(.55,'rgba(37,29,16,.98)');
      agGradient.addColorStop(1,'rgba(18,17,14,.98)');
      roundedRect(ctx,agX,badgeY,badgeW,badgeH,25,agGradient,'#a98235');

      roundedRect(ctx,agX+18,badgeY+20,88,88,22,'rgba(86,62,19,.92)','#bd9340');
      ctx.textAlign='center';
      ctx.fillStyle='#f1d37c';
      ctx.font='900 22px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';
      ctx.fillText('100%',agX+62,badgeY+72);
      ctx.textAlign='left';

      ctx.fillStyle='#f2d47a';
      ctx.font='900 27px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';
      ctx.fillText('ARCHIVGOLD',agX+126,badgeY+57);

      ctx.fillStyle='#a99b79';
      ctx.font='650 14px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';
      ctx.fillText('Vollständiges Archiv',agX+126,badgeY+86);

      // Viertes Fragezeichen – ein einziges, großes, ästhetisches Fragezeichen.
      const fqX=76+badgeW+badgeGap;
      const fqGradient=ctx.createLinearGradient(fqX,badgeY,fqX+badgeW,badgeY+badgeH);
      fqGradient.addColorStop(0,'rgba(17,26,40,.99)');
      fqGradient.addColorStop(.55,'rgba(27,43,64,.99)');
      fqGradient.addColorStop(1,'rgba(12,18,28,.99)');
      roundedRect(ctx,fqX,badgeY,badgeW,badgeH,25,fqGradient,'#789cc9');

      const qGlow=ctx.createRadialGradient(fqX+62,badgeY+66,2,fqX+62,badgeY+66,74);
      qGlow.addColorStop(0,'rgba(185,218,255,.24)');
      qGlow.addColorStop(1,'rgba(185,218,255,0)');
      ctx.fillStyle=qGlow;
      ctx.fillRect(fqX+10,badgeY+10,110,116);

      roundedRect(ctx,fqX+18,badgeY+20,88,88,22,'rgba(7,14,24,.78)','#5678a3');
      ctx.textAlign='center';
      ctx.fillStyle='#f2f7ff';
      ctx.font='950 58px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';
      ctx.fillText('?',fqX+62,badgeY+83);
      ctx.textAlign='left';

      ctx.fillStyle='#f2f6fc';
      ctx.font='900 24px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';
      ctx.fillText('DAS VIERTE',fqX+126,badgeY+51);
      ctx.fillText('FRAGEZEICHEN',fqX+126,badgeY+79);

      ctx.fillStyle='#a9bad0';
      ctx.font='650 12px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';
      ctx.fillText('Alle verborgenen Spuren',fqX+126,badgeY+107);
      ctx.fillText('gefunden',fqX+126,badgeY+126);
    } else {
      // Nur eine Auszeichnung: volle Breite, damit keinerlei leerer Platz auf eine zweite hindeutet.
      const agX=76,agY=1063,agW=928,agH=128;
      const agGradient=ctx.createLinearGradient(agX,agY,agX+agW,agY+agH);
      agGradient.addColorStop(0,'rgba(61,44,15,.98)');
      agGradient.addColorStop(.52,'rgba(35,28,16,.98)');
      agGradient.addColorStop(1,'rgba(17,16,13,.98)');
      roundedRect(ctx,agX,agY,agW,agH,27,agGradient,'#ad8434');

      roundedRect(ctx,agX+22,agY+20,90,88,22,'rgba(89,64,20,.92)','#c49a42');
      ctx.textAlign='center';
      ctx.fillStyle='#f2d57c';
      ctx.font='900 24px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';
      ctx.fillText('100%',agX+67,agY+73);
      ctx.textAlign='left';

      ctx.fillStyle='#f3d57d';
      ctx.font='900 36px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';
      ctx.fillText('ARCHIVGOLD',agX+145,agY+62);

      ctx.fillStyle='#aa9a73';
      ctx.font='650 16px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';
      ctx.fillText('Vollständiges Archiv',agX+145,agY+91);
    }
  }

  // Debug-Wasserzeichen.
  if(data.debugArchive){
    ctx.save();
    ctx.translate(540,674);
    ctx.rotate(-.22);
    ctx.globalAlpha=.9;
    roundedRect(ctx,-390,-55,780,110,26,'rgba(27,18,4,.94)','#f0c75d');
    ctx.fillStyle='#ffe6a0';
    ctx.font='900 52px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';
    ctx.textAlign='center';
    ctx.fillText('DEBUG-VORSCHAU',0,2);
    ctx.font='800 20px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';
    ctx.fillText('NICHT FREIGESCHALTET · NICHT GESPEICHERT',0,37);
    ctx.restore();
  }

  // Footer.
  ctx.fillStyle=goldBackground?'#897a55':'#657080';
  ctx.font='600 18px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';
  ctx.fillText(
    data.displayName?`${data.displayName} · Die Fallkartei`:'Die Fallkartei · inoffizielles Fanprojekt',
    76,1293
  );
  ctx.textAlign='right';
  ctx.fillText('letsmagic.github.io/fallkartei',1004,1293);
  ctx.textAlign='left';

  return await new Promise((resolve,reject)=>canvas.toBlob(
    (blob)=>blob?resolve(blob):reject(new Error('Bild konnte nicht erzeugt werden.')),
    'image/png',
    .95
  ));
}
function dataNameForShare(){const name=cleanProfileName(appState.user.settings.profileName);return name?`Hörprofil von ${name} – Die Fallkartei`:'';}
async function shareProfileImage() {
  try {
    const blob=await profileImageBlob(),filename=`fallkartei-hoerprofil-${new Date().toISOString().slice(0,10)}.png`;
    const file=typeof File==='function'?new File([blob],filename,{type:'image/png'}):null;
    if(file&&navigator.share){
      let supported=true;
      try { supported=typeof navigator.canShare!=='function'||navigator.canShare({files:[file]}); } catch { supported=false; }
      if(supported){
        try { await navigator.share({title:dataNameForShare()||'Mein Hörprofil – Die Fallkartei',text:appState.user.settings.profileName?`Das ist das Hörprofil von ${cleanProfileName(appState.user.settings.profileName)}.`:'So sieht mein persönliches Hörprofil für Die drei ??? aus.',files:[file]}); return; }
        catch(error){ if(error?.name==='AbortError') return; console.warn('Teilen-Menü nicht verfügbar, Bild wird heruntergeladen.',error); }
      }
    }
    downloadBlob(blob,filename);toast('Statistikbild wurde gespeichert.');
  } catch(error) { console.error(error); toast('Statistikbild konnte nicht erzeugt werden.','error'); }
}
function profileFavoriteOptions(selectedNr='') {
  const selected=new Set((appState.user.settings.profileFavoriteNrs||[]).map(Number));
  const rank={super:4,plus:3,neutral:2,minus:1};
  const candidates=appState.catalog.filter((episode)=>statusOf(episode.nr).heard||selected.has(episode.nr)).sort((a,b)=>(rank[statusOf(b.nr).rating]||0)-(rank[statusOf(a.nr).rating]||0)||(a.rockyRanking??999)-(b.rockyRanking??999)||a.nr-b.nr);
  return '<option value="">Automatisch ergänzen</option>'+candidates.map((episode)=>{const rating=statusOf(episode.nr).rating,label=rating?`${symbols[rating]} `:'✓ ';return`<option value="${episode.nr}" ${Number(selectedNr)===episode.nr?'selected':''}>${label}${episode.nr}. ${esc(episode.titel)}</option>`;}).join('');
}
function updateProfileEditorPreview() {
  const name=cleanProfileName($('profileNameInput')?.value),initials=profileInitials(name),preview=$('profileInitialsPreview'); if(!preview)return; preview.textContent=initials||'?'; preview.classList.toggle('empty',!initials);
}
function openProfileEditor({returnTo='profile',firstOpen=false}={}) {
  profileEditorReturn=returnTo; const settings=appState.user.settings,favorites=settings.profileFavoriteNrs||[];
  $('profileEditorTitle').textContent=firstOpen?'Dein Profil einrichten':'Profil bearbeiten'; $('profileNameInput').value=settings.profileName||'';
  ['profileFavorite1','profileFavorite2','profileFavorite3'].forEach((id,index)=>{$(id).innerHTML=profileFavoriteOptions(favorites[index]||'');});
  $('profileEditorSkip').classList.toggle('hidden',!firstOpen); updateProfileEditorPreview(); openDialog('profileEditorDialog');
}
function profileIdentityHtml(data) {
  if(data.displayName)return`<section class="profile-identity"><div class="profile-avatar" aria-hidden="true">${esc(data.initials)}</div><div><span>Hörprofil von</span><strong>${esc(data.displayName)}</strong><small>Name und Favoriten bleiben lokal</small></div><button class="text-button" data-action="edit-profile">Bearbeiten</button></section>`;
  return `<button class="profile-personalize" data-action="edit-profile"><span class="profile-personalize-icon" aria-hidden="true">＋</span><span><strong>Profil personalisieren</strong><small>Optionaler Name, Initialen und eigene Top 3</small></span><b>›</b></button>`;
}
function profileFavoritesHtml(data) {
  if(!data.favorites.length)return`<section class="profile-favorites"><div class="profile-section-heading"><div><span class="eyebrow">Deine Top 3</span><h3>Noch keine Favoriten</h3></div><button class="text-button" data-action="edit-profile">Auswählen</button></div><p class="muted">Bewerte Folgen oder wähle deine Lieblingsfolgen selbst aus.</p></section>`;
  const manual=new Set((appState.user.settings.profileFavoriteNrs||[]).map(Number));
  return `<section class="profile-favorites"><div class="profile-section-heading"><div><span class="eyebrow">Deine Top 3</span><h3>Lieblingsfolgen</h3></div><button class="text-button" data-action="edit-profile">Bearbeiten</button></div><div class="profile-favorite-list">${data.favorites.map((episode,index)=>`<button data-open-episode="${episode.nr}"><span>${index+1}</span><div><strong>${esc(episode.titel)}</strong><small>${episodeTypeLabel(episode)} · ${manual.has(episode.nr)?'selbst gewählt':'automatisch ergänzt'}</small></div><b>›</b></button>`).join('')}</div></section>`;
}
function renderProfile() {
  const data=profileSnapshot(),{profile,insights,heard,hours,ratings}=data;
  $('profileContent').innerHTML=`${profileIdentityHtml(data)}<div class="profile-stats"><div class="profile-stat"><strong>${heard}</strong><span>gehört</span></div><div class="profile-stat"><strong>${ratings}</strong><span>bewertet</span></div><div class="profile-stat"><strong>${hours}</strong><span>Hörstunden</span></div></div>${archiveBadgeHtml(data)}${fourthQuestionMarkBannerHtml(data)}${archiveShareStyleHtml(data)}<p class="profile-summary">${esc(profileSummary(insights,profile.ratingCount))}</p><button class="profile-share-button ${data.archiveShareStyle==='gold'?'archive-gold':''}" data-action="share-profile"><span class="share-button-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="M12 16V3m0 0L7.5 7.5M12 3l4.5 4.5"/><path d="M5 12.5v6A2.5 2.5 0 0 0 7.5 21h9a2.5 2.5 0 0 0 2.5-2.5v-6"/></svg></span><span><strong>Statistik als Bild teilen</strong><small>Als Bild speichern oder teilen</small></span><b>›</b></button>${profileFavoritesHtml(data)}<div class="insight-block"><h3>Das magst du</h3><div class="chips">${[...insights.characters,...insights.tags,...insights.authors].slice(0,9).map((item)=>`<span>${esc(item.label)}</span>`).join('')||'<span>Noch zu wenig Daten</span>'}</div></div>${insights.negativeTags.length||insights.negativeAuthors.length?`<div class="insight-block"><h3>Passt eher nicht</h3><div class="chips">${[...insights.negativeTags,...insights.negativeAuthors].slice(0,6).map((item)=>`<span>${esc(item.label)}</span>`).join('')}</div></div>`:''}<div class="profile-actions"><div class="button-row"><button class="button primary" data-action="open-quick-rate">Schnell bewerten</button><button class="button secondary" data-action="open-my-ratings">Meine Bewertungen</button></div></div>`; openDialog('profileDialog');
}
function openProfileEntry() { if(!appState.user.settings.profileSetupSeen){openProfileEditor({returnTo:'profile',firstOpen:true});return;} renderProfile(); }
function detailNeighbors(nr) { const available=appState.catalog.filter(availableEpisode); const index=available.findIndex((episode)=>episode.nr===Number(nr)); return {prev:available[index-1],next:available[index+1]}; }
function streamingSectionHtml(episode) {
  const options=streamingOptions(episode),preferred=preferredStreaming(episode);
  if(!options.length)return'<p class="muted">Für diese Folge sind derzeit keine Anbieterlinks hinterlegt.</p>';
  const others=options.filter((entry)=>entry.id!==preferred?.id);
  return `<div class="streaming-primary">${preferred?`<a class="button primary full" href="${esc(preferred.url)}" target="_blank" rel="noopener">▶ Bei ${esc(preferred.label)} anhören</a>`:''}</div>${others.length?`<details class="provider-details"><summary><span>Weitere Anbieter</span><small>${others.length} verfügbar</small><b>＋</b></summary><div class="provider-grid">${others.map((entry)=>`<a href="${esc(entry.url)}" target="_blank" rel="noopener"><strong>${esc(entry.label)}</strong><span>Öffnen</span></a>`).join('')}</div></details>`:''}`;
}
function setupListenHistoryInteractions() {
  const rows=$$('.listen-history-item',$('episodeDialogBody'));
  const closeRow=(row)=>{
    row.classList.remove('is-open','is-dragging');
    row.style.removeProperty('--listen-swipe-offset');
  };
  const closeOthers=(active)=>rows.forEach((row)=>{if(row!==active)closeRow(row);});

  rows.forEach((row)=>{
    if(row.dataset.listenSwipeReady==='true') return;
    row.dataset.listenSwipeReady='true';
    const content=row.querySelector('.listen-history-content');
    if(!content) return;

    let mode=null,id=null,startX=0,startY=0,startOffset=0,currentOffset=0,horizontal=false;

    const begin=(type,pointerId,x,y)=>{
      mode=type; id=pointerId; startX=x; startY=y;
      startOffset=row.classList.contains('is-open')?68:0;
      currentOffset=startOffset; horizontal=false;
      closeOthers(row);
      row.classList.add('is-dragging');
    };
    const move=(x,y,event)=>{
      if(mode===null) return;
      const dx=startX-x,dy=startY-y;
      if(!horizontal) {
        if(Math.abs(dy)>Math.abs(dx)&&Math.abs(dy)>8) {
          closeRow(row); mode=null; return;
        }
        if(Math.abs(dx)>8) horizontal=true;
      }
      if(!horizontal) return;
      currentOffset=Math.max(0,Math.min(68,startOffset+dx));
      row.style.setProperty('--listen-swipe-offset',`${currentOffset}px`);
      event?.preventDefault?.();
    };
    const finish=()=>{
      if(mode===null) return;
      const open=currentOffset>=34;
      mode=null; id=null;
      row.classList.remove('is-dragging');
      row.classList.toggle('is-open',open);
      row.style.removeProperty('--listen-swipe-offset');
    };

    content.addEventListener('click',()=>{
      if(row.classList.contains('is-open')) closeRow(row);
    });

    content.addEventListener('pointerdown',(event)=>{
      if(event.pointerType==='touch'||(event.pointerType==='mouse'&&event.button!==0)) return;
      begin('pointer',event.pointerId,event.clientX,event.clientY);
      content.setPointerCapture?.(event.pointerId);
    });
    content.addEventListener('pointermove',(event)=>{
      if(mode!=='pointer'||id!==event.pointerId) return;
      move(event.clientX,event.clientY,event);
    });
    content.addEventListener('pointerup',(event)=>{
      if(mode==='pointer'&&id===event.pointerId) finish();
    });
    content.addEventListener('pointercancel',()=>{
      if(mode==='pointer') {mode=null;closeRow(row);}
    });

    content.addEventListener('touchstart',(event)=>{
      if(event.touches.length!==1) return;
      const touch=event.touches[0];
      begin('touch',touch.identifier,touch.clientX,touch.clientY);
    },{passive:true});
    content.addEventListener('touchmove',(event)=>{
      if(mode!=='touch') return;
      const touch=Array.from(event.touches).find((item)=>item.identifier===id);
      if(touch) move(touch.clientX,touch.clientY,event);
    },{passive:false});
    content.addEventListener('touchend',(event)=>{
      if(mode!=='touch') return;
      const touch=Array.from(event.changedTouches).find((item)=>item.identifier===id);
      if(touch) {
        currentOffset=Math.max(0,Math.min(68,startOffset+(startX-touch.clientX)));
      }
      finish();
    },{passive:true});
    content.addEventListener('touchcancel',()=>{
      if(mode==='touch') {mode=null;closeRow(row);}
    },{passive:true});
  });
}
function renderEpisodeDetail(nr) {
  const episode=getEpisode(nr); if (!episode) return; appState.detailNr=episode.nr; const status=statusOf(episode.nr),pinned=appState.user.pinned.includes(episode.nr),queued=appState.user.settings.queue.includes(episode.nr),similar=similarEpisodes(episode),listens=appState.user.history.filter((item)=>item.nr===episode.nr).sort((a,b)=>new Date(a.at)-new Date(b.at)),preferred=preferredStreaming(episode),neighbors=detailNeighbors(episode.nr);
  $('episodeDialogTitle').innerHTML=`<span class="eyebrow">${episodeTypeLabel(episode)}</span><h2>${esc(episode.titel)}</h2>`;
  $('episodeDialogBody').innerHTML=`<section class="detail-hero"><div class="detail-meta">${metaLine(episode)}</div>${episode.beschreibung?`<p>${esc(episode.beschreibung)}</p>`:''}<div class="episode-tags">${episode.tags.map((tag)=>`<span>${esc(tag)}</span>`).join('')}</div></section><section class="detail-section detail-section-primary status-section"><h3>Dein Status</h3>${ratingButtons(episode.nr,status.rating)}<div class="detail-action-grid"><button data-action="heard" data-nr="${episode.nr}" class="button secondary ${status.heard?'active':''}">${status.heard?'✓ Gehört':'Als gehört markieren'}</button><button data-action="queue" data-nr="${episode.nr}" class="button secondary ${queued?'active':''}">${queued?'✓ Als Nächstes':'＋ Als Nächstes'}</button><button data-action="pin" data-nr="${episode.nr}" class="button secondary ${pinned?'active':''}">${pinned?'📌 Angeheftet':'○ Anheften'}</button></div></section><section class="detail-section detail-section-primary streaming-section"><h3>Streaming</h3>${streamingSectionHtml(episode)}</section><section class="detail-section detail-section-secondary"><h3>Folgenwissen</h3><div class="facts-grid"><div class="fact"><span>Autor</span><strong>${esc(episode.author||'—')}</strong></div><div class="fact"><span>Hörspielskript</span><strong>${esc(episode.scriptAuthor||'—')}</strong></div><div class="fact"><span>Veröffentlicht</span><strong>${formatDate(episode.releaseDate)}</strong></div><div class="fact"><span>Rocky-Beach</span><strong>${Number.isFinite(episode.rockyRanking)?episode.rockyRanking.toFixed(2):'—'}</strong></div></div>${episode.featuredCharacters.length?`<h4>Prägende Figuren</h4><div class="chips">${episode.featuredCharacters.map((name)=>`<span>${esc(name)}</span>`).join('')}</div>`:''}${episode.characters.length?`<h4>Figuren & Sprecherrollen</h4><div class="chips">${episode.characters.slice(0,30).map((name)=>`<span>${esc(name)}</span>`).join('')}</div>`:''}${episode.chapters.length?`<h4>Kapitel</h4><ol>${episode.chapters.map((chapter)=>`<li>${esc(chapter)}</li>`).join('')}</ol>`:''}</section><section class="detail-section detail-section-secondary"><h3>Hörverlauf</h3>${listens.length?`<div class="listen-history">${listens.slice(-20).map((item,index)=>`<div class="listen-history-item" data-listen-row="${esc(item.id)}"><button class="listen-history-delete" data-action="delete-listen" data-listen-id="${esc(item.id)}" data-nr="${episode.nr}" aria-label="${Math.max(0,listens.length-20)+index+1}. Hörvorgang löschen">×</button><div class="listen-history-content"><span>${Math.max(0,listens.length-20)+index+1}. Hören</span><strong>${formatDate(item.at)}</strong></div></div>`).join('')}</div><small class="listen-history-hint">Zum Löschen einen Eintrag nach links wischen.</small>`:'<p class="muted">Noch kein Hörvorgang erfasst.</p>'}<button data-action="add-listen" data-nr="${episode.nr}" class="text-button">Weiteren Hörvorgang hinzufügen</button></section><section class="detail-section detail-section-secondary"><h3>Persönliche Notiz</h3><textarea id="episodeNote" rows="6" placeholder="Was möchtest du dir merken?">${esc(status.note||'')}</textarea><small id="noteSaveState" class="muted"></small></section><section class="detail-section detail-section-secondary"><h3>Zu Playlists hinzufügen</h3><div class="playlist-check-list">${appState.user.playlists.length?appState.user.playlists.map((playlist)=>`<label><input type="checkbox" data-playlist-check="${esc(playlist.id)}" data-nr="${episode.nr}" ${playlist.episodeNrs.includes(episode.nr)?'checked':''}><span>${esc(playlist.name)}</span></label>`).join(''):'<p class="muted">Noch keine eigene Playlist vorhanden.</p>'}<button data-action="new-playlist-with" data-nr="${episode.nr}" class="text-button">＋ Neue Playlist mit dieser Folge</button></div></section>${similar.length?`<section class="detail-section detail-section-secondary"><h3>Ähnliche Folgen</h3><div class="mini-list">${similar.map((entry)=>miniRow(entry.episode)).join('')}</div></section>`:''}<div class="detail-nav"><button class="button secondary" data-action="detail-prev" ${neighbors.prev?'':'disabled'}>← Vorherige</button><button class="button secondary" data-action="detail-next" ${neighbors.next?'':'disabled'}>Nächste →</button></div>`;
  $('episodeStickyActions').innerHTML=`${preferred?`<a href="${esc(preferred.url)}" target="_blank" rel="noopener" class="button primary">▶ Anhören</a>`:''}<button data-action="heard" data-nr="${episode.nr}" class="button sticky-tertiary">${status.heard?'✓ Gehört':'Gehört'}</button><button data-action="rate-focus" class="button secondary sticky-secondary">Bewerten</button>`;
  setupListenHistoryInteractions();
  openDialog('episodeDialog');
}


function quickRateCandidates() {
  const rated=new Set(Object.entries(appState.user.episodes).filter(([,status])=>status.rating).map(([nr])=>Number(nr)));
  const heardUnrated=appState.catalog.filter((episode)=>statusOf(episode.nr).heard&&!rated.has(episode.nr)); const popular=appState.catalog.filter((episode)=>!rated.has(episode.nr)&&availableEpisode(episode)).sort((a,b)=>(a.rockyRanking??999)-(b.rockyRanking??999));
  return [...new Map([...heardUnrated,...popular].map((episode)=>[episode.nr,episode])).values()];
}
function openQuickRate() { appState.quickRateQueue=quickRateCandidates(); appState.quickRateIndex=0; appState.quickRateHistory=[]; renderQuickRate(); openDialog('quickRateDialog'); }
function captureQuickRateStep(episode) {
  const nr=episode.nr,hasState=Object.prototype.hasOwnProperty.call(appState.user.episodes,nr);
  appState.quickRateHistory.push({nr,index:appState.quickRateIndex,hasState,status:hasState?cloneValue(appState.user.episodes[nr]):null,history:cloneValue(appState.user.history.filter((item)=>item.nr===nr))});
}
function restoreQuickRateStep() {
  const step=appState.quickRateHistory.pop(); if (!step) return;
  if (step.hasState) appState.user.episodes[step.nr]=step.status; else delete appState.user.episodes[step.nr];
  appState.user.history=appState.user.history.filter((item)=>item.nr!==step.nr).concat(step.history).sort((a,b)=>new Date(b.at)-new Date(a.at));
  appState.quickRateIndex=step.index; saveUser(); renderQuickRate(); renderHome(); renderRanking(); toast('Letzte Auswahl zurückgenommen.');
}
function renderQuickRate() {
  const total=appState.quickRateQueue.length,episode=appState.quickRateQueue[appState.quickRateIndex],count=profileRatingCount(),canGoBack=appState.quickRateHistory.length>0;
  if (!total) {
    $('quickRateContent').innerHTML=`<div class="quick-rate-card"><div class="tutorial-visual">✓</div><h3>Keine offenen Folgen</h3><p class="muted">Alle derzeit verfügbaren Folgen sind bereits bewertet.</p><button class="button primary full" data-close-dialog="quickRateDialog">Fertig</button></div>`;
    return;
  }
  if (!episode) {
    $('quickRateContent').innerHTML=`<div class="quick-rate-progress-copy"><span>${total} von ${total} durchgesehen</span><strong>100 %</strong></div><div class="quick-rate-progress" role="progressbar" aria-label="Fortschritt der Schnellbewertung" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${total}"><span style="width:100%"></span></div><div class="quick-rate-card"><div class="tutorial-visual">✓</div><h3>Runde abgeschlossen</h3><p class="muted">Du hast ${total} Folge${total===1?'':'n'} in dieser Schnellbewertung durchgesehen.</p>${canGoBack?'<button class="button secondary full" data-quick-action="back">← Letzte Auswahl ändern</button>':''}<button class="button primary full" data-close-dialog="quickRateDialog">Fertig</button></div>`;
    return;
  }
  const position=appState.quickRateIndex+1,progress=Math.min(100,position/total*100);
  $('quickRateContent').innerHTML=`<div class="quick-rate-progress-copy"><span>Folge ${position} von ${total}</span><strong>${Math.round(progress)} %</strong></div><div class="quick-rate-progress" role="progressbar" aria-label="Fortschritt der Schnellbewertung" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${position}"><span style="width:${progress}%"></span></div><div class="quick-rate-card"><span class="episode-number">${episode.nr>=10000?'✦':episode.nr}</span><small>Folge ${episode.nr}</small><button class="quick-rate-title" data-open-episode="${episode.nr}" aria-label="Details zu ${esc(episode.titel)} öffnen"><h3>${esc(episode.titel)}</h3></button><p class="muted quick-rate-meta">${metaLine(episode)}</p><div class="quick-rate-actions">${['minus','neutral','plus','super'].map((rating)=>`<button class="${rating}" data-quick-rating="${rating}" aria-label="${RATING_LABELS[rating]}">${symbols[rating]}</button>`).join('')}</div><div class="quick-rate-navigation"><button class="button secondary" data-quick-action="back" ${canGoBack?'':'disabled'}>← Zurück</button><button class="button secondary" data-quick-action="unheard">Nicht gehört</button><button class="button ghost" data-quick-action="skip">Überspringen</button></div><p class="muted quick-rate-profile">${count} Bewertungen · Profil ${count>=18?'stark':count>=7?'mittel':'im Aufbau'}</p><small class="quick-rate-hint">Du kannst jede Bewertung später jederzeit ändern.</small></div>`;
}
function advanceQuickRate() { appState.quickRateIndex+=1; renderQuickRate(); }
function renderFeedback() {
  const episode=getEpisode(appState.recommendationNr); if (!episode) return; const options=feedbackOptions(episode);
  $('feedbackContent').innerHTML=`<p class="muted">Wähle, welcher Teil von „${esc(episode.titel)}“ künftig stärker oder schwächer gewichtet werden soll.</p><div class="feedback-options">${options.map((item)=>`<article class="feedback-option"><strong>${esc(item.label)}</strong><div><button class="button secondary" data-feedback-key="${esc(item.key)}" data-feedback-direction="-1">Weniger davon</button><button class="button secondary" data-feedback-key="${esc(item.key)}" data-feedback-direction="1">Mehr davon</button></div></article>`).join('')}</div>`; openDialog('feedbackDialog');
}

function diagnosticsText() {
  const status=navigator.serviceWorker?.controller?'aktiv':'nicht kontrolliert',covers=appState.catalog.filter((episode)=>episode.coverUrl).length,providers=appState.catalog.reduce((max,episode)=>Math.max(max,streamingOptions(episode).length),0);
  return [`App-Version: ${APP_VERSION}`,`Katalog: ${appState.catalog.length} Folgen`,`Cover verfügbar: ${covers}`,`Streamingdienste: bis zu ${providers}`,`Metadaten aktualisiert: ${formatRelativeDate(appState.metadataUpdatedAt)}`,`Persönliche Zustände: ${Object.keys(appState.user.episodes).length}`,`Bewertungen: ${profileRatingCount()}`,`Playlists: ${appState.user.playlists.length}`,`Warteschlange: ${appState.user.settings.queue.length}`,`Service Worker: ${status}`,`IndexedDB: ${'indexedDB' in window?'verfügbar':'nicht verfügbar'}`].join('\n');
}
function renderSettings() {
  $('streamingServiceSelect').value=appState.user.settings.preferredService; $$('[data-episode-view]').forEach((button)=>button.classList.toggle('active',button.dataset.episodeView===appState.user.settings.episodeView));
  $('diagnosticsCard').innerHTML=diagnosticsText().split('\n').map((line)=>{const [label,...rest]=line.split(': ');return`<div class="diagnostic"><span>${esc(label)}</span><strong>${esc(rest.join(': '))}</strong></div>`;}).join('');
  $('stopArchiveDebug').classList.toggle('hidden',!appState.debugArchivePreview);
}
function populateSelects() {
  const authors=[...new Set(appState.catalog.map((episode)=>episode.author).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'de'));
  const eras=[...new Set(appState.catalog.map((episode)=>episode.era).filter(Boolean))];
  const years=[...new Set(appState.catalog.map((episode)=>episode.year).filter(Boolean))].sort((a,b)=>b-a);
  const authorOptions=authors.map((value)=>`<option>${esc(value)}</option>`).join('');
  const eraOptions=eras.map((value)=>`<option>${esc(value)}</option>`).join('');

  $('authorFilter').innerHTML='<option value="all">Alle</option>'+authorOptions;
  $('smartAuthor').innerHTML='<option value="all">Alle</option>'+authorOptions;
  $('recommendationAuthor').innerHTML='<option value="all">Alle Autoren</option>'+authorOptions;
  $('eraFilter').innerHTML='<option value="all">Alle</option>'+eraOptions;
  $('recommendationEra').innerHTML='<option value="all">Alle Ären</option>'+eraOptions;
  $('yearFilter').innerHTML='<option value="all">Alle</option>'+years.map((value)=>`<option>${value}</option>`).join('');

  appState.authorFilter=authors.includes(appState.authorFilter)?appState.authorFilter:'all';
  appState.eraFilter=eras.includes(appState.eraFilter)?appState.eraFilter:'all';
  appState.recommendationAuthor=authors.includes(appState.recommendationAuthor)?appState.recommendationAuthor:'all';
  appState.recommendationEra=eras.includes(appState.recommendationEra)?appState.recommendationEra:'all';

  $('authorFilter').value=appState.authorFilter;
  $('eraFilter').value=appState.eraFilter;
  $('recommendationStatus').value=['unheard','heard','all'].includes(appState.recommendationStatus)?appState.recommendationStatus:'unheard';
  $('recommendationAuthor').value=appState.recommendationAuthor;
  $('recommendationEra').value=appState.recommendationEra;
  $('yearFilter').value=years.map(String).includes(String(appState.yearFilter))?String(appState.yearFilter):'all';
  $('episodeSort').value=appState.sort;
}
function renderImportPreview(candidate) {
  appState.importCandidate=candidate; const preview=backupPreview(candidate); $('importPreview').innerHTML=`<p>Backup ${preview.exportedAt?`vom <strong>${formatDate(preview.exportedAt)}</strong>`:'ohne Datumsangabe'} · Version ${esc(preview.version)}</p><div class="import-summary"><div><strong>${preview.episodeStates}</strong><span>Folgenstände</span></div><div><strong>${preview.playlists}</strong><span>Playlists</span></div><div><strong>${preview.pinned}</strong><span>Anheftungen</span></div><div><strong>${preview.history}</strong><span>Verlaufseinträge</span></div></div><p class="muted">${preview.conflicts} Einträge unterscheiden sich vom aktuellen Stand.</p><div class="button-row"><button class="button primary" data-import-mode="merge">Zusammenführen</button><button class="button danger" data-import-mode="replace">Ersetzen</button></div><p class="muted">Beim Ersetzen wird vorher automatisch dein aktueller Stand heruntergeladen.</p>`; openDialog('importDialog');
}
function renderTutorial(step=0) {
  const steps=[{icon:'ID',title:'Dein Profil',text:'Ein Anzeigename macht geteilte Hörprofile für Freunde sofort erkennbar. Er ist freiwillig und bleibt ausschließlich lokal auf deinem Gerät.'},{icon:'⌕',title:'Folge finden',text:'Auf der Startseite bekommst du sofort einen verfügbaren, normalerweise ungehörten Vorschlag. Laufzeit und Stimmung kannst du optional einschränken.'},{icon:'★',title:'Bewerten',text:'Minus, Neutral, Plus und Super verbessern dein Profil. Eine Bewertung markiert die Folge automatisch als gehört.'},{icon:'↓',title:'Daten sichern',text:'Alles bleibt lokal auf deinem Gerät. Exportiere regelmäßig ein JSON-Backup, besonders vor einem Gerätewechsel.'}]; const item=steps[step]; $('tutorialTitle').textContent=item.title;
  if(step===0){const name=cleanProfileName(appState.user.settings.profileName);$('tutorialContent').innerHTML=`<div class="tutorial-profile-step"><div id="tutorialInitialsPreview" class="profile-editor-avatar ${name?'':'empty'}" aria-hidden="true">${esc(profileInitials(name)||'?')}</div><p>${esc(item.text)}</p><label><span>Anzeigename <small>optional</small></span><input id="tutorialProfileName" maxlength="24" autocomplete="nickname" value="${esc(name)}" placeholder="Zum Beispiel Niklas oder RockyFan"></label><small class="quick-rate-hint">Du kannst den Namen später jederzeit ändern oder vollständig entfernen.</small><div class="tutorial-dots">${steps.map((_,index)=>`<span class="${index===step?'active':''}"></span>`).join('')}</div><button class="button primary full" data-tutorial-profile-save>Speichern und weiter</button><button class="text-button" data-tutorial-profile-skip>Ohne Namen fortfahren</button></div>`;openDialog('tutorialDialog');return;}
  $('tutorialContent').innerHTML=`<div class="quick-rate-card"><div class="tutorial-visual">${item.icon}</div><p>${esc(item.text)}</p><div class="tutorial-dots">${steps.map((_,index)=>`<span class="${index===step?'active':''}"></span>`).join('')}</div><button class="button primary full" data-tutorial-next="${step}">${step===steps.length-1?'App benutzen':'Weiter'}</button>${step<steps.length-1?'<button class="text-button" data-tutorial-skip>Überspringen</button>':''}</div>`; openDialog('tutorialDialog');
}

function navigate(page,{restore=true}={}) {
  if (appState.page) appState.scrollPositions[appState.page]=window.scrollY; appState.page=page;
  $$('.page').forEach((node)=>node.classList.toggle('active',node.dataset.page===page)); $$('.bottom-nav [data-go]').forEach((button)=>button.classList.toggle('active',button.dataset.go===page));
  history.replaceState(null,'',page==='home'?'./':`#${page}`); requestAnimationFrame(()=>window.scrollTo(0,restore?(appState.scrollPositions[page]||0):0));
}
function refreshViews(detailNr=null) { renderHome(); renderEpisodes(); renderRanking(); renderPlaylists(); renderSettings(); if (detailNr&&$('episodeDialog').open) renderEpisodeDetail(detailNr); }
async function toggleHeardAction(nr) {
  const status=statusOf(nr);
  if (status.heard&&status.rating) {
    const yes=await confirmAction({title:'Wieder auf ungehört setzen?',text:'Dabei wird auch deine Bewertung entfernt. Notiz und Playlists bleiben erhalten.',accept:'Auf ungehört setzen'});
    if (!yes) return;
  }
  const wasQueued=appState.user.settings.queue.includes(Number(nr));
  const nextStatus=setHeard(nr,!status.heard);
  const message=nextStatus.heard
    ? wasQueued?'Als gehört markiert und aus „Als Nächstes“ entfernt.':'Als gehört markiert.'
    : 'Auf ungehört gesetzt.';
  toast(message); refreshViews(nr);
}
function handleRating(nr,rating) {
  const wasQueued=appState.user.settings.queue.includes(Number(nr));
  const status=setRating(nr,rating);
  const message=status.rating?`${RATING_LABELS[status.rating]} gespeichert.`:'Bewertung entfernt.';
  toast(wasQueued&&status.heard?`${message} Aus „Als Nächstes“ entfernt.`:message);
  refreshViews(nr);
}
async function sharePlaylist(id) {
  const playlist=getPlaylist(id); if (!playlist) return; const text=[playlist.name||playlist.title,...playlist.episodes.map((episode)=>`${episode.nr}. ${episode.titel}`)].join('\n');
  try { if (navigator.share) await navigator.share({title:playlist.name||playlist.title,text}); else { await navigator.clipboard.writeText(text); toast('Playlist kopiert.'); } } catch(error) { if(error?.name!=='AbortError') toast('Teilen nicht möglich.','error'); }
}

function bindDelegatedEvents() {
  document.addEventListener('click',async(event)=>{
    const close=event.target.closest('[data-close-dialog]'); if(close){closeDialog(close.dataset.closeDialog);return;}
    const go=event.target.closest('[data-go]'); if(go){const page=go.dataset.go; const closeId=go.dataset.closeDialog;if(closeId)closeDialog(closeId);navigate(page);return;}
    const openEpisode=event.target.closest('[data-open-episode]'); if(openEpisode){renderEpisodeDetail(Number(openEpisode.dataset.openEpisode));return;}
    const openPlaylist=event.target.closest('[data-open-playlist]'); if(openPlaylist){renderPlaylistDetail(openPlaylist.dataset.openPlaylist);return;}
    const clear=event.target.closest('[data-clear-filter]'); if(clear){const key=clear.dataset.clearFilter;if(key==='all'||key==='filter')appState.filter='all';if(key==='all'||key==='author')appState.authorFilter='all';if(key==='all'||key==='era')appState.eraFilter='all';if(key==='all'||key==='year')appState.yearFilter='all';if(key==='all'||key==='search'){appState.search='';$('episodeSearch').value='';}populateSelects();persistFilters();renderEpisodes();return;}
    const quickRating=event.target.closest('[data-quick-rating]'); if(quickRating){const episode=appState.quickRateQueue[appState.quickRateIndex];if(episode){captureQuickRateStep(episode);setRating(episode.nr,quickRating.dataset.quickRating);if(profileRatingCount()%5===0)toast('Dein Geschmacksprofil wurde verbessert.');advanceQuickRate();renderHome();renderRanking();}return;}
    const quickAction=event.target.closest('[data-quick-action]'); if(quickAction){if(quickAction.dataset.quickAction==='back'){restoreQuickRateStep();return;}const episode=appState.quickRateQueue[appState.quickRateIndex];if(!episode)return;captureQuickRateStep(episode);if(quickAction.dataset.quickAction==='unheard'&&statusOf(episode.nr).heard)setHeard(episode.nr,false);advanceQuickRate();renderHome();renderRanking();return;}
    const feedback=event.target.closest('[data-feedback-key]'); if(feedback){adjustFeatureFeedback(feedback.dataset.feedbackKey,Number(feedback.dataset.feedbackDirection));closeDialog('feedbackDialog');pickRecommendation();toast('Deine Präferenz wurde gespeichert.');return;}
    const importButton=event.target.closest('[data-import-mode]'); if(importButton){const mode=importButton.dataset.importMode;if(mode==='replace')await exportBackup({forceDownload:true});await applyImport(appState.importCandidate,mode);closeDialog('importDialog');setStoredFilters();populateSelects();renderAll();toast(mode==='replace'?'Backup ersetzt aktuellen Stand.':'Backup wurde zusammengeführt.');return;}
    const tutorialProfileSave=event.target.closest('[data-tutorial-profile-save]');if(tutorialProfileSave){appState.user.settings.profileName=cleanProfileName($('tutorialProfileName')?.value);appState.user.settings.profileSetupSeen=true;saveUser();renderTutorial(1);return;}
    if(event.target.closest('[data-tutorial-profile-skip]')){appState.user.settings.profileSetupSeen=true;saveUser();renderTutorial(1);return;}
    const tutorialNext=event.target.closest('[data-tutorial-next]'); if(tutorialNext){const step=Number(tutorialNext.dataset.tutorialNext);if(step>=3){appState.user.settings.tutorialCompleted=true;saveUser();closeDialog('tutorialDialog');}else renderTutorial(step+1);return;}
    if(event.target.closest('[data-tutorial-skip]')){appState.user.settings.tutorialCompleted=true;saveUser();closeDialog('tutorialDialog');return;}
    const action=event.target.closest('[data-action]'); if(!action)return; const nr=Number(action.dataset.nr);
    switch(action.dataset.action){
      case'rate':handleRating(nr,action.dataset.rating);break;
      case'heard':await toggleHeardAction(nr);break;
      case'add-listen':addListen(nr);toast('Weiterer Hörvorgang hinzugefügt.');refreshViews(nr);break;
      case'delete-listen':{
        const listenId=action.dataset.listenId;
        const count=appState.user.history.filter((item)=>item.nr===nr).length;
        const last=count<=1;
        const yes=await confirmAction({
          title:'Hörvorgang löschen?',
          text:last
            ?'Das ist der einzige Hörvorgang. Die Folge wird dadurch auf ungehört gesetzt und eine vorhandene Bewertung entfernt. Notiz und Playlists bleiben erhalten.'
            :'Nur dieser einzelne Verlaufseintrag wird entfernt. Die übrigen Hörvorgänge bleiben erhalten.',
          accept:'Hörvorgang löschen'
        });
        if(!yes) break;
        const result=removeListen(listenId);
        if(result) {
          toast(last?'Hörvorgang entfernt und Folge auf ungehört gesetzt.':'Hörvorgang entfernt.');
          refreshViews(nr);
        }
        break;
      }
      case'clear-playlist-search':
        appState.playlistSearch='';
        if($('playlistEpisodeSearch')) $('playlistEpisodeSearch').value='';
        renderPlaylistSearchResults(action.dataset.playlistId||appState.currentPlaylistId);
        break;
      case'pin':toast(togglePinned(nr)?'Folge angeheftet.':'Anheftung entfernt.');refreshViews(nr);break;case'queue':toast(toggleQueue(nr)?'Zur Warteschlange hinzugefügt.':'Aus der Warteschlange entfernt.');refreshViews(nr);break;
      case'queue-up':moveQueueItem(nr,-1);renderPlaylists();renderHome();break;case'queue-down':moveQueueItem(nr,1);renderPlaylists();renderHome();break;case'queue-remove':removeFromQueue(nr);renderPlaylists();renderHome();break;
      case'snooze':snoozeRecommendation(nr);appState.recommendationNr=null;renderHome();toast('Die Folge wird sieben Tage nicht empfohlen.');break;case'hide-recommendation':hideRecommendation(nr);appState.recommendationNr=null;renderHome();toast('Die Folge wurde ausgeblendet.');break;
      case'archive-badge':{
        archiveBadgeTapCount+=1;
        clearTimeout(archiveBadgeTapTimer);
        action.classList.remove('tap-pulse');void action.offsetWidth;action.classList.add('tap-pulse');
        archiveBadgeTapTimer=setTimeout(()=>{archiveBadgeTapCount=0;action.classList.remove('tap-pulse');},1500);
        if(archiveBadgeTapCount>=3){archiveBadgeTapCount=0;clearTimeout(archiveBadgeTapTimer);renderArchiveDossier();}
        break;
      }
      case'archive-open-profile':closeDialog('archiveCelebrationDialog');renderProfile();break;
      case'archive-relisten':
        closeDialog('archiveCelebrationDialog');
        appState.recommendationStatus='heard';
        appState.recommendationNr=null;
        appState.recommendationSessionHistory=[];
        $('recommendationStatus').value='heard';
        navigate('home',{restore:false});
        pickRecommendation();
        break;
      case'copy-archive-code':{
        const code=action.dataset.code||getArchiveCode();
        try {
          await navigator.clipboard.writeText(code);
          toast('Archivcode kopiert.');
        } catch {
          toast('Archivcode konnte nicht kopiert werden.','warning');
        }
        break;
      }
      case'open-fourth-question-mark':renderFourthQuestionMarkCase();break;
      case'fourth-question-mark-banner':renderFourthQuestionMarkCase();break;
      case'archive-share-style':{
        const style=setArchiveShareStyle(action.dataset.style);
        renderProfile();
        toast(style==='gold'?'Archivgold-Hintergrund aktiviert.':'Normaler Hintergrund aktiviert.');
        break;
      }
      case'share-profile':await shareProfileImage();break;case'edit-profile':closeDialog('profileDialog');openProfileEditor({returnTo:'profile'});break;case'open-quick-rate':closeDialog('profileDialog');openQuickRate();break;case'open-my-ratings':appState.ranking='mine';renderRanking();closeDialog('profileDialog');navigate('ranking',{restore:false});break;case'rate-focus':$('episodeDialogBody').querySelector('.rating-buttons')?.scrollIntoView({behavior:'smooth',block:'center'});break;case'new-playlist-with':openPlaylistEditor(null,nr);break;
      case'queue-playlist':{const playlist=getPlaylist(action.dataset.playlistId);if(playlist){addManyToQueue(playlist.episodes.map((episode)=>episode.nr));renderPlaylists();renderHome();toast(`${playlist.episodes.length} Folgen vorgemerkt.`);}break;}
      case'share-playlist':await sharePlaylist(action.dataset.playlistId);break;case'playlist-up':movePlaylistEpisode(action.dataset.playlistId,nr,-1);renderPlaylistDetail(action.dataset.playlistId);renderPlaylists();break;case'playlist-down':movePlaylistEpisode(action.dataset.playlistId,nr,1);renderPlaylistDetail(action.dataset.playlistId);renderPlaylists();break;case'playlist-remove':removeEpisodeFromPlaylist(action.dataset.playlistId,nr);renderPlaylistDetail(action.dataset.playlistId);renderPlaylists();break;case'playlist-add':addEpisodeToPlaylist(action.dataset.playlistId,nr);renderPlaylistDetail(action.dataset.playlistId);renderPlaylists();toast('Zur Playlist hinzugefügt.');break;
      case'edit-playlist':{const id=action.dataset.playlistId;closeDialog('playlistDialog');openPlaylistEditor(id);break;}case'delete-playlist':{const id=action.dataset.playlistId;if(await confirmAction({title:'Playlist löschen?',text:'Die enthaltenen Folgen und Bewertungen bleiben erhalten.',accept:'Playlist löschen'})){deletePlaylist(id);closeDialog('playlistDialog');renderPlaylists();toast('Playlist gelöscht.');}break;}
      case'smart-regenerate':{if(appState.smartPlaylistOptions)await createSmartPlaylistPreview(appState.smartPlaylistOptions,{regenerate:true});break;}
      case'smart-remove':{const draft=appState.smartPlaylistDraft;if(draft){draft.episodes=draft.episodes.filter((episode)=>episode.nr!==nr);draft.episodeNrs=draft.episodes.map((episode)=>episode.nr);draft.duration=draft.episodes.reduce((sum,episode)=>sum+(episode.durationMin||0),0);renderSmartPlaylistPreview();}break;}
      case'smart-queue':{const draft=appState.smartPlaylistDraft;if(draft?.episodes.length){addManyToQueue(draft.episodes.map((episode)=>episode.nr));closeDialog('smartPlaylistDialog');renderPlaylists();renderHome();toast(`${draft.episodes.length} Vorschläge wurden als Nächstes vorgemerkt.`);}break;}
      case'smart-save':{const draft=appState.smartPlaylistDraft;if(draft?.episodes.length){const playlist=createPlaylist({name:draft.name,description:draft.description,episodeNrs:draft.episodes.map((episode)=>episode.nr),generated:true});appState.playlistTab='mine';appState.user.settings.playlistTab='mine';saveUser();closeDialog('smartPlaylistDialog');renderPlaylists();renderPlaylistDetail(playlist.id);toast(`Playlist mit ${draft.episodes.length} Folgen gespeichert.`);}break;}
      case'detail-prev':{const previous=detailNeighbors(appState.detailNr).prev;if(previous)renderEpisodeDetail(previous.nr);break;}case'detail-next':{const next=detailNeighbors(appState.detailNr).next;if(next)renderEpisodeDetail(next.nr);break;}
    }
  });
}
function setupZoomLock() {
  const preventGesture=(event)=>event.preventDefault();
  document.addEventListener('gesturestart',preventGesture,{passive:false});
  document.addEventListener('gesturechange',preventGesture,{passive:false});
  document.addEventListener('gestureend',preventGesture,{passive:false});
  document.addEventListener('wheel',(event)=>{
    if(event.ctrlKey||event.metaKey) event.preventDefault();
  },{passive:false});
  document.addEventListener('keydown',(event)=>{
    if(!(event.ctrlKey||event.metaKey)) return;
    if(['+','-','=','0'].includes(event.key)) event.preventDefault();
  });
}
function bindStaticEvents() {
  bindDelegatedEvents(); $('profileButton').addEventListener('click',openProfileEntry); $('findRecommendation').addEventListener('click',pickRecommendation); $('anotherRecommendation').addEventListener('click',pickRecommendation); $('recommendationFeedback').addEventListener('click',renderFeedback); $('quickRateHome').addEventListener('click',openQuickRate);
  for (const [id,key] of [
    ['recommendationStatus','recommendationStatus'],
    ['recommendationTime','time'],
    ['recommendationMood','mood'],
    ['recommendationAuthor','recommendationAuthor'],
    ['recommendationEra','recommendationEra'],
  ]) {
    $(id).addEventListener('change',(event)=>{
      appState[key]=event.target.value;
      appState.recommendationNr=null;
      appState.recommendationSessionHistory=[];
      setRecommendationNotice('');
      renderRecommendation();
    });
  }
  $('episodeSearch').addEventListener('input',(event)=>{appState.search=event.target.value;appState.episodeRenderLimit=40;renderEpisodes();}); $('clearSearch').addEventListener('click',()=>{appState.search='';$('episodeSearch').value='';renderEpisodes();});
  $('statusFilters').addEventListener('click',(event)=>{const button=event.target.closest('[data-filter]');if(!button)return;appState.filter=button.dataset.filter;appState.episodeRenderLimit=40;persistFilters();renderEpisodes();});
  for(const [id,key] of [['authorFilter','authorFilter'],['eraFilter','eraFilter'],['yearFilter','yearFilter'],['episodeSort','sort']])$(id).addEventListener('change',(event)=>{appState[key]=event.target.value;appState.episodeRenderLimit=40;persistFilters();renderEpisodes();});
  $('loadMoreEpisodes').addEventListener('click',()=>{appState.episodeRenderLimit+=40;renderEpisodes();});
  $('rankingMode').addEventListener('click',(event)=>{const button=event.target.closest('[data-ranking]');if(!button)return;appState.ranking=button.dataset.ranking;renderRanking();});
  $('playlistTabs').addEventListener('click',(event)=>{const button=event.target.closest('[data-playlist-tab]');if(!button)return;appState.playlistTab=button.dataset.playlistTab;appState.user.settings.playlistTab=appState.playlistTab;saveUser();renderPlaylists();});
  $('newPlaylistButton').addEventListener('click',()=>openPlaylistEditor());
  $('playlistEditorForm').addEventListener('submit',(event)=>{
    event.preventDefault();
    const id=$('playlistEditorId').value;
    const seedNr=Number($('playlistEditorSeedNr').value);
    const name=$('playlistName').value;
    const description=$('playlistDescription').value;
    const playlist=id
      ?updatePlaylist(id,{name,description})
      :createPlaylist({name,description,episodeNrs:Number.isFinite(seedNr)&&seedNr?[seedNr]:[]});
    if(!playlist) return;
    appState.playlistTab='mine';
    appState.user.settings.playlistTab='mine';
    appState.playlistSearch='';
    saveUser();
    closeDialog('playlistEditorDialog');
    if($('episodeDialog')?.open) closeDialog('episodeDialog');
    renderPlaylists();
    renderPlaylistDetail(playlist.id);
    toast(id?'Playlist aktualisiert.':'Playlist erstellt. Du kannst jetzt direkt Folgen hinzufügen.');
  });
  $('profileNameInput').addEventListener('input',updateProfileEditorPreview); $('tutorialContent').addEventListener('input',(event)=>{if(event.target.id!=='tutorialProfileName')return;const preview=$('tutorialInitialsPreview');if(!preview)return;const initials=profileInitials(event.target.value);preview.textContent=initials||'?';preview.classList.toggle('empty',!initials);});
  $('profileEditorForm').addEventListener('submit',(event)=>{event.preventDefault();const favorites=['profileFavorite1','profileFavorite2','profileFavorite3'].map((id)=>Number($(id).value)).filter(Number.isFinite).filter(Boolean);if(new Set(favorites).size!==favorites.length){toast('Bitte wähle jede Lieblingsfolge nur einmal.','warning');return;}appState.user.settings.profileName=cleanProfileName($('profileNameInput').value);appState.user.settings.profileFavoriteNrs=favorites;appState.user.settings.profileSetupSeen=true;saveUser();closeDialog('profileEditorDialog');renderProfile();toast('Dein Profil wurde gespeichert.');});
  $('profileEditorSkip').addEventListener('click',()=>{appState.user.settings.profileSetupSeen=true;saveUser();closeDialog('profileEditorDialog');renderProfile();});
  $('createSmartPlaylist').addEventListener('click',async()=>{await createSmartPlaylistPreview();});
  $('clearQueue').addEventListener('click',async()=>{if(!appState.user.settings.queue.length)return;if(await confirmAction({title:'Warteschlange leeren?',text:'Bewertungen und Playlists bleiben erhalten.',accept:'Leeren'})){appState.user.settings.queue=[];saveUser();renderPlaylists();renderHome();}});
  $('episodeDialogBody').addEventListener('input',(event)=>{if(event.target.id!=='episodeNote')return;$('noteSaveState').textContent='Speichert …';clearTimeout(noteTimer);noteTimer=setTimeout(()=>{setNote(appState.detailNr,event.target.value);$('noteSaveState').textContent='Gespeichert';},450);});
  $('playlistDialogBody').addEventListener('input',(event)=>{
    if(event.target.id!=='playlistEpisodeSearch') return;
    appState.playlistSearch=event.target.value;
    renderPlaylistSearchResults(appState.currentPlaylistId);
  });
  $('episodeDialogBody').addEventListener('change',(event)=>{const box=event.target.closest('[data-playlist-check]');if(!box)return;if(box.checked)addEpisodeToPlaylist(box.dataset.playlistCheck,Number(box.dataset.nr));else removeEpisodeFromPlaylist(box.dataset.playlistCheck,Number(box.dataset.nr));renderPlaylists();toast(box.checked?'Zur Playlist hinzugefügt.':'Aus Playlist entfernt.');});
  $('exportBackup').addEventListener('click',async()=>{await exportBackup();renderHome();renderSettings();toast('Backup wurde bereitgestellt.');}); $('backupNow').addEventListener('click',async()=>{await exportBackup();renderHome();toast('Backup wurde bereitgestellt.');}); $('dismissBackupReminder').addEventListener('click',()=>{appState.user.settings.backupReminderDismissedAt=nowIso();saveUser();renderHome();}); $('importBackup').addEventListener('click',()=>$('backupFile').click()); $('backupFile').addEventListener('change',async(event)=>{const file=event.target.files?.[0];event.target.value='';if(!file)return;try{renderImportPreview(parseBackupText(await file.text()));}catch(error){toast(error.message,'error');}});
  $('refreshMetadata').addEventListener('click',async()=>{const button=$('refreshMetadata');button.disabled=true;try{const result=await refreshMetadata({force:true});populateSelects();renderAll();toast(result.updated?'Folgenwissen wurde aktualisiert.':'Folgenwissen ist aktuell.');}catch(error){toast(`Aktualisierung fehlgeschlagen: ${error.message}`,'error');}finally{button.disabled=false;}});
  $('resetCatalog').addEventListener('click',async()=>{
    if(!await confirmAction({title:'Katalog-Cache zurücksetzen?',text:'Persönliche Daten bleiben erhalten. Folgenwissen und Cover werden anschließend sofort erneut geladen.',accept:'Katalog neu laden',danger:false})) return;
    const button=$('resetCatalog'); button.disabled=true;
    try {
      await clearCatalogCache();
      let metadataLoaded=false;
      try {
        const result=await refreshMetadata({force:true});
        metadataLoaded=Boolean(result.updated||result.count);
      } catch(error) {
        console.warn('Folgenwissen konnte nach dem Katalog-Reload nicht sofort geladen werden.',error);
      }
      populateSelects(); renderAll();
      toast(metadataLoaded?'Katalog, Folgenwissen und Cover wurden neu geladen.':'Katalog wurde neu geladen. Cover konnten gerade nicht online aktualisiert werden.',metadataLoaded?'info':'warning');
    } finally {
      button.disabled=false;
    }
  });
  $('restoreRecommendations').addEventListener('click',()=>{restoreHiddenRecommendations();toast('Ausgeblendete Empfehlungen wurden zurückgesetzt.');renderSettings();});
  const revealDeveloperSettings=()=>{
    $('developerSettings').classList.remove('hidden');
    $('developerSettings').scrollIntoView({behavior:'smooth',block:'center'});
    toast('Versteckte Archivprüfung freigeschaltet.');
  };
  const countSecretTap=()=>{
    settingsSecretTapCount+=1;
    clearTimeout(settingsSecretTimer);
    settingsSecretTimer=setTimeout(()=>{settingsSecretTapCount=0;},3200);
    if(settingsSecretTapCount>=7){settingsSecretTapCount=0;revealDeveloperSettings();}
  };
  $('aboutCard').addEventListener('click',countSecretTap);
  $('aboutCard').addEventListener('keydown',(event)=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();countSecretTap();}});
  $('openArchiveDebug').addEventListener('click',()=>{
    $('archiveDebugPassword').value='';
    $('archiveDebugError').classList.add('hidden');
    $('archiveDebugActions').classList.add('hidden');
    openDialog('archiveDebugDialog');
  });
  $('archiveDebugForm').addEventListener('submit',(event)=>{
    event.preventDefault();
    const valid=$('archiveDebugPassword').value.trim().toLocaleUpperCase('de-DE')===ARCHIVE_DEBUG_PASSWORD;
    $('archiveDebugError').classList.toggle('hidden',valid);
    $('archiveDebugActions').classList.toggle('hidden',!valid);
    if(valid) toast('Archivprüfung entsperrt.');
  });
  $('runArchiveDebug').addEventListener('click',()=>{
    beginArchiveDebugSession();
    document.body.classList.add('archive-debug-active');
    closeDialog('archiveDebugDialog');
    renderAll();
    showArchiveCelebration({debug:true});
  });
  $('previewArchiveProfile').addEventListener('click',()=>{
    beginArchiveDebugSession();
    document.body.classList.add('archive-debug-active');
    closeDialog('archiveDebugDialog');
    renderAll();
    renderProfile();
  });
  $('stopArchiveDebug').addEventListener('click',()=>{
    endArchiveDebugSession();
    document.body.classList.remove('archive-debug-active');
    $('developerSettings').classList.add('hidden');
    settingsSecretTapCount=0;
    clearTimeout(settingsSecretTimer);
    closeDialog('archiveDebugDialog');
    setStoredFilters();
    populateSelects();
    renderAll();
    toast('Debug-Vorschau beendet. Alle Teständerungen wurden verworfen.');
  });
  $('resetPersonalData').addEventListener('click',async()=>{if(await confirmAction({title:'Alle persönlichen Daten löschen?',text:'Hörstatus, Bewertungen, Notizen, Playlists, Verlauf und Einstellungen werden dauerhaft entfernt.',accept:'Alles löschen'})){appState.user=emptyPersonalData();resetRuntimeState();await saveUser(true);setStoredFilters();populateSelects();renderAll();navigate('home',{restore:false});toast('Persönliche Daten wurden gelöscht.');}});
  $('startTutorial').addEventListener('click',()=>renderTutorial(0)); $('openHelp').addEventListener('click',()=>openDialog('helpDialog')); $('copyDiagnostics').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(diagnosticsText());toast('Diagnose kopiert.');}catch{toast('Kopieren nicht möglich.','error');}}); $('validateCatalog').addEventListener('click',()=>{const result=catalogValidation();if(result.ok)toast(`Katalogprüfung erfolgreich: ${result.count} Folgen.`);else{console.table(result.issues.map((issue)=>({issue})));toast(`${result.issues.length} Kataloghinweise gefunden.`,'warning');}});
  $('streamingServiceSelect').addEventListener('change',(event)=>{appState.user.settings.preferredService=event.target.value;saveUser();renderSettings();renderHome();if(appState.detailNr&&$('episodeDialog').open)renderEpisodeDetail(appState.detailNr);}); document.addEventListener('click',(event)=>{const button=event.target.closest('[data-episode-view]');if(!button)return;appState.user.settings.episodeView=button.dataset.episodeView;saveUser();renderEpisodes();renderSettings();});
  document.addEventListener('error',(event)=>{const image=event.target;if(image?.matches?.('[data-cover-image]'))image.classList.add('hidden');},true);
  $('confirmCancel').addEventListener('click',()=>{closeDialog('confirmDialog');confirmResolver?.(false);confirmResolver=null;}); $('confirmAccept').addEventListener('click',()=>{closeDialog('confirmDialog');confirmResolver?.(true);confirmResolver=null;}); $('confirmDialog').addEventListener('cancel',(event)=>{event.preventDefault();closeDialog('confirmDialog');confirmResolver?.(false);confirmResolver=null;}); $('applyUpdate').addEventListener('click',()=>pendingWorker?.postMessage({type:'SKIP_WAITING'}));
}
function registerServiceWorker() {
  if(!('serviceWorker'in navigator))return; navigator.serviceWorker.addEventListener('controllerchange',()=>{if(reloadingForUpdate)return;reloadingForUpdate=true;location.reload();});
  navigator.serviceWorker.register('./sw.js').then((registration)=>{const show=(worker)=>{pendingWorker=worker;$('updateBanner').classList.remove('hidden');};if(registration.waiting)show(registration.waiting);registration.addEventListener('updatefound',()=>{const worker=registration.installing;worker?.addEventListener('statechange',()=>{if(worker.state==='installed'&&navigator.serviceWorker.controller)show(worker);});});registration.update();}).catch((error)=>console.warn('Service Worker konnte nicht registriert werden.',error));
}
function renderAll(){renderHome();renderEpisodes();renderRanking();renderPlaylists();renderSettings();}
export async function startApp() {
  $('loadingText').textContent='Lade Folgenkatalog …';await loadCatalog();$('loadingText').textContent='Lade persönliche Daten …';await loadUser();setStoredFilters();appState.playlistTab=appState.user.settings.playlistTab||'essentials';populateSelects();setupZoomLock();bindStaticEvents();setupSheetInteractions();renderAll();
  const hash=location.hash.slice(1);navigate(['episodes','ranking','playlists','settings'].includes(hash)?hash:'home',{restore:false});$('loadingScreen').classList.add('hidden');setTimeout(()=>$('loadingScreen')?.remove(),500);
  achievementChecksEnabled=true;scheduleArchiveAchievementCheck();
  const installedMode=window.FallkarteiInstallGuide?.isStandalone?.()??window.matchMedia?.('(display-mode: standalone)')?.matches??window.navigator.standalone===true;if(installedMode&&!appState.user.settings.tutorialCompleted)setTimeout(()=>renderTutorial(0),350);refreshMetadata().then((result)=>{if(result.updated){populateSelects();renderAll();}}).catch((error)=>console.warn('Metadaten konnten nicht aktualisiert werden.',error));registerServiceWorker();
}
