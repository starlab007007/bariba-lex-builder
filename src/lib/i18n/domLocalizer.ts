import { PlatformCatalog, type UiLocale } from "./catalog";
const excluded =
  'script,style,noscript,code,pre,kbd,svg,math,canvas,[contenteditable]:not([contenteditable="false"]),[translate="no"],[data-i18n-preserve],[lang="bba"],[data-ap-ba-text]';
const attributes = [
  "title",
  "placeholder",
  "alt",
  "label",
  "aria-label",
  "aria-description",
  "aria-valuetext",
  "aria-placeholder",
];
type Saved = { source: string; applied: string };
/** Compatibility adapter for legacy views. Only nodeValue and label attributes
 * change: no insertion/removal, HTML rewriting, input values or React state. */
export class DomLocalizer {
  private text = new Map<Text, Saved>();
  private attrs = new Map<Element, Map<string, Saved>>();
  private observer: MutationObserver | null = null;
  private frame = 0;
  private dirty = new Set<Node>();
  constructor(
    private root: HTMLElement,
    private catalog: PlatformCatalog,
    private locale: UiLocale,
  ) {}
  private protected(node: Element | null) {
    return !node || !!node.closest(excluded);
  }
  private processText(node: Text) {
    if (
      this.protected(node.parentElement) ||
      node.parentElement?.closest("textarea,input") ||
      !node.isConnected
    )
      return;
    const previous = this.text.get(node),
      current = node.nodeValue ?? "";
    const source =
      previous && current === previous.applied ? previous.source : current;
    const target = this.catalog.translate(source, this.locale);
    if (target === source) {
      this.text.delete(node);
      return;
    }
    this.text.set(node, { source, applied: target });
    if (current !== target) node.nodeValue = target;
  }
  private processElement(node: Element) {
    if (this.protected(node) || !node.isConnected) return;
    let saved = this.attrs.get(node);
    for (const name of attributes) {
      const current = node.getAttribute(name);
      if (current === null) {
        saved?.delete(name);
        continue;
      }
      const previous = saved?.get(name),
        source =
          previous && current === previous.applied ? previous.source : current;
      const target = this.catalog.translate(source, this.locale);
      if (target === source) {
        saved?.delete(name);
        continue;
      }
      saved ??= new Map();
      saved.set(name, { source, applied: target });
      if (target !== current) node.setAttribute(name, target);
    }
    if (saved?.size) this.attrs.set(node, saved);
    else this.attrs.delete(node);
  }
  private walk(node: Node) {
    if (!node.isConnected) return;
    if (node.nodeType === Node.TEXT_NODE) {
      this.processText(node as Text);
      return;
    }
    if (node instanceof Element && this.protected(node)) return;
    if (node instanceof Element) this.processElement(node);
    const walker = document.createTreeWalker(
      node,
      NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
      {
        acceptNode: (child) =>
          child instanceof Element && this.protected(child)
            ? NodeFilter.FILTER_REJECT
            : NodeFilter.FILTER_ACCEPT,
      },
    );
    let child: Node | null;
    while ((child = walker.nextNode())) {
      if (child instanceof Text) this.processText(child);
      else if (child instanceof Element) this.processElement(child);
    }
  }
  flush() {
    if (this.frame) cancelAnimationFrame(this.frame);
    this.frame = 0;
    const roots = [...this.dirty];
    this.dirty.clear();
    for (const node of roots) this.walk(node);
    for (const node of this.text.keys())
      if (!node.isConnected) this.text.delete(node);
    for (const node of this.attrs.keys())
      if (!node.isConnected) this.attrs.delete(node);
  }
  start() {
    if (this.locale === "fr") return;
    this.walk(this.root);
    this.observer = new MutationObserver((records) => {
      for (const record of records) {
        if (record.type === "childList")
          record.addedNodes.forEach((node) => this.dirty.add(node));
        else this.dirty.add(record.target);
      }
      if (!this.frame) this.frame = requestAnimationFrame(() => this.flush());
    });
    this.observer.observe(this.root, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: attributes,
    });
  }
  stop() {
    this.observer?.disconnect();
    if (this.frame) cancelAnimationFrame(this.frame);
    this.dirty.clear();
    for (const [node, saved] of this.text)
      if (node.isConnected && node.nodeValue === saved.applied)
        node.nodeValue = saved.source;
    for (const [node, saved] of this.attrs)
      if (node.isConnected)
        for (const [name, value] of saved)
          if (node.getAttribute(name) === value.applied)
            node.setAttribute(name, value.source);
    this.text.clear();
    this.attrs.clear();
  }
}
