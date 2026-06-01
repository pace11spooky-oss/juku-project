import { Recipe } from '../types';

function generateId(): string {
  return `recipe_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function extractJsonLd(html: string): Record<string, unknown> | null {
  // Find all JSON-LD script blocks
  const scriptRegex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;

  while ((match = scriptRegex.exec(html)) !== null) {
    try {
      const json = JSON.parse(match[1].trim());
      // Handle both single objects and arrays
      const items = Array.isArray(json) ? json : [json];
      for (const item of items) {
        if (
          item['@type'] === 'Recipe' ||
          (Array.isArray(item['@type']) && item['@type'].includes('Recipe'))
        ) {
          return item as Record<string, unknown>;
        }
        // Handle @graph
        if (item['@graph']) {
          const graph = Array.isArray(item['@graph']) ? item['@graph'] : [item['@graph']];
          for (const node of graph) {
            if (
              node['@type'] === 'Recipe' ||
              (Array.isArray(node['@type']) && node['@type'].includes('Recipe'))
            ) {
              return node as Record<string, unknown>;
            }
          }
        }
      }
    } catch {
      // Skip malformed JSON-LD blocks
    }
  }
  return null;
}

function extractMetaTag(html: string, property: string): string | undefined {
  // Match both property= and name= variants
  const regex = new RegExp(
    `<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["']`,
    'i'
  );
  const match = html.match(regex);
  if (match) return match[1];

  // Also try content before property
  const regex2 = new RegExp(
    `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${property}["']`,
    'i'
  );
  const match2 = html.match(regex2);
  return match2 ? match2[1] : undefined;
}

function extractTitle(html: string): string | undefined {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return match ? match[1].trim() : undefined;
}

function parseIngredients(raw: unknown): string[] {
  if (!raw) return [];
  if (typeof raw === 'string') return [raw];
  if (!Array.isArray(raw)) return [];

  return raw
    .map((item) => {
      if (typeof item === 'string') return item.trim();
      if (typeof item === 'object' && item !== null) {
        // HowToSupply or similar object
        const obj = item as Record<string, unknown>;
        return (obj['name'] as string) || (obj['text'] as string) || '';
      }
      return '';
    })
    .filter(Boolean);
}

function parseISO8601Duration(duration: string): string | undefined {
  if (!duration) return undefined;
  // e.g. PT30M, PT1H30M, P0DT30M
  const match = duration.match(/PT?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/i);
  if (!match) return duration;
  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  if (hours > 0 && minutes > 0) return `${hours}時間${minutes}分`;
  if (hours > 0) return `${hours}時間`;
  if (minutes > 0) return `${minutes}分`;
  return undefined;
}

export interface ParsedRecipe {
  title: string;
  image?: string;
  description?: string;
  ingredients?: string[];
  servings?: string;
  cookingTime?: string;
}

export async function parseRecipeFromUrl(url: string): Promise<Recipe> {
  let html: string;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; JukuMealPlanner/1.0; +https://github.com/juku)',
        Accept: 'text/html,application/xhtml+xml',
      },
    });
    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }
    html = await response.text();
  } catch (err) {
    throw new Error(`URLの取得に失敗しました: ${(err as Error).message}`);
  }

  // Try JSON-LD first (richest data)
  const jsonLd = extractJsonLd(html);

  let title: string | undefined;
  let image: string | undefined;
  let description: string | undefined;
  let ingredients: string[] | undefined;
  let servings: string | undefined;
  let cookingTime: string | undefined;

  if (jsonLd) {
    title = typeof jsonLd['name'] === 'string' ? jsonLd['name'] : undefined;

    // Image can be a string, object, or array
    const imgRaw = jsonLd['image'];
    if (typeof imgRaw === 'string') {
      image = imgRaw;
    } else if (Array.isArray(imgRaw) && imgRaw.length > 0) {
      const first = imgRaw[0];
      image = typeof first === 'string' ? first : (first as Record<string, unknown>)['url'] as string;
    } else if (imgRaw && typeof imgRaw === 'object') {
      image = (imgRaw as Record<string, unknown>)['url'] as string;
    }

    description =
      typeof jsonLd['description'] === 'string' ? jsonLd['description'] : undefined;

    ingredients = parseIngredients(jsonLd['recipeIngredient']);

    // Servings
    const yieldRaw = jsonLd['recipeYield'];
    if (typeof yieldRaw === 'string') servings = yieldRaw;
    else if (Array.isArray(yieldRaw) && yieldRaw.length > 0)
      servings = String(yieldRaw[0]);
    else if (typeof yieldRaw === 'number') servings = String(yieldRaw);

    // Cooking time: prefer totalTime, else cookTime
    const timeRaw =
      (jsonLd['totalTime'] as string) || (jsonLd['cookTime'] as string);
    if (timeRaw) {
      cookingTime = parseISO8601Duration(timeRaw) ?? timeRaw;
    }
  }

  // Fall back to Open Graph tags
  if (!title) title = extractMetaTag(html, 'og:title');
  if (!image) image = extractMetaTag(html, 'og:image');
  if (!description) description = extractMetaTag(html, 'og:description');

  // Final fallback: <title> tag
  if (!title) title = extractTitle(html);
  if (!title) title = url;

  // Clean up description
  if (description && description.length > 200) {
    description = description.slice(0, 197) + '…';
  }

  return {
    id: generateId(),
    url,
    title,
    image,
    description,
    ingredients,
    servings,
    cookingTime,
    addedAt: new Date().toISOString(),
  };
}
