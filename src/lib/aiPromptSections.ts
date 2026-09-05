/**
 * The catalog of AI prompt sections the admin can override.
 *
 * One entry per field the AI writes. `builtIn` is the guidance the routes ship
 * with today, so it doubles as the route default and as the placeholder on
 * /admin/ai-prompts.
 *
 * An override replaces `builtIn` and nothing else. The routes keep ownership of
 * the `- field:` prefix, the type, the character cap, the color palette and the
 * live category list, so full control over wording cannot break the JSON
 * contract or a closed vocabulary.
 *
 * Deliberately import-free: the .js API routes consume it, the same way
 * src/lib/simpleColors.ts already is.
 */

export type PromptGroup = 'global' | 'product' | 'category' | 'chat';
export type PromptRouteId = 'product-metadata' | 'product-draft' | 'category-draft' | 'chat';

export interface PromptSection {
  key: string;
  label: string;
  group: PromptGroup;
  hint: string;
  builtIn: string;
  /** Placeholder for the one section that has no built-in text to start from. */
  example?: string;
}

export const GLOBAL_SECTION_KEY = 'global.brandVoice';

/** One row toggles every override off without discarding the text. */
export const MASTER_KEY = '_master';

/**
 * Per-section input cap. Deliberately generous: measured against a real
 * request the owner's text is the cheap part — the built-in product prompt is
 * ~1370 characters on its own, and the 1024px image sent beside it costs
 * several times more tokens than anything written here.
 */
export const MAX_PROMPT_CHARS = 1200;

export const GLOBAL_PREFIX = 'Brand voice, apply this to every field:';

export const PROMPT_SECTIONS: PromptSection[] = [
  {
    key: GLOBAL_SECTION_KEY,
    label: 'Brand voice',
    group: 'global',
    hint: 'Sent with every section below and with the chat. Keep it about voice, not about format.',
    builtIn: '',
    example: 'Warm and simple. Write for a Bangladeshi shopper reading on a phone.',
  },
  {
    key: 'product.name',
    label: 'Product name',
    group: 'product',
    hint: 'The retail name. Used by the products page autofill and by the chat draft.',
    builtIn: 'a catchy retail product name. No brand name, no quote marks, no price.',
  },
  {
    key: 'product.seoTitle',
    label: 'Product SEO title',
    group: 'product',
    hint: 'Chat draft only — the products page autofill does not write this field.',
    builtIn: 'search-friendly, may repeat the garment type.',
  },
  {
    key: 'product.shortDescription',
    label: 'Product short description',
    group: 'product',
    hint: 'The one-liner shown under the product name.',
    builtIn: 'one sentence.',
  },
  {
    key: 'product.description',
    label: 'Product long description',
    group: 'product',
    hint: 'The main description on the product page.',
    builtIn: '2-4 sentences covering fabric, fit and styling.',
  },
  {
    key: 'product.tags',
    label: 'Product tags',
    group: 'product',
    hint: 'Search keywords. Publishing a draft also turns these into the SEO keywords.',
    builtIn: '6-12 short lowercase search keywords, no "#", no duplicates.',
  },
  {
    key: 'product.colors',
    label: 'Product colors',
    group: 'product',
    hint: 'The palette is always sent after your text, and any color outside it is dropped.',
    builtIn: 'at most 4 colors visible on the garment.',
  },
  {
    key: 'product.category',
    label: 'Product category choice',
    group: 'product',
    hint: 'Your live category list is always sent after your text. A name that matches nothing becomes a suggestion instead.',
    builtIn: 'the ONE best fit for this product.',
  },
  {
    key: 'category.name',
    label: 'Category name',
    group: 'category',
    hint: 'The name shown on the category card and in the shop menu.',
    builtIn: 'title case, no emoji.',
  },
  {
    key: 'category.description',
    label: 'Category description',
    group: 'category',
    hint: 'The blurb on the category page.',
    builtIn: 'one or two sentences, shopper-facing.',
  },
  {
    key: 'category.seoTitle',
    label: 'Category SEO title',
    group: 'category',
    hint: 'The browser tab and search result title for the category.',
    builtIn: 'search-friendly, may include the category name.',
  },
  {
    key: 'category.seoDescription',
    label: 'Category SEO description',
    group: 'category',
    hint: 'The snippet under the search result.',
    builtIn: 'one shopper-facing sentence about what the category contains.',
  },
  {
    key: 'category.seoKeywords',
    label: 'Category SEO keywords',
    group: 'category',
    hint: 'Comma separated, stored as one string.',
    builtIn: '4-8 comma separated lowercase keywords.',
  },
  {
    key: 'chat.analyst',
    label: 'Chat tone and language',
    group: 'chat',
    hint: 'Replaces the tone lines only. The honesty rules and the plain-text rule are locked and always sent after your text.',
    builtIn: [
      'Answer in whatever language the owner writes in, including Banglish.',
      'Be short and concrete. Lead with the number, then one or two lines of what it means and what to do about it.',
    ].join('\n'),
  },
];

