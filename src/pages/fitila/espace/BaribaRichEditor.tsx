import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { AlignCenter, AlignJustify, AlignLeft, Bold, Check, Eraser, Italic, Keyboard, Languages, List, ListOrdered, Quote, Redo2, SpellCheck2, Underline, Undo2, X } from 'lucide-react';
import { SIG } from '@/components/fitila/signatureTheme';
import { BARIBA_LETTERS, BARIBA_TONES, findMisspelled, foldText, glossHead, htmlToText, sanitizeHtml, type BaribaLexicon, type LexEntry } from '@/lib/espace/baribaText';
import { LiveStrip, SelectionPopover, type DirMode, type Pick } from './SmartAssist';

export type BaribaEditorHandle = {
  getHtml: () => string;
  setHtml: (html: string) => void;
  insertText: (text: string) => void;
  focus: () => void;
};

type Props = {
  initialHtml: string;
  lexicon: BaribaLexicon | null;
  readOnly?: boolean;
  onChange?: (html: string) => void;
  placeholder?: string;
};

const WORD_TAIL = /[\p{L}\p{M}'’]+$/u;

/** Palette des caractères Bàátɔ̀nú + tons (réutilisée par l'éditeur et l'écran de numérisation). */
export function BaribaCharPalette({ onInsert, className = '' }: { onInsert: (s: string) => void; className?: string }) {
  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`} role="group" aria-label="Caractères Bàátɔ̀nú">
      {BARIBA_LETTERS.map((c) => (
        <button key={c} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => onInsert(c)} aria-label={`Insérer ${c}`}
          className="h-9 min-w-9 rounded-[10px] border bg-white px-2 text-[16px] font-bold transition-transform hover:-translate-y-0.5 active:scale-90" style={{ borderColor: SIG.hairline, color: SIG.goldDeep }}>
          {c}
        </button>
      ))}
      <span className="mx-1 h-6 w-px" style={{ background: SIG.hairlineStrong }} />
      {BARIBA_TONES.map((t) => (
        <button key={t.mark} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => onInsert(t.mark)} title={t.label} aria-label={t.label}
          className="h-9 min-w-9 rounded-[10px] border px-2 text-[18px] font-bold transition-transform hover:-translate-y-0.5 active:scale-90" style={{ borderColor: SIG.hairline, background: SIG.clayTint, color: SIG.clay }}>
          ◌{t.mark}
        </button>
      ))}
    </div>
  );
}

function ToolBtn({ label, onClick, active, children }: { label: string; onClick: () => void; active?: boolean; children: React.ReactNode }) {
  return (
    <button type="button" title={label} aria-label={label} aria-pressed={active} onMouseDown={(e) => e.preventDefault()} onClick={onClick}
      className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] transition-colors hover:bg-[#F1EDDF]" style={{ background: active ? SIG.goldTint : undefined, color: SIG.ink }}>
      {children}
    </button>
  );
}

/**
 * Éditeur riche Bàátɔ̀nú : mise en forme WYSIWYG, palette de caractères/tons, autocomplétion et prédiction
 * (dictionnaire FITILA, comme le clavier natif), panneau de vérification orthographique.
 */
const BaribaRichEditor = forwardRef<BaribaEditorHandle, Props>(function BaribaRichEditor(
  { initialHtml, lexicon, readOnly = false, onChange, placeholder = 'Écrivez en Bàátɔ̀nú… (Tab accepte la 1re suggestion)' },
  ref,
) {
  const el = useRef<HTMLDivElement>(null);
  const [suggestions, setSuggestions] = useState<{ prefix: string; items: LexEntry[] }>({ prefix: '', items: [] });
  const [showKeys, setShowKeys] = useState(false);
  const [showSpell, setShowSpell] = useState(false);
  const [text, setText] = useState('');
  const [ignored, setIgnored] = useState<Set<string>>(new Set());
  const [formats, setFormats] = useState<Record<string, boolean>>({});
  const [live, setLive] = useState(() => {
    try { return localStorage.getItem('espace:live') !== 'off'; } catch { return true; }
  });
  const [dirMode, setDirMode] = useState<DirMode>('auto');
  const [paragraph, setParagraph] = useState('');
  const [lastWord, setLastWord] = useState<{ word: string; gloss: string } | null>(null);
  const [pick, setPick] = useState<Pick | null>(null);

  const emit = useCallback(() => {
    const html = el.current?.innerHTML ?? '';
    setText(htmlToText(html));
    onChange?.(html);
  }, [onChange]);

  useEffect(() => {
    if (el.current) {
      el.current.innerHTML = sanitizeHtml(initialHtml);
      setText(htmlToText(el.current.innerHTML));
    }
    // Contenu initial uniquement : les modifications ultérieures passent par setHtml().
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useImperativeHandle(ref, () => ({
    getHtml: () => el.current?.innerHTML ?? '',
    setHtml: (html) => {
      if (!el.current) return;
      el.current.innerHTML = sanitizeHtml(html);
      emit();
    },
    insertText: (t) => insert(t),
    focus: () => el.current?.focus(),
  }));

  const exec = (cmd: string, value?: string) => {
    el.current?.focus();
    document.execCommand(cmd, false, value);
    emit();
    refreshState();
  };
  const insert = (t: string) => {
    if (readOnly) return;
    el.current?.focus();
    document.execCommand('insertText', false, t);
    emit();
  };

  const caretContext = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || !sel.isCollapsed || !sel.anchorNode || !el.current?.contains(sel.anchorNode) || sel.anchorNode.nodeType !== Node.TEXT_NODE) return null;
    const node = sel.anchorNode as Text;
    const before = (node.textContent ?? '').slice(0, sel.anchorOffset);
    const prefix = WORD_TAIL.exec(before)?.[0] ?? '';
    const previous = /([\p{L}\p{M}'’]+)[^\p{L}\p{M}'’]+$/u.exec(before.slice(0, before.length - prefix.length))?.[1] ?? '';
    return { node, offset: sel.anchorOffset, prefix, previous };
  }, []);

  const refreshState = useCallback(() => {
    if (readOnly) return;
    setFormats({
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
      ul: document.queryCommandState('insertUnorderedList'),
      ol: document.queryCommandState('insertOrderedList'),
    });
    const sel = window.getSelection();
    const inside = !!sel && !!sel.anchorNode && !!el.current?.contains(sel.anchorNode);
    // Sélection de texte : fenêtre de traduction / choix des mots.
    if (inside && sel && !sel.isCollapsed && lexicon) {
      const t = sel.toString().replace(/\s+/g, ' ').trim();
      if (t.length >= 1 && t.length <= 300) {
        const r = sel.getRangeAt(0).getBoundingClientRect();
        if (r.width > 0) setPick({ text: t, rect: { left: r.left, top: r.top, bottom: r.bottom, width: r.width } });
      }
    } else setPick(null);
    // Paragraphe en cours (traduction en direct).
    if (inside && sel && sel.isCollapsed && el.current) {
      let n: Node | null = sel.anchorNode;
      while (n && n.parentNode !== el.current) n = n.parentNode;
      setParagraph((n ?? sel.anchorNode)?.textContent ?? '');
    }
    const ctx = caretContext();
    if (!ctx || !lexicon) {
      setLastWord(null);
      return setSuggestions({ prefix: '', items: [] });
    }
    setSuggestions({ prefix: ctx.prefix, items: lexicon.predict(ctx.prefix, ctx.previous, 5) });
    const w = ctx.prefix || ctx.previous;
    const hit = w ? lexicon.lookup(w)[0] : undefined;
    setLastWord(hit && hit.fr ? { word: w, gloss: glossHead(hit.fr) } : null);
  }, [caretContext, lexicon, readOnly]);

  useEffect(() => {
    document.addEventListener('selectionchange', refreshState);
    return () => document.removeEventListener('selectionchange', refreshState);
  }, [refreshState]);

  const accept = (word: string) => {
    const ctx = caretContext();
    if (!ctx) return;
    const range = document.createRange();
    range.setStart(ctx.node, ctx.offset - ctx.prefix.length);
    range.setEnd(ctx.node, ctx.offset);
    const sel = window.getSelection()!;
    sel.removeAllRanges();
    sel.addRange(range);
    document.execCommand('insertText', false, `${word} `);
    emit();
  };

  const replaceSelection = (t: string) => {
    el.current?.focus();
    document.execCommand('insertText', false, t);
    setPick(null);
    emit();
  };
  const appendToSelection = (t: string) => {
    el.current?.focus();
    window.getSelection()?.collapseToEnd();
    document.execCommand('insertText', false, ` (${t})`);
    setPick(null);
    emit();
  };
  const currentBlock = (): Element | null => {
    const sel = window.getSelection();
    let n: Node | null = sel?.anchorNode ?? null;
    while (n && n.parentNode !== el.current) n = n.parentNode;
    return n && n.nodeType === Node.ELEMENT_NODE ? (n as Element) : null;
  };
  const replaceParagraph = (t: string) => {
    const block = currentBlock();
    if (block) {
      const r = document.createRange();
      r.selectNodeContents(block);
      const sel = window.getSelection()!;
      sel.removeAllRanges();
      sel.addRange(r);
    } else document.execCommand('selectAll');
    document.execCommand('insertText', false, t);
    emit();
  };
  const insertBelow = (t: string) => {
    const block = currentBlock();
    const p = document.createElement('p');
    p.textContent = t;
    if (block) block.after(p);
    else el.current?.append(p);
    const r = document.createRange();
    r.selectNodeContents(p);
    r.collapse(false);
    const sel = window.getSelection()!;
    sel.removeAllRanges();
    sel.addRange(r);
    emit();
  };
  const toggleLive = () => {
    setLive((v) => {
      try { localStorage.setItem('espace:live', v ? 'off' : 'on'); } catch { /* stockage indisponible */ }
      return !v;
    });
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    // Alt+1…5 : choisit directement une suggestion.
    if (e.altKey && /^[1-5]$/.test(e.key) && suggestions.items[Number(e.key) - 1]) {
      e.preventDefault();
      accept(suggestions.items[Number(e.key) - 1].ba);
      return;
    }
    if (e.key === 'Tab' && !e.shiftKey && suggestions.prefix && suggestions.items[0]) {
      e.preventDefault();
      accept(suggestions.items[0].ba);
    }
  };

  const onPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const html = e.clipboardData.getData('text/html');
    const clean = html ? sanitizeHtml(html) : '';
    if (clean.trim()) document.execCommand('insertHTML', false, clean);
    else document.execCommand('insertText', false, e.clipboardData.getData('text/plain').normalize('NFC'));
    emit();
  };

  // Vérification orthographique (débouncée).
  const [issues, setIssues] = useState<ReturnType<typeof findMisspelled>>([]);
  useEffect(() => {
    if (!lexicon) return setIssues([]);
    const t = setTimeout(() => setIssues(findMisspelled(text, lexicon).filter((i) => !ignored.has(i.word))), 500);
    return () => clearTimeout(t);
  }, [text, lexicon, ignored]);

  const replaceAll = (from: string, to: string) => {
    if (!el.current) return;
    const re = new RegExp(`(?<![\\p{L}\\p{M}])${from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}\\p{M}])`, 'gu');
    const walker = document.createTreeWalker(el.current, NodeFilter.SHOW_TEXT);
    const nodes: Text[] = [];
    while (walker.nextNode()) nodes.push(walker.currentNode as Text);
    nodes.forEach((n) => {
      if (n.textContent && re.test(n.textContent)) {
        re.lastIndex = 0;
        n.textContent = n.textContent.replace(re, to);
      }
      re.lastIndex = 0;
    });
    emit();
  };

  const wordCount = useMemo(() => (text.trim() ? text.trim().split(/\s+/).length : 0), [text]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {!readOnly && (
        <div className="sticky top-0 z-10 border-b bg-white/95 backdrop-blur" style={{ borderColor: SIG.hairline }}>
          <div className="flex items-center gap-0.5 overflow-x-auto px-2 py-1.5 [scrollbar-width:none]">
            <ToolBtn label="Annuler" onClick={() => exec('undo')}><Undo2 className="h-4 w-4" /></ToolBtn>
            <ToolBtn label="Rétablir" onClick={() => exec('redo')}><Redo2 className="h-4 w-4" /></ToolBtn>
            <span className="mx-1 h-5 w-px shrink-0" style={{ background: SIG.hairline }} />
            <select aria-label="Style de paragraphe" onChange={(e) => exec('formatBlock', e.target.value)} defaultValue="P" className="h-9 shrink-0 rounded-[10px] border bg-white px-2 text-[13px] font-semibold" style={{ borderColor: SIG.hairline }}>
              <option value="P">Paragraphe</option>
              <option value="H1">Titre 1</option>
              <option value="H2">Titre 2</option>
              <option value="H3">Titre 3</option>
            </select>
            <ToolBtn label="Gras" active={formats.bold} onClick={() => exec('bold')}><Bold className="h-4 w-4" /></ToolBtn>
            <ToolBtn label="Italique" active={formats.italic} onClick={() => exec('italic')}><Italic className="h-4 w-4" /></ToolBtn>
            <ToolBtn label="Souligné" active={formats.underline} onClick={() => exec('underline')}><Underline className="h-4 w-4" /></ToolBtn>
            <span className="mx-1 h-5 w-px shrink-0" style={{ background: SIG.hairline }} />
            <ToolBtn label="Liste à puces" active={formats.ul} onClick={() => exec('insertUnorderedList')}><List className="h-4 w-4" /></ToolBtn>
            <ToolBtn label="Liste numérotée" active={formats.ol} onClick={() => exec('insertOrderedList')}><ListOrdered className="h-4 w-4" /></ToolBtn>
            <ToolBtn label="Citation" onClick={() => exec('formatBlock', 'BLOCKQUOTE')}><Quote className="h-4 w-4" /></ToolBtn>
            <ToolBtn label="Aligner à gauche" onClick={() => exec('justifyLeft')}><AlignLeft className="h-4 w-4" /></ToolBtn>
            <ToolBtn label="Centrer" onClick={() => exec('justifyCenter')}><AlignCenter className="h-4 w-4" /></ToolBtn>
            <ToolBtn label="Justifier" onClick={() => exec('justifyFull')}><AlignJustify className="h-4 w-4" /></ToolBtn>
            <ToolBtn label="Effacer la mise en forme" onClick={() => exec('removeFormat')}><Eraser className="h-4 w-4" /></ToolBtn>
            <span className="mx-1 h-5 w-px shrink-0" style={{ background: SIG.hairline }} />
            <ToolBtn label="Clavier Bàátɔ̀nú (caractères et tons)" active={showKeys} onClick={() => setShowKeys((v) => !v)}><Keyboard className="h-4 w-4" /></ToolBtn>
            <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => setShowSpell((v) => !v)} aria-pressed={showSpell}
              className="relative ml-1 flex h-9 shrink-0 items-center gap-1.5 rounded-[10px] px-2.5 text-[12.5px] font-bold" style={{ background: showSpell ? SIG.goldTint : undefined, color: SIG.ink }}>
              <SpellCheck2 className="h-4 w-4" /> Orthographe
              {issues.length > 0 && <span className="rounded-full px-1.5 text-[11px] text-white" style={{ background: SIG.clay }}>{issues.length}</span>}
            </button>
          </div>
          {showKeys && <div className="border-t px-3 py-2" style={{ borderColor: SIG.hairline, background: SIG.appBackground }}><BaribaCharPalette onInsert={insert} /></div>}
          <div className="flex min-h-[42px] items-center gap-1.5 border-t px-3 py-1.5" style={{ borderColor: SIG.hairline }} aria-live="polite">
            <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto [scrollbar-width:none]">
              {lastWord && (
                <span className="flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-[12.5px]" style={{ background: SIG.sageTint, color: SIG.sage }} title="Traduction du mot">
                  <b>{lastWord.word}</b> = {lastWord.gloss}
                </span>
              )}
              {suggestions.items.length === 0 ? (
                !lastWord && <span className="text-[12px]" style={{ color: SIG.muted }}>{lexicon ? 'Suggestions dès la première lettre · sélectionnez un mot pour le traduire' : 'Chargement du dictionnaire…'}</span>
              ) : (
                suggestions.items.map((s, i) => (
                  <button key={s.ba} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => accept(s.ba)} title={`${s.fr || ''} (Alt+${i + 1})`}
                    className="shrink-0 rounded-full border px-3 py-1 text-[13.5px] font-extrabold transition-transform active:scale-95" style={{ borderColor: i === 0 ? SIG.gold : SIG.hairline, background: i === 0 ? SIG.goldTint : '#fff', color: SIG.goldDeep }}>
                    {s.ba}{s.fr && <span className="ml-1.5 hidden text-[11px] font-medium sm:inline" style={{ color: SIG.muted }}>{glossHead(s.fr).slice(0, 18)}</span>}
                  </button>
                ))
              )}
            </div>
            <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={toggleLive} aria-pressed={live} title="Traduction en direct du paragraphe"
              className="flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[12px] font-extrabold" style={{ borderColor: live ? SIG.gold : SIG.hairline, background: live ? SIG.goldTint : '#fff', color: live ? SIG.goldDeep : SIG.muted }}>
              <Languages className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Traduire</span>
            </button>
          </div>
          {live && lexicon && <LiveStrip lexicon={lexicon} paragraph={paragraph} mode={dirMode} onMode={setDirMode} onReplace={replaceParagraph} onInsertBelow={insertBelow} />}
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        <div className="min-w-0 flex-1 overflow-y-auto">
          <div
            ref={el}
            lang="bba"
            contentEditable={!readOnly}
            suppressContentEditableWarning
            spellCheck={false}
            role="textbox"
            aria-multiline="true"
            aria-label="Contenu du document"
            data-placeholder={placeholder}
            onInput={emit}
            onKeyDown={onKeyDown}
            onKeyUp={refreshState}
            onMouseUp={refreshState}
            onPaste={onPaste}
            className="espace-prose min-h-[52vh] px-5 py-6 outline-none sm:px-9 sm:py-9"
          />
        </div>
        {showSpell && !readOnly && (
          <aside className="w-[min(88vw,300px)] shrink-0 overflow-y-auto border-l bg-white p-3" style={{ borderColor: SIG.hairline }} aria-label="Vérification orthographique">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-[13px] font-extrabold">Orthographe Bàátɔ̀nú</h3>
              <button type="button" onClick={() => setShowSpell(false)} aria-label="Fermer" className="rounded-full p-1 hover:bg-[#F1EDDF]"><X className="h-4 w-4" /></button>
            </div>
            {!lexicon ? (
              <p className="text-[12px]" style={{ color: SIG.muted }}>Dictionnaire indisponible.</p>
            ) : issues.length === 0 ? (
              <p className="flex items-center gap-2 rounded-[12px] p-3 text-[12.5px]" style={{ background: SIG.sageTint, color: SIG.sage }}><Check className="h-4 w-4" /> Aucun mot inconnu du dictionnaire.</p>
            ) : (
              <ul className="space-y-2">
                {issues.map((i) => (
                  <li key={i.word} className="rounded-[12px] border p-2.5" style={{ borderColor: SIG.hairline }}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-[14px] font-bold" style={{ color: SIG.clay }}>{i.word}{i.count > 1 && <span className="ml-1 text-[11px] font-medium" style={{ color: SIG.muted }}>×{i.count}</span>}</span>
                      <button type="button" className="text-[11.5px] font-semibold underline" style={{ color: SIG.muted }} onClick={() => setIgnored((s) => new Set(s).add(i.word))}>Ignorer</button>
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {i.suggestions.length === 0 && <span className="text-[11.5px]" style={{ color: SIG.muted }}>Pas de suggestion</span>}
                      {i.suggestions.map((s) => (
                        <button key={s} type="button" onClick={() => replaceAll(i.word, s)} className="rounded-full border px-2.5 py-0.5 text-[13px] font-bold" style={{ borderColor: SIG.gold, background: SIG.goldTint, color: SIG.goldDeep }} title={`Remplacer « ${i.word} » par « ${s} »`}>
                          {s}
                        </button>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-[11px] leading-relaxed" style={{ color: SIG.muted }}>Les mots absents du dictionnaire (noms propres, mots récents) peuvent être ignorés. « {foldText('Bàátɔ̀nú')} » ≈ « Bàátɔ̀nú » : les suggestions rétablissent tons et caractères spéciaux.</p>
          </aside>
        )}
      </div>

      {pick && lexicon && !readOnly && <SelectionPopover lexicon={lexicon} pick={pick} onReplace={replaceSelection} onAppend={appendToSelection} onClose={() => setPick(null)} />}

      <div className="flex items-center justify-between border-t px-4 py-1.5 text-[11.5px]" style={{ borderColor: SIG.hairline, color: SIG.muted }}>
        <span>{wordCount} mot{wordCount > 1 ? 's' : ''} · {text.length} caractères</span>
        {lexicon && <span>Dictionnaire : {lexicon.size.toLocaleString('fr-FR')} entrées</span>}
      </div>
    </div>
  );
});

export default BaribaRichEditor;
