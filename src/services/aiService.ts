import Anthropic from '@anthropic-ai/sdk';
import { Recipe, DayOfWeek, MealType, DAYS_OF_WEEK, MEAL_TYPES } from '../types';

const MODEL = 'claude-sonnet-4-6';

function getClient(): Anthropic {
  const apiKey = process.env.EXPO_PUBLIC_CLAUDE_API_KEY;
  if (!apiKey) {
    throw new Error(
      'EXPO_PUBLIC_CLAUDE_API_KEY が設定されていません。.env ファイルを確認してください。'
    );
  }
  return new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
}

function buildRecipeSummary(recipes: Recipe[]): string {
  return recipes
    .map(
      (r, i) =>
        `${i + 1}. ID: ${r.id}\n   タイトル: ${r.title}${
          r.description ? `\n   説明: ${r.description.slice(0, 100)}` : ''
        }${
          r.ingredients && r.ingredients.length > 0
            ? `\n   材料: ${r.ingredients.slice(0, 5).join('、')}${r.ingredients.length > 5 ? '…' : ''}`
            : ''
        }`
    )
    .join('\n\n');
}

function buildEmptyPlanJson(): string {
  const obj: Record<string, Record<string, string | null>> = {};
  for (const day of DAYS_OF_WEEK) {
    obj[day] = {};
    for (const meal of MEAL_TYPES) {
      obj[day][meal] = null;
    }
  }
  return JSON.stringify(obj, null, 2);
}

export interface GeneratedWeeklyPlan {
  plan: Record<DayOfWeek, Record<MealType, string | null>>;
  comment: string;
}

export async function generateWeeklyPlan(
  recipes: Recipe[]
): Promise<GeneratedWeeklyPlan> {
  if (recipes.length === 0) {
    throw new Error('レシピが登録されていません。まずレシピを追加してください。');
  }

  const client = getClient();
  const recipeSummary = buildRecipeSummary(recipes);
  const emptyPlanTemplate = buildEmptyPlanJson();

  const systemPrompt = `あなたは栄養バランスを考慮した献立を提案するプロのシェフ兼栄養士です。
ユーザーが登録したレシピの中から、1週間（月曜〜日曜）の朝食・昼食・夕食を考えます。

以下のルールに従って献立を作成してください：
1. 栄養バランスを考慮し、野菜・タンパク質・炭水化物をバランスよく配置する
2. 同じレシピが連続しないよう工夫する
3. 朝食は軽め、夕食はしっかりしたものを選ぶ傾向で
4. 週末（土・日）は少し特別感のある料理を配置する
5. 登録レシピ数が少ない場合は、同じレシピを複数日に割り当ててもよい

必ず以下のJSON形式で回答してください。JSONブロック以外のテキストは \`comment\` フィールドに含めてください：

\`\`\`json
{
  "plan": ${emptyPlanTemplate},
  "comment": "献立についての一言コメント（日本語）"
}
\`\`\`

planの各フィールドの値は、必ず提供されたレシピのIDを使用してください。割り当てが難しい場合はnullのままにしてください。`;

  const userMessage = `以下のレシピから1週間の献立を作成してください。

【登録レシピ一覧】
${recipeSummary}

上記のレシピを使って、月曜〜日曜の朝食・昼食・夕食を組み合わせた献立プランをJSON形式で返してください。`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  });

  const rawText =
    response.content[0]?.type === 'text' ? response.content[0].text : '';

  // Extract JSON from code block
  const jsonMatch =
    rawText.match(/```json\s*([\s\S]*?)\s*```/) ||
    rawText.match(/```\s*([\s\S]*?)\s*```/);

  let parsed: { plan: Record<string, Record<string, string | null>>; comment: string };

  if (jsonMatch) {
    try {
      parsed = JSON.parse(jsonMatch[1]);
    } catch {
      throw new Error('AIの返答をパースできませんでした。もう一度お試しください。');
    }
  } else {
    // Try parsing entire response as JSON
    try {
      parsed = JSON.parse(rawText);
    } catch {
      throw new Error('AIから有効なJSONが返されませんでした。もう一度お試しください。');
    }
  }

  // Validate and sanitize the plan
  const validIds = new Set(recipes.map((r) => r.id));
  const sanitizedPlan: Record<DayOfWeek, Record<MealType, string | null>> =
    {} as Record<DayOfWeek, Record<MealType, string | null>>;

  for (const day of DAYS_OF_WEEK) {
    sanitizedPlan[day] = {} as Record<MealType, string | null>;
    for (const meal of MEAL_TYPES) {
      const suggested = parsed.plan?.[day]?.[meal];
      // Only use the ID if it exists in our recipe list
      sanitizedPlan[day][meal] =
        suggested && validIds.has(suggested) ? suggested : null;
    }
  }

  return {
    plan: sanitizedPlan,
    comment: parsed.comment || 'AIが献立を作成しました。',
  };
}
