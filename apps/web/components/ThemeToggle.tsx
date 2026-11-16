"use client";

/**
 * Runs before the page is drawn: uses the theme the visitor picked, otherwise
 * the device's. The stylesheet reads it from <html data-theme>.
 */
export const THEME_SCRIPT = `try{var t=localStorage.getItem("theme");if(t!=="light"&&t!=="dark")t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";document.documentElement.dataset.theme=t}catch(e){}`;

/** Switches between the light and the dark theme and remembers the choice. Which icon shows is decided in CSS. */
export function ThemeToggle() {
  function toggle() {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("theme", next);
    } catch {
      // Private mode: the choice lasts until the page is closed.
    }
  }
  return (
    <button type="button" className="theme-toggle" onClick={toggle} aria-label="Promijeni temu: svijetla ili tamna" title="Svijetla / tamna tema">
      <svg className="moon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      </svg>
      <svg className="sun" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </button>
  );
}
