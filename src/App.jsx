import React, { useEffect, useMemo, useRef, useState } from 'react';

const STORAGE_KEY = 'catatan-sederhana';

function readNotes() {
  try {
    const savedNotes = window.localStorage.getItem(STORAGE_KEY);
    const parsedNotes = savedNotes ? JSON.parse(savedNotes) : [];
    if (!Array.isArray(parsedNotes)) {
      throw new TypeError('Data catatan harus berupa daftar.');
    }
    return parsedNotes;
  } catch (error) {
    console.error('Catatan tidak dapat dimuat dari penyimpanan browser.', error);
    return [];
  }
}

function formatDate(value) {
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function Icon({ name, size = 20 }) {
  const paths = {
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </>
    ),
    plus: <path d="M12 5v14m-7-7h14" />,
    pin: (
      <>
        <path d="m16 3 5 5-4 1-4 4-1 5-3-3-5 5" />
        <path d="m7 7 10 10" />
      </>
    ),
    close: <path d="m18 6-12 12M6 6l12 12" />,
    trash: (
      <>
        <path d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6" />
        <path d="M10 11v5m4-5v5" />
      </>
    ),
    note: (
      <>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6M8 13h8m-8 4h8" />
      </>
    ),
    arrow: <path d="M7 17 17 7M7 7h10v10" />,
  };

  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  );
}

