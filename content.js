(function () {
  let currentTitle = null;
  let currentIconUrl = null;

  function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  // Extract networkId regardless of which section of the app we're in.
  // location.search on fwd.app's hash-ish routing can look like:
  // "?/security/posture?networkId=249693&"
  // so we grab everything after the LAST "?" and parse that as params.
  function getNetworkId(query) {
    const lastQuestionMark = query.lastIndexOf("?");
    if (lastQuestionMark === -1) return null;
    const params = new URLSearchParams(query.slice(lastQuestionMark + 1));
    return params.get("networkId");
  }

  // Extract the section name right after "?/", e.g.
  // "?/verify/intent?networkId=185788&..."   -> "verify"
  // "?/security/blast-radius?networkId=..."  -> "security"
  function getSection(query) {
    if (!query.startsWith("?/")) return null;
    const rest = query.slice(2); // drop the leading "?/"
    const match = rest.match(/^([^/?]+)/); // up to next "/" or "?"
    return match ? match[1] : null;
  }

  // Build the current rule (title + icon) based on the live URL
  function getRule() {
    const host = location.hostname;
    const path = location.pathname;
    const query = location.search;

    const networkId = getNetworkId(query);
    const section = getSection(query);

    function saasTitle() {
      // Log pages, e.g. /api/networks/257598/collections/logs/tail?deviceName=X
      if (/logs/i.test(path + query)) {
        // Completed logs: /api/networks/N/logs/completed/<deviceName>
        const completed = path.match(/\/logs\/completed\/([^/?]+)/i);
        if (completed) return `Logs ${decodeURIComponent(completed[1])}`;
        const deviceName = new URLSearchParams(
          query.slice(query.lastIndexOf("?") + 1)
        ).get("deviceName");
        // Tailing logs: /collections/logs/tail?deviceName=X
        const label = /\/logs\/tail/i.test(path) ? "LogTail" : "Logs";
        return deviceName ? `${label} ${deviceName}` : label;
      }
      if (section && networkId) return `${capitalize(section)} ${networkId}`;
      if (networkId) return `Fwd (${networkId})`;
      if (section) return `Fwd (${section})`;
      return "FwdApp";
    }

    // These rules are applied in order - first match wins
    const rules = [
      {
        test: () => host === "fwd.app" && path.startsWith("/docs"),
        title: "FwdDocs",
        icon: "icons/icons8-book-blue-32.png"
      },
      {
        test: () => host === "fwd.app" && path.startsWith("/release-notes"),
        title: "FwdDocs",
        icon: "icons/icons8-book-blue-32.png"
      },
      {
        test: () => host === "fwd.app" && path.startsWith("/self-hosted"),
        title: "FwdDocs",
        icon: "icons/icons8-book-32.png"
      },
      {
        test: () => host === "docs.fwd.app",
        title: "PubDocs",
        icon: "icons/icons8-book-green-32.png"
      },
      {
        test: () => host === "fwd.app",
        title: saasTitle(),
        icon: "icons/icons8-red-dot-32.png"
      },
      {
        test: () => host === "beta1.fwd.app",
        title: "b1 " + saasTitle(),
        icon: "icons/icons8-sun-32.png"
      },
      {
        test: () => host === "scaling700.ext.forwardnetworks.com",
        title: "S700",
        icon: "icons/icons8-bomb-32.png"
      },
      {
        test: () => host === "skyforge-fwd.dc.forwardnetworks.com",
        title: "SF " + saasTitle(),
        icon: "icons/icons8-anvil-32.png"
      },
      {
        test: () => host === "beta2.fwd.app",
        title: "b2 " + saasTitle(),
        icon: "icons/icons8-green-circle-32.png"
      }
    ];

    return rules.find((r) => r.test()) || null;
  }

  function setTitle(title) {
    if (document.title !== title) document.title = title;
  }

  function setFavicon(iconUrl) {
    const existing = document.querySelectorAll("link[rel*='icon']");
    if (existing.length === 1 && existing[0].href === iconUrl) return;
    existing.forEach((el) => el.remove());
    const link = document.createElement("link");
    link.rel = "icon";
    link.href = iconUrl;
    document.head.appendChild(link);
  }

  // Re-evaluate the rule against the current URL and apply it
  function refresh() {
    const rule = getRule();
    if (!rule) {
      currentTitle = null;
      currentIconUrl = null;
      return;
    }
    currentTitle = rule.title;
    currentIconUrl = chrome.runtime.getURL(rule.icon);
    setTitle(currentTitle);
    setFavicon(currentIconUrl);
  }

  function applyWhenHeadReady() {
    if (document.head) {
      refresh();
      startObservers();
    } else {
      new MutationObserver((_, obs) => {
        if (document.head) {
          refresh();
          startObservers();
          obs.disconnect();
        }
      }).observe(document.documentElement, { childList: true, subtree: true });
    }
  }

  // Keep reasserting title/favicon if the page's own JS tries to overwrite them
  function startObservers() {
    const titleObserver = new MutationObserver(() => {
      if (currentTitle) setTitle(currentTitle);
    });
    document.addEventListener("DOMContentLoaded", () => {
      titleObserver.observe(document.querySelector("title") || document.head, {
        childList: true,
        subtree: true
      });
    });

    const faviconObserver = new MutationObserver(() => {
      if (currentIconUrl) setFavicon(currentIconUrl);
    });
    document.addEventListener("DOMContentLoaded", () => {
      faviconObserver.observe(document.head, {
        childList: true
      });
    });
  }

  // --- Keep the title/favicon live across in-app (SPA) navigation ---
  // fwd.app changes routes via pushState/replaceState without a full reload,
  // so we patch those methods and also listen for back/forward and hash
  // changes, then re-run refresh() whenever the URL actually changes.

  let lastUrl = location.href;

  function handlePossibleUrlChange() {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      refresh();
    }
  }

  const originalPushState = history.pushState;
  history.pushState = function (...args) {
    originalPushState.apply(this, args);
    handlePossibleUrlChange();
  };

  const originalReplaceState = history.replaceState;
  history.replaceState = function (...args) {
    originalReplaceState.apply(this, args);
    handlePossibleUrlChange();
  };

  window.addEventListener("popstate", handlePossibleUrlChange);
  window.addEventListener("hashchange", handlePossibleUrlChange);

  // Fallback safety net in case the app updates the URL in some other way
  // (e.g. via a router library that doesn't go through pushState/replaceState
  // in a way we catch above).
  setInterval(handlePossibleUrlChange, 1000);

  applyWhenHeadReady();
})();