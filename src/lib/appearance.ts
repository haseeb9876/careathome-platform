export type Theme = "light" | "dark" | "system";
export const APPEARANCE_KEY = "careathome-appearance";
export const READING_KEY = "careathome-large-text";
export function validTheme(value: string | null | undefined): Theme {
  return value === "light" || value === "system" ? value : "dark";
}

// Runs before paint; contains only application constants, never user input.
export const appearanceScript = `(function(){var t='dark',r=false;try{t=localStorage.getItem('${APPEARANCE_KEY}');r=localStorage.getItem('${READING_KEY}')==='true'}catch(e){}t=t==='system'||t==='light'?t:'dark';var d=document.documentElement;d.dataset.appearance=t;d.dataset.theme=t==='system'?(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):t;d.dataset.largeText=String(r)})()`;

export function applyAppearance(theme: Theme, large: boolean) {
  const root = document.documentElement;
  root.dataset.appearance = theme;
  root.dataset.theme =
    theme === "system"
      ? matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : theme;
  root.dataset.largeText = String(large);
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute(
      "content",
      root.dataset.theme === "dark" ? "#101c19" : "#195c50",
    );
}

export function appearanceSnapshot() {
  return `${validTheme(document.documentElement.dataset.appearance)}:${document.documentElement.dataset.largeText === "true"}`;
}
export const serverAppearanceSnapshot = () => "dark:false";

export function subscribeAppearance(notify: () => void) {
  const root = document.documentElement;
  const refresh = () =>
    applyAppearance(
      validTheme(root.dataset.appearance),
      root.dataset.largeText === "true",
    );
  const observer = new MutationObserver(notify);
  observer.observe(root, {
    attributes: true,
    attributeFilter: ["data-appearance", "data-large-text"],
  });
  const media = matchMedia("(prefers-color-scheme: dark)");
  const sync = (event: StorageEvent) => {
    if (
      event.key !== null &&
      event.key !== APPEARANCE_KEY &&
      event.key !== READING_KEY
    )
      return;
    try {
      applyAppearance(
        validTheme(localStorage.getItem(APPEARANCE_KEY)),
        localStorage.getItem(READING_KEY) === "true",
      );
    } catch {
      /* Current in-memory preference still works without storage. */
    }
  };
  media.addEventListener("change", refresh);
  window.addEventListener("storage", sync);
  refresh();
  return () => {
    observer.disconnect();
    media.removeEventListener("change", refresh);
    window.removeEventListener("storage", sync);
  };
}

export function saveAppearance(theme: Theme, large: boolean) {
  applyAppearance(theme, large);
  try {
    localStorage.setItem(APPEARANCE_KEY, theme);
    localStorage.setItem(READING_KEY, String(large));
    return true;
  } catch {
    return false;
  }
}