export const SECTION_BY_KEY: Record<string, PromptSection> = {};
PROMPT_SECTIONS.forEach((section) => { SECTION_BY_KEY[section.key] = section; });

export const isPromptKey = (key: unknown): boolean =>
  typeof key === 'string' && (key === MASTER_KEY || !!SECTION_BY_KEY[key]);

/**
 * The machine-owned half of each field line: the type and the hard character
 * cap. Never replaceable — this is what stops rewritten guidance from moving
 * the JSON contract.
 */
export const TYPE_SPECS: Record<string, string> = {
  'product.name': 'string, max 60 characters,',
  'product.seoTitle': 'string, max 60 characters,',
  'product.shortDescription': 'string, max 160 characters,',
  'product.description': 'string, max 700 characters,',
  'product.tags': 'array of',
  'product.colors': 'array of',
  'category.name': 'string, max 40 characters,',
  'category.description': 'string, max 300 characters,',
  'category.seoTitle': 'string, max 60 characters,',
  'category.seoDescription': 'string, max 160 characters,',
  'category.seoKeywords': 'string,',
};

export interface RouteField {
  section: string;
  /** The JSON key the model must emit. Empty for the chat, which returns prose. */
  field: string;
}

/** One section can drive differently-named keys, so the route pairs them. */
export const ROUTE_SECTIONS: Record<PromptRouteId, RouteField[]> = {
  'product-metadata': [
    { section: 'product.name', field: 'title' },
    { section: 'product.shortDescription', field: 'shortDescription' },
    { section: 'product.description', field: 'description' },
    { section: 'product.tags', field: 'tags' },
    { section: 'product.colors', field: 'colors' },
  ],
  'product-draft': [
    { section: 'product.name', field: 'name' },
    { section: 'product.seoTitle', field: 'seoTitle' },
    { section: 'product.shortDescription', field: 'shortDescription' },
    { section: 'product.description', field: 'description' },
    { section: 'product.tags', field: 'tags' },
    { section: 'product.colors', field: 'colors' },
    { section: 'product.category', field: 'categoryName' },
  ],
  'category-draft': [
    { section: 'category.name', field: 'name' },
    { section: 'category.description', field: 'description' },
    { section: 'category.seoTitle', field: 'seoTitle' },
    { section: 'category.seoDescription', field: 'seoDescription' },
    { section: 'category.seoKeywords', field: 'seoKeywords' },
  ],
  chat: [{ section: 'chat.analyst', field: '' }],
};

export const ROUTE_LABELS: Record<PromptRouteId, string> = {
  'product-metadata': 'Products page autofill',
  'product-draft': 'Chat product draft',
  'category-draft': 'Chat category draft',
  chat: 'Chat answers',
};

export const GROUP_BY_ROUTE: Record<PromptRouteId, PromptGroup> = {
  'product-metadata': 'product',
  'product-draft': 'product',
  'category-draft': 'category',
  chat: 'chat',
};

/**
 * Owner-authored characters allowed per request. The JSON retry re-sends the
 * whole system prompt plus the failed output, and `isRequestFault` makes an
 * over-long prompt stop the credential chain instead of failing over — so this
 * is a hard ceiling, not a style guide.
 *
 * Scaled with MAX_PROMPT_CHARS on purpose. A budget below what the sections in
 * a group can hold is exactly what makes `resolvePromptTexts` start dropping,
 * so raising one without the other would silently cost the owner whichever
 * sections sit furthest down the catalog.
 */
export const ROUTE_BUDGETS: Record<PromptGroup, number> = {
  global: 0,
  product: 3600,
  category: 2700,
  chat: 2100,
};

export type OverrideGetter = (key: string) => string | undefined;

export const sectionsForGroup = (group: PromptGroup): PromptSection[] =>
  PROMPT_SECTIONS.filter((section) => section.group === group);

export const renderGlobalLine = (text: string): string =>
  text.trim() ? `${GLOBAL_PREFIX} ${text.trim()}` : '';

/** `- name: string, max 60 characters, <guidance>` — the routes' one line shape. */
export const renderFieldLine = (field: string, sectionKey: string, guidance: string): string =>
  `- ${field}: ${[TYPE_SPECS[sectionKey] || '', guidance].filter(Boolean).join(' ')}`;

export interface ResolvedPrompts {
  /** The effective guidance for a section: the override if there is one, else the built-in. */
  text: (sectionKey: string) => string;
  globalLine: string;
  ownerChars: number;
  droppedForBudget: string[];
}

