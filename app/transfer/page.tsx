'use client';

/**
 * A way to get a notebook out of the browser holding it.
 *
 * The library lives in localStorage, which belongs to one origin and cannot be
 * read from anywhere else — not from another device, not from a laptop, and
 * not from developer tools on an iPad, which has none. So the only thing that
 * can reach a stranded notebook is a page served from the very address it was
 * saved at. That is what this is.
 *
 * It reads, and never writes. Nothing here deletes or alters a notebook: this
 * page is the copy, not the move, and it exists so the creatures are somewhere
 * other than one browser before anything else is attempted.
 *
 * Deliberately standalone — no shared components, no hooks, no Clerk, its own
 * styles inline. It is added to a working production site for one purpose, and
 * nothing it imports can break anything already there.
 */

import { useEffect, useState } from 'react';

/** Every notebook the app has ever written begins with this. */
const PREFIX = 'wild-atlas:library:v1';

type Row = { creature?: { name?: string }; groups?: string[] };
type Notebook = { key: string; groups: string[]; saved: Row[]; text: string };

export default function TransferPage() {
  const [notebooks, setNotebooks] = useState<Notebook[] | null>(null);
  const [allKeys, setAllKeys] = useState<string[]>([]);
  const [origin, setOrigin] = useState('');
  const [note, setNote] = useState('');

  // After mount: there is no localStorage on the server, and reading during
  // render would make the first client paint disagree with the server's.
  useEffect(() => {
    const found: Notebook[] = [];
    const keys: string[] = [];
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (!key) continue;
      keys.push(key);
      if (!key.startsWith(PREFIX)) continue;
      const text = window.localStorage.getItem(key) ?? '';
      try {
        const parsed = JSON.parse(text) as { groups?: unknown; saved?: unknown };
        if (!Array.isArray(parsed.groups) || !Array.isArray(parsed.saved)) continue;
        found.push({
          key,
          groups: parsed.groups as string[],
          saved: parsed.saved as Row[],
          text,
        });
      } catch {
        // Unreadable is the same as absent — but the key still shows in the
        // list below, so a corrupted notebook is visible rather than silent.
      }
    }
    setNotebooks(found.sort((a, b) => b.saved.length - a.saved.length));
    setAllKeys(keys);
    setOrigin(window.location.origin);
  }, []);

  return (
    <main style={S.page}>
      <h1 style={S.title}>Save your notebook</h1>
      <p style={S.lede}>
        This reads what this browser has kept and gives you a copy to take away. It does not change
        or delete anything.
      </p>

      {notebooks === null ? (
        <p style={S.muted}>Looking…</p>
      ) : notebooks.length === 0 ? (
        <div style={S.box}>
          <p style={{ margin: 0 }}>
            <strong>Nothing saved at this address.</strong>
          </p>
          <p style={S.muted}>
            You are at {origin}. A notebook is only visible at the exact address it was made at.
          </p>
          <p style={S.muted}>This address holds: {allKeys.join(', ') || 'nothing at all'}</p>
        </div>
      ) : (
        notebooks.map((n) => <Card key={n.key} notebook={n} onNote={setNote} />)
      )}

      {note ? <p style={S.note}>{note}</p> : null}
    </main>
  );
}

function Card({ notebook, onNote }: { notebook: Notebook; onNote: (s: string) => void }) {
  const [showText, setShowText] = useState(false);
  const name = `wild-atlas-${notebook.saved.length}-creatures.json`;

  // A file is the copy worth having: it survives the browser, and it can be
  // mailed or dropped to another machine as one thing. The clipboard is the
  // fallback for a browser that will not save one.
  function download() {
    try {
      const blob = new Blob([notebook.text], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      // Revoked late: iOS has been known to start the save after the click
      // returns, and a url pulled out from under it saves an empty file.
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
      onNote(`Saved as ${name} — check Files, or Chrome's Downloads.`);
    } catch {
      setShowText(true);
      onNote('This browser would not save a file. The text is below — select all, and copy.');
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(notebook.text);
      onNote('Copied. Paste it somewhere safe — a note or an email to yourself.');
    } catch {
      setShowText(true);
      onNote('The clipboard was refused. The text is below — select all, and copy by hand.');
    }
  }

  return (
    <div style={S.box}>
      <p style={S.count}>
        {notebook.saved.length} creatures in {notebook.groups.length} groups
      </p>
      <p style={S.muted}>{notebook.groups.join(' · ') || 'No groups'}</p>

      <div style={S.row}>
        <button type="button" style={S.primary} onClick={download}>
          Save as a file
        </button>
        <button type="button" style={S.quiet} onClick={() => void copy()}>
          Copy as text
        </button>
        <button type="button" style={S.quiet} onClick={() => setShowText((v) => !v)}>
          {showText ? 'Hide text' : 'Show text'}
        </button>
      </div>

      {showText ? <textarea style={S.text} value={notebook.text} readOnly rows={10} /> : null}

      <details style={{ marginTop: 16 }}>
        <summary style={S.muted}>What is in here</summary>
        <p style={S.muted}>
          {notebook.saved
            .map((r) => r.creature?.name)
            .filter(Boolean)
            .join(', ')}
        </p>
      </details>
    </div>
  );
}

/* Inline, so this page cannot be affected by — or affect — the site's own
   stylesheet. Sized for a tablet, which is the device it exists for. */
const S: Record<string, React.CSSProperties> = {
  page: { maxWidth: 720, margin: '0 auto', padding: '32px 20px 80px', fontFamily: 'system-ui, sans-serif' },
  title: { fontSize: 30, margin: '0 0 12px' },
  lede: { fontSize: 17, lineHeight: 1.5, color: '#444', margin: '0 0 28px' },
  box: { border: '1px solid #d8d5d0', borderRadius: 12, padding: 20, marginBottom: 16 },
  count: { fontSize: 22, fontWeight: 600, margin: '0 0 6px' },
  muted: { fontSize: 14, color: '#666', margin: '6px 0', lineHeight: 1.5, overflowWrap: 'anywhere' },
  row: { display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 18 },
  primary: {
    minHeight: 48, padding: '0 20px', borderRadius: 10, border: '1px solid #b45309',
    background: '#b45309', color: '#fff', fontSize: 16, fontWeight: 600, cursor: 'pointer',
  },
  quiet: {
    minHeight: 48, padding: '0 16px', borderRadius: 10, border: '1px solid #d8d5d0',
    background: 'transparent', color: '#333', fontSize: 15, cursor: 'pointer',
  },
  text: {
    display: 'block', width: '100%', marginTop: 16, padding: 12, borderRadius: 10,
    border: '1px solid #d8d5d0', fontFamily: 'ui-monospace, Menlo, monospace',
    // 16px keeps iOS from zooming the page when this is focused.
    fontSize: 16, lineHeight: 1.4,
  },
  note: {
    marginTop: 20, padding: 16, borderRadius: 10, border: '1px solid #b45309',
    background: '#fdf6ec', fontSize: 15, lineHeight: 1.5,
  },
};
