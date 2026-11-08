/**
 * Center Normalization and Alias Matching Utilities
 * Ensures consistent center identification across all management dashboards
 * (e.g. "GGD" <-> "Giri Govardhan Dham (GGD)", "KV" <-> "Kothrud VOICE (KV)")
 */

export function getCenterAliases(centerName: string | undefined | null): string[] {
  if (!centerName) return [];
  const raw = String(centerName).trim();
  if (!raw) return [];

  const set = new Set<string>();
  set.add(raw);

  // 1. Extract content inside parentheses, e.g., "Giri Govardhan Dham (GGD)" -> "GGD"
  const parenMatch = raw.match(/\(([^)]+)\)/);
  if (parenMatch && parenMatch[1]) {
    const inside = parenMatch[1].trim();
    if (inside) set.add(inside);
  }

  // 2. Extract content outside parentheses, e.g., "Giri Govardhan Dham (GGD)" -> "Giri Govardhan Dham"
  const outsideParen = raw.replace(/\s*\([^)]*\)/g, '').trim();
  if (outsideParen && outsideParen !== raw) {
    set.add(outsideParen);
  }

  // 3. Known / Common VOICE and ISKCON Center Aliases
  const lower = raw.toLowerCase();

  // Giri Govardhan Dham aliases
  if (lower === 'ggd' || lower.includes('govardhan') || lower.includes('giri govardhan')) {
    set.add('GGD');
    set.add('Giri Govardhan Dham');
    set.add('Giri Govardhan Dham (GGD)');
  }

  // Kothrud VOICE aliases
  if (lower === 'kv' || lower.includes('kothrud')) {
    set.add('KV');
    set.add('Kothrud VOICE');
    set.add('Kothrud VOICE (KV)');
  }

  // Wagholi VOICE aliases
  if (lower === 'wv' || lower.includes('wagholi')) {
    set.add('WV');
    set.add('Wagholi VOICE');
    set.add('Wagholi VOICE (WV)');
  }

  // Narhe VOICE aliases
  if (lower === 'nv' || lower.includes('narhe')) {
    set.add('NV');
    set.add('Narhe VOICE');
    set.add('Narhe VOICE (NV)');
  }

  // Nigdi VOICE aliases
  if (lower === 'nigdi' || lower.includes('nigdi voice')) {
    set.add('Nigdi VOICE');
  }

  return Array.from(set).filter(Boolean);
}

/**
 * Builds a PostgREST OR filter string that matches ANY alias variant across all user center columns
 */
export function buildCenterMatchQuery(centerName: string | undefined | null): string {
  if (!centerName) return '';
  const aliases = getCenterAliases(centerName);
  const parts: string[] = [];

  aliases.forEach((alias) => {
    const val = alias.trim();
    if (!val) return;
    parts.push(
      `current_center.eq.${val}`,
      `center.eq.${val}`,
      `parent_center.eq.${val}`,
      `other_parent_center.eq.${val}`,
      `hierarchy->>currentCenter.eq.${val}`,
      `hierarchy->>center.eq.${val}`,
      `hierarchy->>parentCenter.eq.${val}`,
      `hierarchy->>otherParentCenter.eq.${val}`,
      `hierarchy->currentCenter->>name.eq.${val}`,
      `hierarchy->parentCenter->>name.eq.${val}`
    );
  });

  return parts.join(',');
}

/**
 * Checks whether two center references point to the same center
 */
export function isCenterMatch(
  centerA: string | undefined | null,
  centerB: string | undefined | null
): boolean {
  if (!centerA || !centerB) return false;
  const aNorm = String(centerA).trim().toLowerCase();
  const bNorm = String(centerB).trim().toLowerCase();
  if (!aNorm || !bNorm) return false;
  if (aNorm === bNorm) return true;

  const aAliases = getCenterAliases(centerA).map((a) => a.toLowerCase());
  const bAliases = getCenterAliases(centerB).map((b) => b.toLowerCase());

  // Check alias overlap
  if (aAliases.some((aliasA) => bAliases.includes(aliasA))) {
    return true;
  }

  // Check alphanumeric stripped comparison
  const aClean = aNorm.replace(/[^a-z0-9]/g, '');
  const bClean = bNorm.replace(/[^a-z0-9]/g, '');
  if (aClean && bClean && (aClean === bClean || aClean.includes(bClean) || bClean.includes(aClean))) {
    if (Math.min(aClean.length, bClean.length) >= 3) {
      return true;
    }
  }

  return false;
}

/**
 * Safely extracts user's current center name from flat column or hierarchy JSONB
 */
export function getUserCurrentCenter(u: any): string {
  if (!u) return '';
  const uH = u.hierarchy as any;
  return (
    u.current_center ||
    u.center ||
    uH?.currentCenter?.name ||
    (typeof uH?.currentCenter === 'string' ? uH.currentCenter : '') ||
    uH?.center ||
    ''
  ).trim();
}

/**
 * Safely extracts user's parent/origin center name from flat column or hierarchy JSONB
 */
export function getUserParentCenter(u: any): string {
  if (!u) return '';
  const uH = u.hierarchy as any;
  return (
    u.parent_center ||
    u.parentCenter ||
    uH?.parentCenter?.name ||
    (typeof uH?.parentCenter === 'string' ? uH.parentCenter : '') ||
    uH?.parent_center ||
    u.other_parent_center ||
    uH?.otherParentCenter ||
    ''
  ).trim();
}