function App() {
  const [notes, setNotes] = useState(readNotes);
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [editingNote, setEditingNote] = useState(null);
  const [storageError, setStorageError] = useState('');
  const searchInputRef = useRef(null);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
      setStorageError('');
    } catch (error) {
      console.error('Catatan tidak dapat disimpan ke penyimpanan browser.', error);
      setStorageError('Perubahan belum tersimpan. Periksa pengaturan penyimpanan browser.');
    }
  }, [notes]);

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setEditingNote(null);
      } else if (
        event.key === '/' &&
        !event.ctrlKey &&
        !event.metaKey &&
        !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)
      ) {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const filteredNotes = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('id');
    return notes
      .filter((note) => activeFilter !== 'pinned' || note.pinned)
      .filter(
        (note) =>
          !normalizedQuery ||
          `${note.title} ${note.content}`.toLocaleLowerCase('id').includes(normalizedQuery),
      )
      .sort(
        (a, b) =>
          Number(b.pinned) - Number(a.pinned) ||
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
  }, [notes, query, activeFilter]);

  function saveNote(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const title = String(formData.get('title') || '').trim();
    const content = String(formData.get('content') || '').trim();
    if (!title && !content) return;

    const now = new Date().toISOString();
    if (editingNote?.id) {
      setNotes((currentNotes) =>
        currentNotes.map((note) =>
          note.id === editingNote.id ? { ...note, title, content, updatedAt: now } : note,
        ),
      );
    } else {
      setNotes((currentNotes) => [
        {
          id: crypto.randomUUID(),
          title: title || 'Catatan tanpa judul',
          content,
          pinned: false,
          createdAt: now,
          updatedAt: now,
        },
        ...currentNotes,
      ]);
    }
    setEditingNote(null);
  }

  function togglePinned(id) {
    setNotes((currentNotes) =>
      currentNotes.map((note) =>
        note.id === id
          ? { ...note, pinned: !note.pinned, updatedAt: new Date().toISOString() }
          : note,
      ),
    );
  }

  function deleteNote(id) {
    setNotes((currentNotes) => currentNotes.filter((note) => note.id !== id));
    setEditingNote(null);
  }

  const isEditing = Boolean(editingNote && editingNote.id);

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Catatan, beranda">
          <span className="brand-mark"><Icon name="note" size={19} /></span>
          <span>catatan<span className="brand-dot">.</span></span>
        </a>
        <span className="local-label"><span className="status-dot" /> Tersimpan di perangkat ini</span>
      </header>

      <section className="workspace">
        <div className="intro">
          <div className="eyebrow">RUANG KECIL UNTUK IDE BESAR</div>
          <h1>Semua yang ingin<br className="desktop-break" /> kamu ingat.</h1>
          <p>Catat ide, simpan hal penting, dan temukan lagi kapan saja.</p>
        </div>

        <div className="toolbar">
          <label className="search-box">
            <Icon name="search" size={19} />
            <input
              ref={searchInputRef}
              type="search"
              placeholder="Cari catatan..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label="Cari catatan"
            />
            <kbd>/</kbd>
          </label>
          <button className="create-button" onClick={() => setEditingNote({})}>
            <Icon name="plus" size={19} />
            <span>Catatan baru</span>
          </button>
        </div>

        <div className="list-heading">
          <div className="filters" role="tablist" aria-label="Filter catatan">
            <button
              className={activeFilter === 'all' ? 'filter active' : 'filter'}
              onClick={() => setActiveFilter('all')}
              role="tab"
              aria-selected={activeFilter === 'all'}
            >
              Semua <span>{notes.length}</span>
            </button>
            <button
              className={activeFilter === 'pinned' ? 'filter active' : 'filter'}
              onClick={() => setActiveFilter('pinned')}
              role="tab"
              aria-selected={activeFilter === 'pinned'}
            >
              <Icon name="pin" size={15} /> Disematkan
            </button>
          </div>
          <span className="note-count">{filteredNotes.length} catatan</span>
        </div>

        {storageError && <p className="storage-error" role="alert">{storageError}</p>}

        {filteredNotes.length > 0 ? (
          <div className="notes-grid">
            {filteredNotes.map((note, index) => (
              <article
                className={`note-card note-tone-${index % 4}`}
                key={note.id}
                onClick={() => setEditingNote(note)}
              >
                <div className="card-top">
                  <time dateTime={note.updatedAt}>{formatDate(note.updatedAt)}</time>
                  <button
                    className={note.pinned ? 'icon-button pin-button pinned' : 'icon-button pin-button'}
                    aria-label={note.pinned ? 'Lepas sematan' : 'Sematkan catatan'}
                    title={note.pinned ? 'Lepas sematan' : 'Sematkan catatan'}
                    onClick={(event) => {
                      event.stopPropagation();
                      togglePinned(note.id);
                    }}
                  >
                    <Icon name="pin" size={17} />
                  </button>
                </div>
                <h2>{note.title || 'Catatan tanpa judul'}</h2>
                <p className="note-preview">{note.content || 'Belum ada isi catatan.'}</p>
                <div className="card-footer">
                  <span>{note.content.trim().split(/\s+/).filter(Boolean).length} kata</span>
                  <span className="open-note"><Icon name="arrow" size={16} /></span>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <span className="empty-icon"><Icon name={query || activeFilter === 'pinned' ? 'search' : 'note'} size={25} /></span>
            <h2>
              {query
                ? 'Catatan tidak ditemukan'
                : activeFilter === 'pinned'
                  ? 'Belum ada catatan disematkan'
                  : 'Mulai dengan satu ide'}
            </h2>
            <p>
              {query
                ? 'Coba kata kunci lain atau periksa kembali ejaannya.'
                : activeFilter === 'pinned'
                  ? 'Sematkan catatan favoritmu supaya mudah ditemukan.'
                  : 'Pikiran bagus layak disimpan. Buat catatan pertamamu sekarang.'}
            </p>
            {!query && activeFilter === 'all' && (
              <button className="text-button" onClick={() => setEditingNote({})}>
                Buat catatan pertama <Icon name="arrow" size={16} />
              </button>
            )}
          </div>
        )}
      </section>

      <footer className="page-footer">
        <span>Dibuat untuk menangkap pikiran, satu per satu.</span>
        <span>Privat. Sederhana. Milikmu.</span>
      </footer>

      {editingNote && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setEditingNote(null);
          }}
        >
          <section className="editor" role="dialog" aria-modal="true" aria-labelledby="editor-title">
            <div className="editor-top">
              <span className="editor-label">{isEditing ? 'EDIT CATATAN' : 'CATATAN BARU'}</span>
              <button className="icon-button" onClick={() => setEditingNote(null)} aria-label="Tutup">
                <Icon name="close" />
              </button>
            </div>
            <form onSubmit={saveNote}>
              <input
                id="editor-title"
                className="title-input"
                name="title"
                placeholder="Judul catatan"
                defaultValue={editingNote.title}
                autoFocus
              />
              <textarea
                name="content"
                placeholder="Tulis apa yang sedang kamu pikirkan..."
                defaultValue={editingNote.content}
                rows={9}
              />
              <div className="editor-footer">
                {isEditing ? (
                  <button
                    className="delete-button"
                    type="button"
                    onClick={() => deleteNote(editingNote.id)}
                  >
                    <Icon name="trash" size={17} /> Hapus
                  </button>
                ) : <span className="editor-hint">Tersimpan otomatis di perangkat ini</span>}
                <button className="save-button" type="submit">Simpan catatan</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}

export default App;