export function resolvePromptTexts(
  getOverride: OverrideGetter,
  routeId: PromptRouteId,
): ResolvedPrompts {
  const budget = ROUTE_BUDGETS[GROUP_BY_ROUTE[routeId]];
  const keys = [GLOBAL_SECTION_KEY, ...ROUTE_SECTIONS[routeId].map((entry) => entry.section)];
  const kept: Record<string, string> = {};
  const droppedForBudget: string[] = [];
  let ownerChars = 0;

  for (let i = 0; i < keys.length; i += 1) {
    const raw = (getOverride(keys[i]) || '').trim();
    if (!raw) continue;

    // Stops rather than skips, so which overrides survive never depends on
    // which one happened to be shorter.
    if (ownerChars + raw.length > budget) {
      keys.slice(i).forEach((key) => {
        if ((getOverride(key) || '').trim()) droppedForBudget.push(key);
      });
      break;
    }
    kept[keys[i]] = raw;
    ownerChars += raw.length;
  }

  return {
    text: (sectionKey) => kept[sectionKey] ?? (SECTION_BY_KEY[sectionKey]?.builtIn || ''),
    globalLine: renderGlobalLine(kept[GLOBAL_SECTION_KEY] || ''),
    ownerChars,
    droppedForBudget,
  };
}

/** The global section lands in every request, so it counts against every group. */
export function charsForGroup(getOverride: OverrideGetter, group: PromptGroup): number {
  const keys = [GLOBAL_SECTION_KEY, ...sectionsForGroup(group).map((section) => section.key)];
  return keys.reduce((total, key) => total + (getOverride(key) || '').trim().length, 0);
}

export function usedBy(sectionKey: string): string[] {
  const routeIds = Object.keys(ROUTE_SECTIONS) as PromptRouteId[];
  if (sectionKey === GLOBAL_SECTION_KEY) return routeIds.map((routeId) => ROUTE_LABELS[routeId]);
  return routeIds
    .filter((routeId) => ROUTE_SECTIONS[routeId].some((entry) => entry.section === sectionKey))
    .map((routeId) => ROUTE_LABELS[routeId]);
}

export interface PromptFinding {
  level: 'error' | 'warning';
  message: string;
}

/**
 * What the owner is about to save, checked against what the routes cannot give
 * up. Errors block the save; warnings are advice about text that will simply
 * lose to a rule sent after it. Never throws — the admin page calls this on
 * every keystroke.
 */
export function lintInstruction(sectionKey: string, value: string): PromptFinding[] {
  const text = (value || '').trim();
  if (!text) return [];

  const findings: PromptFinding[] = [];
  const error = (message: string) => findings.push({ level: 'error', message });
  const warn = (message: string) => findings.push({ level: 'warning', message });

  if (text.length > MAX_PROMPT_CHARS) {
    error(`Too long — ${text.length} of ${MAX_PROMPT_CHARS} characters.`);
  }
  if (text.includes('```')) {
    error('Remove the code fence. The reply must be one bare JSON object.');
  }
  if (/\bjson\b/i.test(text) || /exactly these keys/i.test(text)) {
    error('The JSON shape and the key names are not yours to set. Describe the writing, not the format.');
  }
  if (/\b(ignore|disregard|override|forget)\b[^.]{0,40}\b(rule|rules|instruction|instructions|honesty|above)\b/i.test(text)) {
    error('The locked rules are sent after your text and cannot be waived here.');
  }

  if (/\bmarkdown\b|\btables?\b|\*\*/i.test(text)) {
    warn(
      sectionKey === 'chat.analyst'
        ? 'The chat window renders raw text, so markdown and tables arrive as literal characters.'
        : 'This field is one string inside a JSON reply. Markdown and tables land in it as literal characters.',
    );
  }

  if (sectionKey === 'chat.analyst') {
    if (/\b(guess|estimate|assume|predict|benchmark)\b/i.test(text)) {
      warn('The honesty rules are sent after your text and will win — the chat still refuses to invent numbers.');
    }
    if (/(\+?\d[\d\s-]{7,}|[\w.+-]+@[\w-]+\.[\w.]+)/.test(text)) {
      warn('Customer names, phones and addresses are never sent to the model, so it cannot use them.');
    }
  }

  if (sectionKey === 'product.colors' && /\bhex\b|#[0-9a-f]{3,6}\b/i.test(text)) {
    warn('Colors are snapped to a fixed palette, so anything outside it is dropped — hex codes included.');
  }

  return findings;
}

export const hasBlockingFinding = (findings: PromptFinding[]): boolean =>
  findings.some((finding) => finding.level === 'error');

const PREVIEW_ROUTE: Record<PromptGroup, PromptRouteId> = {
  global: 'product-draft',
  product: 'product-draft',
  category: 'category-draft',
  chat: 'chat',
};

/** The owner-controlled half of the system prompt, composed exactly as a route does. */
export function renderPreview(getOverride: OverrideGetter, group: PromptGroup): string {
  const routeId = PREVIEW_ROUTE[group];
  const resolved = resolvePromptTexts(getOverride, routeId);
  const lines: string[] = [];

  if (resolved.globalLine) lines.push(resolved.globalLine);
  ROUTE_SECTIONS[routeId].forEach(({ section, field }) => {
    const guidance = resolved.text(section);
    lines.push(field ? renderFieldLine(field, section, guidance) : guidance);
  });

  return lines.join('\n');
}
