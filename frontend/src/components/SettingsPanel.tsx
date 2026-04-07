"use client";

import { Settings, X } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { useAppStore } from "@/lib/store";

export function SettingsPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const { settings, updateSettings } = useAppStore();
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Focus trap and keyboard handling
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === "Escape") {
        e.preventDefault();
        setIsOpen(false);
        return;
      }

      // Focus trap
      if (e.key === "Tab" && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    },
    [isOpen]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Focus first element when dialog opens, restore focus when it closes
  useEffect(() => {
    if (isOpen) {
      // Prevent background scroll
      document.body.style.overflow = "hidden";
      // Focus the close button after render
      setTimeout(() => {
        const closeBtn = dialogRef.current?.querySelector<HTMLElement>("button");
        closeBtn?.focus();
      }, 50);
    } else {
      document.body.style.overflow = "";
      triggerRef.current?.focus();
    }
  }, [isOpen]);

  return (
    <>
      <button
        ref={triggerRef}
        onClick={() => setIsOpen(true)}
        className="btn-ghost flex items-center gap-2"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        <Settings className="w-4 h-4" aria-hidden="true" />
        <span className="text-sm">Settings</span>
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsOpen(false);
          }}
        >
          <div
            ref={dialogRef}
            className="glass-panel w-full max-w-md mx-4 p-6 animate-fade-in"
            role="dialog"
            aria-modal="true"
            aria-label="Interpreter settings"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 id="settings-title" className="text-lg font-semibold text-slate-800">
                Settings
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                aria-label="Close settings"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            <div className="space-y-5">
              {/* Language */}
              <div>
                <label
                  htmlFor="speech-language"
                  className="block text-sm font-medium text-slate-700 mb-1.5"
                >
                  Speech Language
                </label>
                <select
                  id="speech-language"
                  value={settings.language}
                  onChange={(e) =>
                    updateSettings({
                      language: e.target.value as "en" | "hi",
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="en">English</option>
                  <option value="hi">Hindi</option>
                </select>
              </div>

              {/* Sign Language */}
              <div>
                <label
                  htmlFor="sign-language"
                  className="block text-sm font-medium text-slate-700 mb-1.5"
                >
                  Sign Language
                </label>
                <select
                  id="sign-language"
                  value={settings.sign_language}
                  onChange={(e) =>
                    updateSettings({
                      sign_language: e.target.value as "ASL" | "ISL",
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="ASL">American Sign Language (ASL)</option>
                  <option value="ISL">Indian Sign Language (ISL)</option>
                </select>
              </div>

              {/* Playback Speed */}
              <div>
                <label
                  htmlFor="playback-speed"
                  className="block text-sm font-medium text-slate-700 mb-1.5"
                >
                  Playback Speed: {settings.playback_speed.toFixed(1)}x
                </label>
                <input
                  id="playback-speed"
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={settings.playback_speed}
                  onChange={(e) =>
                    updateSettings({
                      playback_speed: parseFloat(e.target.value),
                    })
                  }
                  className="w-full accent-primary-600"
                  aria-valuemin={0.5}
                  aria-valuemax={2.0}
                  aria-valuenow={settings.playback_speed}
                  aria-valuetext={`${settings.playback_speed.toFixed(1)}x speed`}
                />
                <div className="flex justify-between text-xs text-slate-400 mt-1" aria-hidden="true">
                  <span>0.5x</span>
                  <span>1.0x</span>
                  <span>2.0x</span>
                </div>
              </div>

              {/* Avatar Quality */}
              <fieldset>
                <legend className="block text-sm font-medium text-slate-700 mb-1.5">
                  Avatar Quality
                </legend>
                <div className="flex gap-2" role="radiogroup" aria-label="Avatar quality">
                  {(["low", "medium", "high"] as const).map((q) => (
                    <button
                      key={q}
                      onClick={() => updateSettings({ avatar_quality: q })}
                      className={`flex-1 py-2 text-sm rounded-xl border transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                        settings.avatar_quality === q
                          ? "border-primary-600 bg-primary-50 text-primary-700"
                          : "border-slate-200 text-slate-500 hover:bg-slate-50"
                      }`}
                      role="radio"
                      aria-checked={settings.avatar_quality === q}
                    >
                      {q.charAt(0).toUpperCase() + q.slice(1)}
                    </button>
                  ))}
                </div>
              </fieldset>

              {/* Subtitles */}
              <div className="flex items-center justify-between">
                <label
                  htmlFor="subtitles-toggle"
                  className="text-sm font-medium text-slate-700"
                >
                  Show Subtitles
                </label>
                <button
                  id="subtitles-toggle"
                  role="switch"
                  aria-checked={settings.show_subtitles}
                  aria-label={`Show subtitles: ${settings.show_subtitles ? "on" : "off"}`}
                  onClick={() =>
                    updateSettings({
                      show_subtitles: !settings.show_subtitles,
                    })
                  }
                  className={`relative w-11 h-6 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                    settings.show_subtitles ? "bg-primary-600" : "bg-slate-300"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      settings.show_subtitles ? "translate-x-5" : ""
                    }`}
                    aria-hidden="true"
                  />
                </button>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="btn-primary w-full mt-6 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </>
  );
}
