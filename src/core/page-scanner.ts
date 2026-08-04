import type { PageContext, TranslationUnit } from "../shared/types";

export interface DomSlot {
  marker: string;
  node: Node;
}

export interface ScannedUnit {
  element: HTMLElement;
  unit: TranslationUnit;
  slots: DomSlot[];
}

const LEAF_SELECTOR =
  "h1,h2,h3,h4,h5,h6,p,li,td,th,blockquote,figcaption,summary";
const ROOT_SELECTORS = [
  "article.markdown-body",
  ".comment-body",
  "[data-testid='issue-body']",
  "[data-testid='comment-body']",
  "[data-testid='discussion-body']",
  "[data-testid='release-body']",
];
const TITLE_SELECTORS = [
  "[data-testid='issue-title']",
  "[data-testid='discussion-title']",
  ".js-issue-title",
  ".markdown-title",
  "h1[data-view-component='true']",
  "[itemprop='about']",
];
const SKIP_SELECTOR = [
  "pre",
  "code",
  "kbd",
  "samp",
  "script",
  "style",
  "textarea",
  "input",
  "select",
  ".blob-wrapper",
  ".blob-code",
  ".diff-table",
  ".js-diff-progressive-container",
  "[data-testid*='diff']",
  "[data-repolingo-unit]",
].join(",");
const ATOMIC_SELECTOR = [
  "pre",
  "code",
  "kbd",
  "samp",
  "svg",
  "img",
  "video",
  "button",
  "input",
  "textarea",
  "select",
  "a[href]",
  "[aria-hidden='true']",
].join(",");

export function detectPageContext(pathname = location.pathname): PageContext {
  if (/\/pull\/\d+/.test(pathname)) return "pull_request";
  if (/\/issues\/\d+/.test(pathname)) return "issue";
  if (/\/discussions\/\d+/.test(pathname)) return "discussion";
  if (/\/releases(?:\/tag\/[^/]+)?\/?$/.test(pathname)) return "release";
  return "readme";
}

export function getRepositoryKey(pathname = location.pathname): string | null {
  const [owner, repository] = pathname.split("/").filter(Boolean);
  if (!owner || !repository) return null;
  if (["settings", "marketplace", "topics", "collections", "orgs"].includes(owner)) {
    return null;
  }
  return `${owner}/${repository}`;
}

function isUseful(element: HTMLElement): boolean {
  if (element.closest(SKIP_SELECTOR)) return false;
  if (element.matches("li") && element.querySelector(":scope > p, :scope > ul, :scope > ol")) {
    return false;
  }
  const text = element.innerText.replace(/\s+/g, " ").trim();
  if (text.length < 2 || !/[A-Za-z]{2}/.test(text)) return false;
  const latin = (text.match(/[A-Za-z]/g) ?? []).length;
  const chinese = (text.match(/[\u3400-\u9fff]/g) ?? []).length;
  return latin >= Math.max(2, chinese * 0.35);
}

function createTemplate(element: HTMLElement): { text: string; slots: DomSlot[] } {
  const clone = element.cloneNode(true) as HTMLElement;
  clone.removeAttribute("id");
  const slots: DomSlot[] = [];
  const atomicNodes = Array.from(clone.querySelectorAll(ATOMIC_SELECTOR)).filter(
    (node) => !node.parentElement?.closest(ATOMIC_SELECTOR),
  );

  for (const atomicNode of atomicNodes) {
    const marker = `__RPL_DOM_${slots.length}__`;
    const path = getNodePath(clone, atomicNode);
    const originalNode = path ? getNodeByPath(element, path) : null;
    if (!originalNode) continue;
    slots.push({ marker, node: originalNode.cloneNode(true) });
    atomicNode.replaceWith(document.createTextNode(` ${marker} `));
  }

  return {
    text: clone.textContent?.replace(/\s+/g, " ").trim() ?? "",
    slots,
  };
}

function getNodePath(root: Node, target: Node): number[] | null {
  const path: number[] = [];
  let current: Node | null = target;
  while (current && current !== root) {
    const parent: Node | null = current.parentNode;
    if (!parent) return null;
    path.unshift(Array.prototype.indexOf.call(parent.childNodes, current));
    current = parent;
  }
  return current === root ? path : null;
}

function getNodeByPath(root: Node, path: number[]): Node | null {
  let current: Node = root;
  for (const index of path) {
    const next: ChildNode | undefined = current.childNodes[index];
    if (!next) return null;
    current = next;
  }
  return current;
}

export function scanPage(root: ParentNode = document): ScannedUnit[] {
  const context = detectPageContext();
  const candidates = new Set<HTMLElement>();

  for (const rootSelector of ROOT_SELECTORS) {
    for (const contentRoot of root.querySelectorAll<HTMLElement>(rootSelector)) {
      for (const element of contentRoot.querySelectorAll<HTMLElement>(LEAF_SELECTOR)) {
        candidates.add(element);
      }
    }
  }
  for (const selector of TITLE_SELECTORS) {
    for (const element of root.querySelectorAll<HTMLElement>(selector)) {
      candidates.add(element);
    }
  }

  const units: ScannedUnit[] = [];
  for (const element of candidates) {
    if (!isUseful(element)) continue;
    const template = createTemplate(element);
    if (!template.text || !/[A-Za-z]{2}/.test(template.text)) continue;
    units.push({
      element,
      slots: template.slots,
      unit: {
        id: `rpl-${units.length.toString(36)}`,
        text: template.text,
        context,
        protectedTokens: template.slots.map((slot) => slot.marker),
      },
    });
  }
  return units;
}

export function renderTemplate(text: string, slots: DomSlot[]): DocumentFragment {
  const fragment = document.createDocumentFragment();
  const parts = text.split(/(__RPL_DOM_\d+__)/g);
  const slotMap = new Map(slots.map((slot) => [slot.marker, slot.node]));
  for (const part of parts) {
    const slot = slotMap.get(part);
    if (slot) fragment.append(slot.cloneNode(true));
    else if (part) fragment.append(document.createTextNode(part));
  }
  return fragment;
}
