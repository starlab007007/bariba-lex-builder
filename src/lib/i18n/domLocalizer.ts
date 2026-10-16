import { PlatformCatalog, type UiLocale } from "./catalog";
import { displayLanguageName } from "./languageName";
const nonContent = "script,style,noscript,code,pre,kbd,math,canvas";
const originals = '[contenteditable]:not([contenteditable="false"]),[data-i18n-preserve],[data-ap-ba-text]';
const attributes = ["title", "placeholder", "alt", "label", "aria-label", "aria-description", "aria-valuetext", "aria-placeholder", "value", "content", "type", "name"];
type Saved = { source: string; applied: string };
/** Localize display labels, never field data, form payloads or React structure. */
export class DomLocalizer {
  private text = new Map<Text, Saved>();
  private attrs = new Map<Element, Map<string, Saved>>();
  private observer: MutationObserver | null = null;
  private frame = 0;
  private dirty = new Set<Node>();
  constructor(private root: HTMLElement, private catalog: PlatformCatalog, private locale: UiLocale) {}
  private closest(node: Element, selector: string) {
    const parent = node.closest(selector);
    return parent && parent !== document.documentElement ? parent : null;
  }
  private processText(node: Text) {
    const parent = node.parentElement;
    if (!parent || !node.isConnected || parent.closest(nonContent + ",textarea,input") || this.closest(parent, originals + ',[lang="bba"]')) return;
    if (parent.closest("svg") && !["title", "desc"].includes(parent.localName)) return;
    const previous = this.text.get(node), current = node.nodeValue ?? "";
    const source = previous && current === previous.applied ? previous.source : current;
    const target = this.closest(parent, '[translate="no"]') ? displayLanguageName(source) : this.catalog.translate(source, this.locale);
    if (target === source) { this.text.delete(node); return; }
    this.text.set(node, { source, applied: target });
    if (current !== target) node.nodeValue = target;
  }
  private processElement(node: Element) {
    if (!node.isConnected || node.closest(nonContent)) return;
    const original = this.closest(node, originals);
    // Native-language fields still have localizable placeholders/accessibility labels.
    if (original && !(original === node && node.matches("input,textarea"))) return;
    let saved = this.attrs.get(node);
    const labels = attributes.filter(name => !["value", "content", "type", "name"].includes(name));
    // A named submit button contributes a server-side value: never translate that payload.
    if (node.matches('input[type="submit"],input[type="reset"],input[type="button"]') && !node.hasAttribute("name")) labels.push("value");
    if (node.matches('meta[name="description"],meta[name="keywords"],meta[property="og:title"],meta[property="og:description"],meta[name="twitter:title"],meta[name="twitter:description"]')) labels.push("content");
    if (!labels.includes("value") && saved?.has("value")) {
      const value = saved.get("value")!;
      if (node.getAttribute("value") === value.applied) node.setAttribute("value", value.source);
      saved.delete("value");
    }
    for (const name of labels) {
      const current = node.getAttribute(name);
      if (current === null) { saved?.delete(name); continue; }
      const previous = saved?.get(name), source = previous && current === previous.applied ? previous.source : current;
      const target = this.closest(node, '[translate="no"]') ? displayLanguageName(source) : this.catalog.translate(source, this.locale);
      if (target === source) { saved?.delete(name); continue; }
      saved ??= new Map(); saved.set(name, { source, applied: target });
      if (target !== current) node.setAttribute(name, target);
    }
    if (saved?.size) this.attrs.set(node, saved); else this.attrs.delete(node);
  }
  private walk(node: Node) {
    if (!node.isConnected) return;
    if (node instanceof Text) { this.processText(node); return; }
    if (node instanceof Element && node.closest("script,style,noscript")) return;
    if (node instanceof Element) this.processElement(node);
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
      acceptNode: child => child instanceof Element && child.matches("script,style,noscript") ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT,
    });
    let child: Node | null;
    while ((child = walker.nextNode())) {
      if (child instanceof Text) this.processText(child);
      else if (child instanceof Element) this.processElement(child);
    }
  }
  flush() {
    if (this.frame) cancelAnimationFrame(this.frame); this.frame = 0;
    const roots = [...this.dirty]; this.dirty.clear();
    for (const node of roots) this.walk(node);
    for (const node of this.text.keys()) if (!node.isConnected) this.text.delete(node);
    for (const node of this.attrs.keys()) if (!node.isConnected) this.attrs.delete(node);
  }
  start() {
    this.walk(this.root);
    if (this.root === document.body) this.walk(document.head);
    this.observer = new MutationObserver(records => {
      for (const record of records) {
        if (record.type === "childList") record.addedNodes.forEach(node => this.dirty.add(node));
        else this.dirty.add(record.target);
      }
      if (!this.frame) this.frame = requestAnimationFrame(() => this.flush());
    });
    const options = { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: attributes };
    this.observer.observe(this.root, options);
    if (this.root === document.body) this.observer.observe(document.head, options);
  }
  stop() {
    this.observer?.disconnect(); if (this.frame) cancelAnimationFrame(this.frame); this.dirty.clear();
    for (const [node, saved] of this.text) if (node.isConnected && node.nodeValue === saved.applied) node.nodeValue = saved.source;
    for (const [node, saved] of this.attrs) if (node.isConnected) for (const [name, value] of saved) if (node.getAttribute(name) === value.applied) node.setAttribute(name, value.source);
    this.text.clear(); this.attrs.clear();
  }
}
