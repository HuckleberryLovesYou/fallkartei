
(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const guide = $("installGuide");
  const content = $("installGuideContent");
  const edgeHint = $("installEdgeHint");
  const reopen = $("installGuideReopen");

  const ua = navigator.userAgent || "";
  const isIOS = /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/i.test(ua);
  const isIOSSafari = isIOS &&
    /Safari/i.test(ua) &&
    !/CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo/i.test(ua);
  const isStandalone = () =>
    window.matchMedia?.("(display-mode: standalone)")?.matches ||
    window.navigator.standalone === true;

  let deferredPrompt = null;
  let iosToolbarPosition = "bottom";
  let currentPlatform = isIOS ? "ios" : isAndroid ? "android" : "desktop";

  window.FallkarteiInstallGuide = {
    isStandalone,
    platform: currentPlatform,
    reopen: () => showLanding()
  };

  const shareIcon = `
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 16V3m0 0L7.5 7.5M12 3l4.5 4.5"/>
      <path d="M5 12.5v6A2.5 2.5 0 0 0 7.5 21h9a2.5 2.5 0 0 0 2.5-2.5v-6"/>
    </svg>`;

  const menuIcon = `
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="5" r="1.2" fill="currentColor" stroke="none"/>
      <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none"/>
      <circle cx="12" cy="19" r="1.2" fill="currentColor" stroke="none"/>
    </svg>`;

  const homeIcon = `
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 11.5 12 5l8 6.5"/>
      <path d="M6.5 10v9h11v-9"/>
      <path d="M10 19v-5h4v5"/>
    </svg>`;

  const progress = (active, total = 4) =>
    `<div class="install-guide-progress" aria-label="Schritt ${active} von ${total}">
      ${Array.from({ length: total }, (_, index) =>
        `<span class="${index < active ? "active" : ""}"></span>`).join("")}
    </div>`;

  const deviceName = () => {
    if (isIOS) return isIOSSafari ? "iPhone oder iPad · Safari" : "iPhone oder iPad · anderer Browser";
    if (isAndroid) return "Android-Gerät";
    return "Desktop-Browser";
  };

  const openGuide = () => {
    guide.setAttribute("aria-hidden", "false");
    document.documentElement.classList.add("install-guide-open");
    document.body.classList.remove("install-guide-pending");
    reopen.classList.add("hidden");
  };

  const closeGuide = () => {
    guide.setAttribute("aria-hidden", "true");
    document.documentElement.classList.remove("install-guide-open");
    document.body.classList.remove("install-guide-pending");
    edgeHint.className = "install-edge-hint hidden";
    edgeHint.innerHTML = "";
    reopen.classList.remove("hidden");
  };

  const setEdgeHint = (position, label, icon = shareIcon) => {
    edgeHint.className = `install-edge-hint ${position}`;
    edgeHint.innerHTML = `<div class="install-arrow">${icon}<span>${label}</span></div>`;
  };

  const clearEdgeHint = () => {
    edgeHint.className = "install-edge-hint hidden";
    edgeHint.innerHTML = "";
  };

  const shell = (inner) => `
    <div class="install-guide-inner">
      ${inner}
    </div>`;

  function showLanding() {
    clearEdgeHint();
    content.innerHTML = shell(`
      <div class="install-guide-hero">
        <img class="install-guide-logo" src="icon-192.png" alt="Logo von Die Fallkartei">
        <div class="install-device-pill">${deviceName()} erkannt</div>
        <h1 id="installGuideTitle">Die Fallkartei als App installieren</h1>
        <p class="install-guide-copy">
          Du wirst passend zu deinem Gerät Schritt für Schritt durch die Installation geführt.
          Danach öffnet sich Die Fallkartei wie eine normale App vom Home-Bildschirm.
        </p>
      </div>
      ${isIOS && !isIOSSafari ? `
        <div class="install-browser-warning">
          Auf dem iPhone funktioniert die Installation am zuverlässigsten in <strong>Safari</strong>.
          Öffne diese Seite deshalb bitte zunächst in Safari.
        </div>` : ""}
      <div class="install-guide-actions">
        <button class="install-guide-button primary" data-install-action="start">
          ${deferredPrompt && !isIOS ? "App jetzt installieren" : "Installation starten"}
        </button>
        <button class="install-guide-button secondary" data-install-action="browser">
          Vorerst im Browser ansehen
        </button>
      </div>
    `);
    openGuide();
  }

  function showIOSStep(step) {
    clearEdgeHint();

    if (step === 1) {
      setEdgeHint("bottom-right", "Zuerst die drei Punkte", menuIcon);
      content.innerHTML = shell(`
        ${progress(1, 5)}
        <div class="install-guide-hero">
          <div class="install-guide-step-icon">${menuIcon}</div>
          <h2 id="installGuideTitle">1. Unten rechts auf die drei Punkte tippen</h2>
          <p class="install-guide-copy">
            In der neuen kompakten Safari-Ansicht ist „Teilen“ zunächst im
            <strong>Mehr-Menü</strong> versteckt. Tippe unten rechts auf die drei Punkte.
          </p>
        </div>
        <div class="install-guide-note">
          Siehst du das Teilen-Symbol bereits direkt in deiner Safari-Leiste?
          Dann kannst du diesen Schritt überspringen.
        </div>
        <div class="install-guide-actions">
          <button class="install-guide-button primary" data-install-action="ios-next" data-step="2">
            Weiter zu „Teilen“
          </button>
          <button class="install-guide-button secondary" data-install-action="ios-direct-share">
            Teilen-Symbol ist direkt sichtbar
          </button>
          <button class="install-guide-button ghost" data-install-action="landing">Zurück</button>
        </div>
      `);
      openGuide();
      return;
    }

    if (step === 2) {
      content.innerHTML = shell(`
        ${progress(2, 5)}
        <div class="install-guide-hero">
          <div class="install-guide-step-icon">${shareIcon}</div>
          <h2 id="installGuideTitle">2. Im Menü auf „Teilen“ tippen</h2>
          <p class="install-guide-copy">
            Im geöffneten Mehr-Menü wählst du jetzt <strong>Teilen</strong>.
          </p>
        </div>
        <div class="install-mock-phone" aria-label="Vereinfachte Darstellung des neuen Safari-Mehr-Menüs">
          <div class="install-mock-screen">
            <div class="install-mock-header"><span>Safari</span><span>Fertig</span></div>
            <div class="install-mock-list">
              <div class="install-mock-row"><span class="install-mock-symbol">▣</span><span>Tabs</span></div>
              <div class="install-mock-row highlight"><span class="install-mock-symbol install-mock-symbol-icon">${shareIcon}</span><span>Teilen</span></div>
              <div class="install-mock-row"><span class="install-mock-symbol">☆</span><span>Lesezeichen hinzufügen</span></div>
              <div class="install-mock-row"><span class="install-mock-symbol">Aa</span><span>Seiteneinstellungen</span></div>
            </div>
          </div>
        </div>
        <div class="install-guide-actions">
          <button class="install-guide-button primary" data-install-action="ios-next" data-step="3">Weiter</button>
          <button class="install-guide-button secondary" data-install-action="ios-next" data-step="1">Zurück</button>
        </div>
      `);
      openGuide();
      return;
    }

    if (step === 21) {
      const position = iosToolbarPosition === "top" ? "top-center" : "bottom-center";
      setEdgeHint(position, "Hier ist das Teilen-Symbol", shareIcon);
      content.innerHTML = shell(`
        ${progress(2, 5)}
        <div class="install-guide-hero">
          <div class="install-guide-step-icon">${shareIcon}</div>
          <h2 id="installGuideTitle">2. Direkt auf „Teilen“ tippen</h2>
          <p class="install-guide-copy">
            Bei deinem Safari-Layout ist das Teilen-Symbol bereits sichtbar.
            Tippe auf das Quadrat mit dem Pfeil nach oben.
          </p>
        </div>
        <div class="install-guide-choice">
          <button data-install-action="toggle-ios-toolbar">
            Meine Safari-Leiste ist ${iosToolbarPosition === "bottom" ? "oben" : "unten"}
          </button>
        </div>
        <div class="install-guide-actions">
          <button class="install-guide-button primary" data-install-action="ios-next" data-step="3">
            Weiter
          </button>
          <button class="install-guide-button secondary" data-install-action="ios-next" data-step="1">Zurück</button>
        </div>
      `);
      openGuide();
      return;
    }

    if (step === 3) {
      content.innerHTML = shell(`
        ${progress(3, 5)}
        <div class="install-guide-hero">
          <h2 id="installGuideTitle">3. „Zu Home-Bildschirm hinzufügen“ wählen</h2>
          <p class="install-guide-copy">
            Im Teilen-Menü nach unten scrollen und diese Zeile antippen:
          </p>
        </div>
        <div class="install-mock-phone" aria-label="Vereinfachte Darstellung des Safari-Teilen-Menüs">
          <div class="install-mock-screen">
            <div class="install-mock-header"><span>Teilen</span><span>Fertig</span></div>
            <div class="install-mock-list">
              <div class="install-mock-row"><span class="install-mock-symbol">⧉</span><span>Kopieren</span></div>
              <div class="install-mock-row"><span class="install-mock-symbol">＋</span><span>Zu Favoriten</span></div>
              <div class="install-mock-row highlight"><span class="install-mock-symbol">⌂</span><span>Zu Home-Bildschirm hinzufügen</span></div>
              <div class="install-mock-row"><span class="install-mock-symbol">▤</span><span>Zur Leseliste hinzufügen</span></div>
            </div>
          </div>
        </div>
        <div class="install-guide-note">
          Wird die Option nicht angezeigt, scrolle im Teilen-Menü ganz nach unten und
          öffne „Aktionen bearbeiten“.
        </div>
        <div class="install-guide-actions">
          <button class="install-guide-button primary" data-install-action="ios-next" data-step="4">Weiter</button>
          <button class="install-guide-button secondary" data-install-action="ios-next" data-step="2">Zurück</button>
        </div>
      `);
      openGuide();
      return;
    }

    if (step === 4) {
      content.innerHTML = shell(`
        ${progress(4, 5)}
        <div class="install-guide-hero">
          <h2 id="installGuideTitle">4. Mit „Hinzufügen“ bestätigen</h2>
          <p class="install-guide-copy">
            Im letzten Fenster oben rechts auf <strong>Hinzufügen</strong> tippen.
          </p>
        </div>
        <div class="install-mock-phone" aria-label="Vereinfachte Darstellung des Hinzufügen-Fensters">
          <div class="install-mock-screen">
            <div class="install-mock-header">
              <span>Abbrechen</span>
              <strong>Zum Home-Bildschirm</strong>
              <span class="install-add-button">Hinzufügen</span>
            </div>
            <div class="install-add-preview">
              <img src="icon-192.png" alt="">
              <div><strong>Die Fallkartei</strong><small>letsmagic.github.io</small></div>
            </div>
          </div>
        </div>
        <div class="install-guide-actions">
          <button class="install-guide-button primary" data-install-action="ios-next" data-step="5">Weiter</button>
          <button class="install-guide-button secondary" data-install-action="ios-next" data-step="3">Zurück</button>
        </div>
      `);
      openGuide();
      return;
    }

    content.innerHTML = shell(`
      ${progress(5, 5)}
      <div class="install-guide-hero">
        <div class="install-success-check">✓</div>
        <h2 id="installGuideTitle">5. App öffnen</h2>
        <p class="install-guide-copy">
          Schließe Safari und öffne das neue Symbol <strong>Die Fallkartei</strong>
          auf deinem Home-Bildschirm. Erst dort startet das normale App-Tutorial.
        </p>
      </div>
      <div class="install-guide-actions">
        <button class="install-guide-button secondary" data-install-action="ios-next" data-step="1">Anleitung erneut ansehen</button>
        <button class="install-guide-button ghost" data-install-action="browser">Im Browser weiter ansehen</button>
      </div>
    `);
    openGuide();
  }

  function showAndroidManual(step = 1) {
    clearEdgeHint();

    if (step === 1) {
      setEdgeHint("top-right", "Drei Punkte öffnen", menuIcon);
      content.innerHTML = shell(`
        ${progress(1, 3)}
        <div class="install-guide-hero">
          <div class="install-guide-step-icon">${menuIcon}</div>
          <h2 id="installGuideTitle">1. Browsermenü öffnen</h2>
          <p class="install-guide-copy">
            Tippe oben rechts in Chrome auf die drei Punkte.
          </p>
        </div>
        <div class="install-guide-actions">
          <button class="install-guide-button primary" data-install-action="android-next" data-step="2">Weiter</button>
          <button class="install-guide-button ghost" data-install-action="landing">Zurück</button>
        </div>
      `);
      openGuide();
      return;
    }

    if (step === 2) {
      content.innerHTML = shell(`
        ${progress(2, 3)}
        <div class="install-guide-hero">
          <h2 id="installGuideTitle">2. „App installieren“ wählen</h2>
          <p class="install-guide-copy">
            Im Menü auf <strong>App installieren</strong> oder
            <strong>Zum Startbildschirm hinzufügen</strong> tippen.
          </p>
        </div>
        <div class="install-mock-phone">
          <div class="install-mock-screen">
            <div class="install-mock-list">
              <div class="install-mock-row"><span class="install-mock-symbol">↻</span><span>Neu laden</span></div>
              <div class="install-mock-row"><span class="install-mock-symbol">☆</span><span>Lesezeichen</span></div>
              <div class="install-mock-row highlight"><span class="install-mock-symbol">＋</span><span>App installieren</span></div>
              <div class="install-mock-row"><span class="install-mock-symbol">↗</span><span>Teilen</span></div>
            </div>
          </div>
        </div>
        <div class="install-guide-actions">
          <button class="install-guide-button primary" data-install-action="android-next" data-step="3">Weiter</button>
          <button class="install-guide-button secondary" data-install-action="android-next" data-step="1">Zurück</button>
        </div>
      `);
      openGuide();
      return;
    }

    showInstalledSuccess();
  }

  async function triggerNativeInstall() {
    if (!deferredPrompt) {
      showAndroidManual(1);
      return;
    }

    const prompt = deferredPrompt;
    deferredPrompt = null;

    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      if (choice?.outcome === "accepted") {
        showInstalledSuccess();
      } else {
        showAndroidManual(1);
      }
    } catch (error) {
      console.warn("Installationsdialog konnte nicht geöffnet werden.", error);
      showAndroidManual(1);
    }
  }

  function showDesktopGuide() {
    clearEdgeHint();
    content.innerHTML = shell(`
      ${progress(1, 2)}
      <div class="install-guide-hero">
        <div class="install-guide-step-icon">${homeIcon}</div>
        <h2 id="installGuideTitle">Im Browser installieren</h2>
        <p class="install-guide-copy">
          Suche in der Adressleiste nach dem Installationssymbol oder öffne das Browsermenü
          und wähle „Die Fallkartei installieren“.
        </p>
      </div>
      <div class="install-guide-actions">
        ${deferredPrompt ? `
          <button class="install-guide-button primary" data-install-action="native-install">Installationsfenster öffnen</button>` : ""}
        <button class="install-guide-button secondary" data-install-action="browser">Im Browser ansehen</button>
        <button class="install-guide-button ghost" data-install-action="landing">Zurück</button>
      </div>
    `);
    openGuide();
  }

  function showInstalledSuccess() {
    clearEdgeHint();
    content.innerHTML = shell(`
      <div class="install-guide-hero">
        <div class="install-success-check">✓</div>
        <h2 id="installGuideTitle">Installation abgeschlossen</h2>
        <p class="install-guide-copy">
          Öffne anschließend <strong>Die Fallkartei</strong> über das neue App-Symbol.
          Im installierten Modus wird diese Installationshilfe übersprungen und das normale Tutorial startet.
        </p>
      </div>
      <div class="install-guide-actions">
        <button class="install-guide-button secondary" data-install-action="browser">Browseransicht schließen</button>
      </div>
    `);
    openGuide();
  }

  function startForPlatform() {
    if (isIOS) {
      if (!isIOSSafari) {
        content.innerHTML = shell(`
          <div class="install-guide-hero">
            <div class="install-guide-step-icon">${shareIcon}</div>
            <h2 id="installGuideTitle">Bitte in Safari öffnen</h2>
            <p class="install-guide-copy">
              Kopiere oder teile diese Adresse und öffne sie in Safari.
              Dort kann Die Fallkartei zum Home-Bildschirm hinzugefügt werden.
            </p>
          </div>
          <div class="install-guide-actions">
            <button class="install-guide-button primary" data-install-action="copy-url">Adresse kopieren</button>
            <button class="install-guide-button secondary" data-install-action="browser">Trotzdem im Browser ansehen</button>
            <button class="install-guide-button ghost" data-install-action="landing">Zurück</button>
          </div>
        `);
        openGuide();
        return;
      }
      showIOSStep(1);
      return;
    }

    if (deferredPrompt) {
      triggerNativeInstall();
      return;
    }

    if (isAndroid) {
      showAndroidManual(1);
      return;
    }

    showDesktopGuide();
  }

  content.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-install-action]");
    if (!button) return;

    const action = button.dataset.installAction;

    if (action === "start") startForPlatform();
    if (action === "browser") closeGuide();
    if (action === "landing") showLanding();
    if (action === "native-install") triggerNativeInstall();

    if (action === "ios-next") {
      showIOSStep(Number(button.dataset.step));
    }

    if (action === "ios-direct-share") {
      showIOSStep(21);
    }

    if (action === "android-next") {
      showAndroidManual(Number(button.dataset.step));
    }

    if (action === "toggle-ios-toolbar") {
      iosToolbarPosition = iosToolbarPosition === "bottom" ? "top" : "bottom";
      showIOSStep(21);
    }

    if (action === "copy-url") {
      try {
        await navigator.clipboard.writeText(location.href);
        button.textContent = "Adresse kopiert ✓";
      } catch {
        button.textContent = "Adresse oben aus der Leiste kopieren";
      }
    }
  });

  reopen.addEventListener("click", showLanding);

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event;
    if (guide.getAttribute("aria-hidden") === "false") showLanding();
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    showInstalledSuccess();
  });

  window.matchMedia?.("(display-mode: standalone)")?.addEventListener?.("change", (event) => {
    if (event.matches) {
      guide.setAttribute("aria-hidden", "true");
      reopen.classList.add("hidden");
      document.documentElement.classList.remove("install-guide-open");
      document.body.classList.remove("install-guide-pending");
    }
  });

  if (isStandalone()) {
    guide.setAttribute("aria-hidden", "true");
    reopen.classList.add("hidden");
    document.body.classList.remove("install-guide-pending");
  } else {
    showLanding();
  }
})();
