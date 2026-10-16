'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { HotelCard as Card } from '@/lib/roomBookings';

// Hotel card at the top of Rooms screens: cover photo, name, photo strip ("View all"), and "⇄ Change hotel"
export default function HotelCard({
  hotel,
  cards,
  subtitle,
  path,
  compact,
}: {
  hotel: Card;
  cards: Card[];
  subtitle?: string;
  path: string;
  compact?: boolean; // slim bar for Calendar, Bookings and New booking
}) {
  const router = useRouter();
  const [sheet, setSheet] = useState(false);
  const [viewer, setViewer] = useState<number | null>(null);
  const others = cards.length > 1;

  useEffect(() => {
    const open = sheet || viewer !== null;
    document.body.style.overflow = open ? 'hidden' : '';
    if (!open) return;
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSheet(false);
        setViewer(null);
      }
      if (viewer !== null && e.key === 'ArrowRight') setViewer((v) => Math.min(hotel.photos.length - 1, (v ?? 0) + 1));
      if (viewer !== null && e.key === 'ArrowLeft') setViewer((v) => Math.max(0, (v ?? 0) - 1));
    };
    window.addEventListener('keydown', key);
    return () => {
      window.removeEventListener('keydown', key);
      document.body.style.overflow = '';
    };
  }, [sheet, viewer, hotel.photos.length]);

  const switchBtn = others && (
    <button type="button" className="hc-switch" onClick={() => setSheet(true)}>
      ⇄ Change hotel
    </button>
  );
  return (
    <>
      {compact ? (
        <section className="hc-slim">
          <span className="hc-slim-img" style={hotel.cover ? { backgroundImage: `url("${hotel.cover}")` } : undefined} aria-hidden="true" />
          <span className="hc-slim-name">
            <b>{hotel.name}</b>
            {subtitle && <small>{subtitle}</small>}
          </span>
          {switchBtn}
        </section>
      ) : (
      <section className={`hc ${hotel.cover ? '' : 'no-photo'}`}>
        <div className="hc-img" style={hotel.cover ? { backgroundImage: `url("${hotel.cover}")` } : undefined}>
          {switchBtn}
          <div className="hc-title">
            <h1>{hotel.name}</h1>
            {(subtitle || hotel.address) && <p>{[subtitle, hotel.address].filter(Boolean).join(' · ')}</p>}
          </div>
        </div>
        {hotel.photos.length > 0 && (
          <div className="hc-strip">
            {hotel.photos.slice(0, 4).map((u, i) => (
              <button key={u} type="button" className="hc-pic" style={{ backgroundImage: `url("${u}")` }} onClick={() => setViewer(i)} aria-label={`Photo ${i + 1}`} />
            ))}
            <button type="button" className="hc-all" onClick={() => setViewer(0)}>
              {hotel.photos.length > 4 ? `+ ${hotel.photos.length - 4} more · ` : ''}View all
            </button>
          </div>
        )}
      </section>
      )}

      {sheet && (
        <div className="sheet-wrap" role="dialog" aria-modal="true" aria-label="Choose hotel" onClick={() => setSheet(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-grab" aria-hidden="true" />
            <h2>Choose hotel</h2>
            <p className="hint">Shows that hotel&apos;s rooms, bookings and calendar.</p>
            <ul className="hopts">
              {cards.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    className={`hopt ${c.id === hotel.id ? 'on' : ''}`}
                    onClick={() => {
                      setSheet(false);
                      router.push(`${path}?hotel=${c.id}`);
                    }}
                  >
                    <span className="hopt-img" style={c.cover ? { backgroundImage: `url("${c.cover}")` } : undefined} />
                    <span className="hopt-txt">
                      <b>
                        {c.name}
                        {c.active ? '' : ' (off)'}
                      </b>
                      <small>
                        {c.rooms} room{c.rooms === 1 ? '' : 's'}
                        {c.waiting ? ` · ${c.waiting} waiting for advance` : ''}
                      </small>
                    </span>
                    {c.id === hotel.id && (
                      <span className="hopt-chk" aria-label="Current hotel">
                        ✓
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {viewer !== null && hotel.photos[viewer] && (
        <div className="hb-viewer" role="dialog" aria-modal="true" aria-label={`Photos of ${hotel.name}`}>
          <button type="button" className="btn small hb-close" onClick={() => setViewer(null)}>
            Close
          </button>
          <div className="hb-viewer-photo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={hotel.photos[viewer]} alt="" />
          </div>
          <div className="hb-viewer-info">
            <div className="hb-viewer-text">
              <div className="hb-name">{hotel.name}</div>
              <div className="hb-meta">
                Photo {viewer + 1} of {hotel.photos.length}
              </div>
            </div>
            <div className="hb-viewer-nav">
              <button type="button" className="btn small" onClick={() => setViewer(viewer - 1)} disabled={viewer === 0}>
                Previous
              </button>
              <button type="button" className="btn small" onClick={() => setViewer(viewer + 1)} disabled={viewer >= hotel.photos.length - 1}>
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
