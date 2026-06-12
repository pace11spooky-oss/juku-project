import Anthropic from '@anthropic-ai/sdk';
import { Recipe, DayOfWeek, MealType, DAYS_OF_WEEK, MEAL_TYPES } from '../types';

const MODEL = 'claude-sonnet-4-6';

function getClient(): Anthropic {
  const apiKey = process.env.EXPO_PUBLIC_CLAUDE_API_KEY;
  if (!apiKey) {
    throw new Error(
      'EXPO_PUBLIC_CLAUDE_API_KEY chưa được thiết lập. Vui lòng kiểm tra file .env.'
    );
  }
  return new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
}

function buildRecipeSummary(recipes: Recipe[]): string {
  return recipes
    .map(
      (r, i) =>
        `${i + 1}. ID: ${r.id}\n   Tiêu đề: ${r.title}${
          r.description ? `\n   Mô tả: ${r.description.slice(0, 100)}` : ''
        }${
          r.ingredients && r.ingredients.length > 0
            ? `\n   Nguyên liệu: ${r.ingredients.slice(0, 5).join('、')}${r.ingredients.length > 5 ? '…' : ''}`
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
    throw new Error('Chưa có công thức nào. Vui lòng thêm công thức trước.');
  }

  const client = getClient();
  const recipeSummary = buildRecipeSummary(recipes);
  const emptyPlanTemplate = buildEmptyPlanJson();

  const systemPrompt = `Bạn là đầu bếp kiêm chuyên gia dinh dưỡng chuyên đề xuất thực đơn cân bằng dinh dưỡng.
Từ các công thức mà người dùng đã đăng ký, bạn lên kế hoạch bữa sáng, trưa, tối cho 1 tuần (Thứ Hai đến Chủ Nhật).

Hãy tạo thực đơn theo các quy tắc sau:
1. Cân bằng dinh dưỡng với rau, protein và tinh bột được phân bổ hợp lý
2. Tránh lặp cùng một công thức liên tiếp
3. Bữa sáng nhẹ nhàng, bữa tối đầy đủ hơn
4. Cuối tuần (Thứ Bảy, Chủ Nhật) chọn món đặc biệt hơn một chút
5. Nếu ít công thức, có thể gán cùng một công thức cho nhiều ngày

Hãy trả lời theo đúng định dạng JSON sau. Văn bản ngoài khối JSON hãy đưa vào trường \`comment\`:

\`\`\`json
{
  "plan": ${emptyPlanTemplate},
  "comment": "Nhận xét ngắn về thực đơn (bằng tiếng Việt)"
}
\`\`\`

Giá trị của từng trường trong plan phải sử dụng ID công thức được cung cấp. Nếu không thể gán, hãy để null.`;

  const userMessage = `Hãy tạo thực đơn 1 tuần từ các công thức sau.

【Danh sách công thức đã đăng ký】
${recipeSummary}

Sử dụng các công thức trên để lập kế hoạch bữa sáng, trưa, tối từ Thứ Hai đến Chủ Nhật và trả về dưới dạng JSON.`;

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
      throw new Error('Không thể phân tích phản hồi từ AI. Vui lòng thử lại.');
    }
  } else {
    // Try parsing entire response as JSON
    try {
      parsed = JSON.parse(rawText);
    } catch {
      throw new Error('AI không trả về JSON hợp lệ. Vui lòng thử lại.');
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
    comment: parsed.comment || 'AI đã tạo thực đơn.',
  };
}
