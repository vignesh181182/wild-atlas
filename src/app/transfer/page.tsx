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

import { useUser } from '@clerk/nextjs';
import { useCallback, useEffect, useState } from 'react';

/** Every notebook the app has ever written begins with this. */
const PREFIX = 'wild-atlas:library:v1';

type Row = { creature?: { name?: string }; groups?: string[] };
type Notebook = { key: string; groups: string[]; saved: Row[]; text: string };

type Sent =
  | { status: 'idle' }
  | { status: 'sending' }
  | { status: 'kept'; saved: number; groups: number }
  | { status: 'occupied' }
  | { status: 'failed'; why: string };

export default function TransferPage() {
  const { isSignedIn, isLoaded } = useUser();
  const [sent, setSent] = useState<Sent>({ status: 'idle' });
  const [pasted, setPasted] = useState('');
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

  const send = useCallback(async (text: string) => {
    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      setSent({
        status: 'failed',
        why: 'That is not a notebook. It wants what is inside the file, not its name — open it and copy everything, or use “Choose a file”.',
      });
      return;
    }
    setSent({ status: 'sending' });
    try {
      const res = await fetch('/api/library', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as { error?: string } | null;
        setSent({ status: 'failed', why: err?.error ?? `The server said ${res.status}.` });
        return;
      }
      const done = (await res.json()) as { adopted: boolean; groups: unknown[]; saved: unknown[] };
      // The server only fills an empty library, so a refusal is not a failure
      // — it means something is already kept there. Saying so is the
      // difference between trying again and believing this worked.
      if (!done.adopted) {
        setSent({ status: 'occupied' });
        return;
      }
      setSent({ status: 'kept', saved: done.saved.length, groups: done.groups.length });
    } catch {
      setSent({ status: 'failed', why: 'The request never got there. Check the connection.' });
    }
  }, []);

  const canSend = isLoaded && Boolean(isSignedIn) && sent.status !== 'sending';

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
        notebooks.map((n) => (
          <Card
            key={n.key}
            notebook={n}
            onNote={setNote}
            canSend={canSend}
            onSend={() => void send(n.text)}
          />
        ))
      )}

      <section style={{ marginTop: 32 }}>
        <h2 style={S.h2}>Bring a notebook back</h2>
        <p style={S.muted}>
          Paste a notebook saved from another device — it goes into your library, where every
          device signed in as you can see it.
        </p>
        <textarea
          style={S.text}
          value={pasted}
          onChange={(e) => setPasted(e.target.value)}
          placeholder={'{"groups":[…],"saved":[…]}'}
          rows={6}
          spellCheck={false}
        />
        <div style={S.row}>
          <button
            type="button"
            style={pasted.trim() && canSend ? S.primary : S.disabled}
            disabled={!pasted.trim() || !canSend}
            onClick={() => void send(pasted)}
          >
            Send to my library
          </button>
          {/* The button above this section hands out a file, so a file is what
              somebody coming back has. Asking them to open it, select 50,000
              characters and paste them is a worse way to reach the same place
              — and typing the file's name instead of its contents is the
              obvious mistake to make when asked for text. */}
          <label style={canSend ? S.quiet : S.disabled}>
            Choose a file…
            <input
              type="file"
              accept=".json,application/json"
              disabled={!canSend}
              style={{ display: 'none' }}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const text = await file.text();
                setPasted(text);
                void send(text);
                // Cleared, so choosing the same file twice fires again.
                e.target.value = '';
              }}
            />
          </label>
        </div>
        {isLoaded && !isSignedIn ? (
          <p style={S.muted}>Sign in first — a library belongs to an account.</p>
        ) : null}
      </section>

      <Outcome sent={sent} />
      {note ? <p style={S.note}>{note}</p> : null}
    </main>
  );
}

function Card({
  notebook,
  onNote,
  canSend,
  onSend,
}: {
  notebook: Notebook;
  onNote: (s: string) => void;
  canSend: boolean;
  onSend: () => void;
}) {
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
        <button
          type="button"
          style={canSend ? S.primary : S.disabled}
          disabled={!canSend}
          onClick={onSend}
        >
          Send to my library
        </button>
        <button type="button" style={S.quiet} onClick={download}>
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

function Outcome({ sent }: { sent: Sent }) {
  if (sent.status === 'idle') return null;
  if (sent.status === 'sending') return <p style={S.note}>Sending…</p>;
  if (sent.status === 'kept') {
    return (
      <p style={S.note}>
        Kept — {sent.saved} {sent.saved === 1 ? 'creature' : 'creatures'} in {sent.groups}{' '}
        {sent.groups === 1 ? 'group' : 'groups'}. They are on every device you sign in to now.
      </p>
    );
  }
  if (sent.status === 'occupied') {
    return (
      <p style={S.note}>
        Your library already has creatures in it, so this was left alone rather than merged on top.
        Nothing is lost — this browser still holds its copy.
      </p>
    );
  }
  return <p style={S.note}>{sent.why} Nothing is lost — this browser still holds its copy.</p>;
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
  h2: { fontSize: 19, margin: '0 0 8px' },
  disabled: {
    minHeight: 48, padding: '0 20px', borderRadius: 10, border: '1px solid #d8d5d0',
    background: '#efece8', color: '#9a948c', fontSize: 16, fontWeight: 600, cursor: 'not-allowed',
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
