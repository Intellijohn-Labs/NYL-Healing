'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { roomPhotoAction, uploadRoomPhotos } from './photoActions';

type Photo = { id: string; url: string };

// Shrink a photo in the browser before uploading: at most 1600 px on the long side, JPEG ~80%
async function shrink(file: File): Promise<Blob> {
  if (!file.type.startsWith('image/')) return file;
  const img = await createImageBitmap(file).catch(() => null);
  if (!img) return file;
  const scale = Math.min(1, 1600 / Math.max(img.width, img.height));
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.8));
  return blob && blob.size < file.size ? blob : file;
}

export default function PhotoManager({
  hotelId,
  roomTypeId,
  photos,
  title,
  hint,
}: {
  hotelId: string;
  roomTypeId?: string;
  photos: Photo[];
  title: string;
  hint?: string;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const left = 10 - photos.length;

  async function onPick(list: FileList | null) {
    const files = Array.from(list ?? []).slice(0, Math.max(0, left));
    if (!files.length) return;
    setMsg(null);
    let ok = 0;
    const problems: string[] = [];
    for (let i = 0; i < files.length; i++) {
      setBusy(`Uploading ${i + 1} of ${files.length}…`);
      try {
        const blob = await shrink(files[i]);
        const fd = new FormData();
        fd.set('hotel_id', hotelId);
        fd.set('room_type_id', roomTypeId ?? '');
        fd.append('photos', new File([blob], files[i].name.replace(/\.\w+$/, '') + (blob.type === 'image/jpeg' ? '.jpg' : ''), { type: blob.type || files[i].type }));
        const r = await uploadRoomPhotos(null, fd);
        if (r?.ok) ok++;
        else problems.push(r?.message ?? `${files[i].name}: failed`);
      } catch {
        problems.push(`${files[i].name}: upload failed (check the internet connection)`);
      }
    }
    setBusy('');
    if (input.current) input.current.value = '';
    setMsg({ ok: ok > 0, text: `${ok ? `${ok} photo${ok === 1 ? '' : 's'} added.` : ''}${problems.length ? ' ' + problems.join(' ') : ''}`.trim() });
    router.refresh();
  }

  return (
    <div className="pm">
      <div className="pm-hd">
        <h4 className="rsub">{title}</h4>
        <span className="hint">{photos.length}/10</span>
      </div>
      {hint && <p className="hint">{hint}</p>}
      {photos.length > 0 && (
        <ul className="pm-grid">
          {photos.map((p, i) => (
            <li key={p.id} className={i === 0 ? 'cover' : ''}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt="" loading="lazy" />
              {i === 0 && <span className="pm-cover">Cover</span>}
              <div className="pm-acts">
                {i > 0 && (
                  <form action={roomPhotoAction}>
                    <input type="hidden" name="photo_id" value={p.id} />
                    <input type="hidden" name="action" value="cover" />
                    <button type="submit" className="btn small" title="Make this the cover photo">
                      ★ Cover
                    </button>
                  </form>
                )}
                <form
                  action={roomPhotoAction}
                  onSubmit={(e) => {
                    if (!confirm('Remove this photo?')) e.preventDefault();
                  }}
                >
                  <input type="hidden" name="photo_id" value={p.id} />
                  <input type="hidden" name="action" value="remove" />
                  <button type="submit" className="btn small danger" aria-label="Remove photo">
                    Remove
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
      {left > 0 ? (
        <label className={`btn small pm-add ${busy ? 'is-busy' : ''}`}>
          {busy || '+ Add photos'}
          <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden disabled={!!busy} onChange={(e) => onPick(e.target.files)} />
        </label>
      ) : (
        <p className="hint">10 photos is the most. Remove one to add another.</p>
      )}
      {msg && <p className={msg.ok ? 'seat-ok' : 'field-error'}>{msg.text}</p>}
    </div>
  );
}
