import { useRef, useState } from 'react';
import { IonIcon } from '@ionic/react';
import { addOutline, closeOutline } from 'ionicons/icons';

interface Props {
  label: string;
  value: string[];
  onChange: (values: string[]) => void;
  suggestions?: string[];
  placeholder?: string;
}

export function MultiChipInput({
  label,
  value,
  onChange,
  suggestions = [],
  placeholder = 'Ketik lalu tambah',
}: Props): React.JSX.Element {
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const has = (v: string): boolean => value.some((x) => x.toLowerCase() === v.toLowerCase());

  const add = (raw?: string): void => {
    // Always read from the actual input element to avoid stale state on mobile
    const v = (raw ?? inputRef.current?.value ?? draft).trim();
    if (!v || has(v)) {
      setDraft('');
      if (inputRef.current) inputRef.current.value = '';
      return;
    }
    onChange([...value, v]);
    setDraft('');
    if (inputRef.current) inputRef.current.value = '';
    inputRef.current?.focus();
  };

  const remove = (v: string): void => {
    onChange(value.filter((x) => x !== v));
  };

  const toggle = (v: string): void => {
    if (has(v)) remove(value.find((x) => x.toLowerCase() === v.toLowerCase()) ?? v);
    else onChange([...value, v]);
  };

  const remaining = suggestions.filter((s) => !has(s));

  return (
    <div>
      <p className="text-caption font-medium text-slate-muted mb-1.5">{label}</p>

      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onInput={(e) => setDraft((e.target as HTMLInputElement).value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder}
          className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-body text-slate-dark outline-none focus:border-emerald"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
        />
        <button
          type="button"
          onPointerDown={(e) => {
            // Prevent input blur on touch devices before we read value
            e.preventDefault();
          }}
          onClick={() => add()}
          disabled={!draft.trim()}
          className="rounded-xl bg-emerald px-3.5 text-white disabled:opacity-40 active:bg-emerald-700 touch-manipulation"
          aria-label="Tambah"
        >
          <IonIcon icon={addOutline} className="text-xl" />
        </button>
      </div>

      {value.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {value.map((v) => (
            <span
              key={v}
              className="flex items-center gap-1 rounded-full bg-emerald/10 border border-emerald/30 pl-3 pr-1.5 py-1 text-caption font-semibold text-emerald-deep"
            >
              {v}
              <button type="button" onClick={() => remove(v)} aria-label={`Hapus ${v}`}>
                <IonIcon icon={closeOutline} className="text-base" />
              </button>
            </span>
          ))}
        </div>
      )}

      {remaining.length > 0 && (
        <div className="mt-3">
          <p className="text-[0.7rem] text-slate-400 mb-1.5">Saran — ketuk untuk menambah</p>
          <div className="flex flex-wrap gap-2">
            {remaining.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => toggle(s)}
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-caption font-medium text-slate-dark active:bg-slate-100 touch-manipulation"
              >
                + {s}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
