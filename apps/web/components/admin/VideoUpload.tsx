"use client";

import { useState } from "react";
import { MAX_VIDEO_BYTES } from "@kombi/shared";
import { ApiError, adminUploadVideo, uploadVideo } from "@/lib/api";

/**
 * Picks (or, on a phone, records) one video and sends it with a progress bar.
 * The parent gets the API's answer.
 */
export function VideoUpload<T>({
  path,
  label,
  current,
  onDone,
  onRemove,
  capture = false,
  publicPath = false,
}: {
  path: string;
  label: string;
  /** The video already there, to watch or replace. */
  current?: { url: string; contentType: string } | null;
  onDone: (result: T) => void;
  onRemove?: () => Promise<void>;
  /** Opens the camera straight away on phones. */
  capture?: boolean;
  /** `path` is a public API path (no login), e.g. under the customer's contract link. */
  publicPath?: boolean;
}) {
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function send(file: File | undefined) {
    if (!file) return;
    setError(null);
    if (file.size > MAX_VIDEO_BYTES) {
      setError(`Video je prevelik (najviše ${MAX_VIDEO_BYTES / 1024 / 1024} MB). Snimite kraći ili u manjoj rezoluciji.`);
      return;
    }
    setProgress(0);
    try {
      onDone(await (publicPath ? uploadVideo<T>(path, file, setProgress) : adminUploadVideo<T>(path, file, setProgress)));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Video nije poslan.");
    } finally {
      setProgress(null);
    }
  }

  return (
    <div className="video-upload">
      {current && (
        <video src={current.url} controls playsInline preload="metadata" className="video-preview">
          <track kind="captions" />
        </video>
      )}
      {progress !== null ? (
        <div className="upload-progress" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
          <span style={{ width: `${Math.round(progress * 100)}%` }} />
          <em>Šaljem… {Math.round(progress * 100)}%</em>
        </div>
      ) : (
        <div className="video-actions">
          <label className="small-btn video-pick">
            {current ? "Zamijeni video" : label}
            <input
              type="file"
              accept="video/mp4,video/quicktime,video/webm,video/*"
              {...(capture ? { capture: "environment" as const } : {})}
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                void send(f);
              }}
            />
          </label>
          {current && onRemove && (
            <button type="button" className="link" onClick={() => confirm("Obrisati ovaj video?") && void onRemove().catch((e) => setError(e instanceof Error ? e.message : "Nije obrisano."))}>
              Obriši
            </button>
          )}
        </div>
      )}
      {error && <p className="alert" role="alert">{error}</p>}
    </div>
  );
}
