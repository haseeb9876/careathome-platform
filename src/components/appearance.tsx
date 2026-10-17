"use client";

import { useId, useRef, useState, useSyncExternalStore } from "react";
import { Monitor, Moon, Sun, SlidersHorizontal, X } from "lucide-react";
import {
  appearanceSnapshot,
  serverAppearanceSnapshot,
  subscribeAppearance,
  saveAppearance,
  validTheme,
} from "@/lib/appearance";

export function AppearancePreferences() {
  const snapshot = useSyncExternalStore(
    subscribeAppearance,
    appearanceSnapshot,
    serverAppearanceSnapshot,
  );
  const [themeValue, readingValue] = snapshot.split(":");
  const theme = validTheme(themeValue),
    large = readingValue === "true";
  const [message, setMessage] = useState("");
  function update(nextTheme = theme, nextLarge = large) {
    setMessage(
      saveAppearance(nextTheme, nextLarge)
        ? "Preferences saved on this device."
        : "Applied for this visit. Your browser has blocked saving preferences.",
    );
  }
  return (
    <div className="appearance-preferences">
      <p className="muted">
        Make your care space comfortable. Changes apply immediately on this
        browser, including the installed app.
      </p>
      <fieldset>
        <legend>Colour theme</legend>
        <div className="theme-options">
          {(
            [
              { value: "light", label: "Light", Icon: Sun },
              { value: "dark", label: "Dark", Icon: Moon },
              { value: "system", label: "System", Icon: Monitor },
            ] as const
          ).map(({ value, label, Icon }) => (
            <button
              type="button"
              key={value}
              aria-pressed={theme === value}
              onClick={() => update(value)}
            >
              <Icon size={22} aria-hidden="true" />
              <span>{label}</span>
            </button>
          ))}
        </div>
        <p className="hint">
          System follows your device’s light or dark setting.
        </p>
      </fieldset>
      <label className="reading-choice">
        <span>
          <strong>Larger text</strong>
          <small>More readable descriptions, navigation and form labels.</small>
        </span>
        <input
          type="checkbox"
          checked={large}
          onChange={(event) => update(theme, event.target.checked)}
        />
      </label>
      <p role="status" className="hint appearance-feedback">
        {message ||
          "Your preference is private to this browser, not your account."}
      </p>
    </div>
  );
}

export function AppearanceControl() {
  const dialog = useRef<HTMLDialogElement>(null);
  const id = useId();
  return (
    <>
      <button
        type="button"
        className="appearance-trigger"
        onClick={() => dialog.current?.showModal()}
        aria-label="Appearance settings"
        aria-haspopup="dialog"
      >
        <SlidersHorizontal size={18} aria-hidden="true" />
        <span>Appearance</span>
      </button>
      <dialog ref={dialog} className="appearance-dialog" aria-labelledby={id}>
        <div className="appearance-heading">
          <div>
            <p className="eyebrow">MADE FOR YOUR COMFORT</p>
            <h2 id={id}>Your view. Your choice.</h2>
          </div>
          <button
            type="button"
            className="icon-button"
            aria-label="Close appearance settings"
            onClick={() => dialog.current?.close()}
          >
            <X size={20} />
          </button>
        </div>
        <AppearancePreferences />
        <button
          type="button"
          className="primary-link"
          onClick={() => dialog.current?.close()}
        >
          Done
        </button>
      </dialog>
    </>
  );
}
