"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Download, X } from "lucide-react";

type InstallEvent = Event & {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};
const DISMISS_KEY = "careathome-install-dismissed";
export function AppInstall() {
  const [visible, setVisible] = useState(false);
  const [installed, setInstalled] = useState(true);
  const [ios, setIos] = useState(false);
  const [available, setAvailable] = useState(false);
  const [busy, setBusy] = useState(false);
  const [newVersion, setNewVersion] = useState(false);
  const [message, setMessage] = useState("");
  const prompt = useRef<InstallEvent | null>(null);

  useEffect(() => {
    const standalone = matchMedia("(display-mode: standalone)");
    const isInstalled = () =>
      standalone.matches ||
      !!(navigator as Navigator & { standalone?: boolean }).standalone;
    const timer = setTimeout(() => {
      setInstalled(isInstalled());
      setIos(
        /iPad|iPhone|iPod/.test(navigator.userAgent) ||
          (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1),
      );
      let dismissed = 0;
      try {
        dismissed = Number(localStorage.getItem(DISMISS_KEY));
      } catch {
        /* Storage may be unavailable in private browsing. */
      }
      setVisible(
        !isInstalled() && (!dismissed || Date.now() - dismissed > 7 * 86400000),
      );
    }, 0);
    const onPrompt = (event: Event) => {
      event.preventDefault();
      prompt.current = event as InstallEvent;
      setAvailable(true);
    };
    const onInstalled = () => {
      setInstalled(true);
      setVisible(false);
      prompt.current = null;
      setAvailable(false);
    };
    const onDisplay = () => {
      setInstalled(isInstalled());
      if (isInstalled()) setVisible(false);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    standalone.addEventListener("change", onDisplay);

    let registration: ServiceWorkerRegistration | undefined;
    let disposed = false;
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .then((value) => {
          registration = value;
          return value.update();
        })
        .catch(() => {
          /* The online site remains usable if worker setup fails. */
        });
    }
    async function checkVersion() {
      if (document.visibilityState !== "visible" || !navigator.onLine) return;
      try {
        const response = await fetch("/api/app-version", {
          cache: "no-store",
          signal: AbortSignal.timeout(10000),
        });
        if (!response.ok) return;
        const data = await response.json();
        if (
          !disposed &&
          typeof data.version === "string" &&
          data.version !== process.env.NEXT_PUBLIC_APP_VERSION
        )
          setNewVersion(true);
      } catch {
        /* Retry on next focus or interval. */
      }
      registration?.update().catch(() => {});
    }
    const interval = setInterval(checkVersion, 5 * 60000);
    document.addEventListener("visibilitychange", checkVersion);
    window.addEventListener("online", checkVersion);
    void checkVersion();
    return () => {
      disposed = true;
      clearTimeout(timer);
      clearInterval(interval);
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      standalone.removeEventListener("change", onDisplay);
      document.removeEventListener("visibilitychange", checkVersion);
      window.removeEventListener("online", checkVersion);
    };
  }, []);

  function dismiss() {
    setVisible(false);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* Optional preference only. */
    }
  }
  async function install() {
    const event = prompt.current;
    if (!event) return;
    setBusy(true);
    try {
      await event.prompt();
      const choice = await event.userChoice;
      if (choice.outcome === "accepted") {
        setVisible(false);
        setInstalled(true);
      } else setMessage("You can install later using your browser menu.");
    } catch {
      setMessage("Use your browser menu to install, or try again later.");
    } finally {
      prompt.current = null;
      setAvailable(false);
      setBusy(false);
    }
  }
  return (
    <>
      {!installed && !visible && (
        <aside className="app-install-access" aria-label="App installation">
          <button
            type="button"
            className="text-button"
            onClick={() => setVisible(true)}
          >
            <Download size={16} /> Install CareAtHome
          </button>
        </aside>
      )}
      {visible && !installed && (
        <aside className="app-install-card" aria-labelledby="app-install-title">
          <button
            type="button"
            className="icon-button app-install-close"
            aria-label="Dismiss installation reminder"
            onClick={dismiss}
          >
            <X size={18} />
          </button>
          <Image
            src="/icons/app-192.png"
            width={52}
            height={52}
            alt=""
            unoptimized
          />
          <h2 id="app-install-title">Your care, one tap away</h2>
          <p>
            Add <strong>CareAtHome</strong> to your home screen for easy access
            to visits and your care team.
          </p>
          {available ? (
            <button
              type="button"
              className="primary-link"
              disabled={busy}
              onClick={install}
            >
              <Download size={18} />
              {busy ? "Opening installer…" : "Install app"}
            </button>
          ) : ios ? (
            <ol>
              <li>
                Open this website in <strong>Safari</strong>.
              </li>
              <li>
                Tap <strong>Share</strong>, then{" "}
                <strong>Add to Home Screen</strong>.
              </li>
              <li>
                Keep <strong>Open as Web App</strong> on if shown, then tap{" "}
                <strong>Add</strong>.
              </li>
            </ol>
          ) : (
            <p>
              Open your browser menu and choose <strong>Install app</strong> or{" "}
              <strong>Add to Home screen</strong>. If unavailable, try Chrome on
              Android or Safari on iPhone.
            </p>
          )}
          <small>
            Internet is needed for care features. Updates arrive through this
            same app—no reinstall needed.
          </small>
          {message && <p role="status">{message}</p>}
          <button type="button" className="text-button" onClick={dismiss}>
            Not now
          </button>
        </aside>
      )}
      {newVersion && (
        <aside className="app-update" aria-label="Application update">
          <p role="status">
            <strong>A CareAtHome update is ready.</strong> Save your work before
            refreshing. Unsaved entries will be lost.
          </p>
          <button
            type="button"
            className="primary-link"
            onClick={() => location.reload()}
          >
            Refresh to update
          </button>
        </aside>
      )}
    </>
  );
}
