// ============================================================
// 献立アプリ (Konducta) - Expo Snack 用シングルファイル版
// snack.expo.dev にこのファイルの中身を貼り付けてください
// ============================================================
import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, FlatList, Image, Modal, Alert, ActivityIndicator,
  SafeAreaView, Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ===================== 定数 =====================
const DAY_LABELS = ['月', '火', '水', '木', '金', '土', '日'];
const DAY_KEYS   = ['mon','tue','wed','thu','fri','sat','sun'];
const MEAL_LABELS = ['🌅朝', '🌞昼', '🌙夕'];
const MEAL_KEYS   = ['breakfast','lunch','dinner'];

const C = {
  bg: '#FFFBF5', accent: '#E8833A', accentLight: '#FFF0E6',
  card: '#FFFFFF', text: '#2D2D2D', muted: '#9E9E9E',
  border: '#F0E8DC', danger: '#E53935',
};
const KEYS = { recipes: 'k_recipes', plan: 'k_plan', apiKey: 'k_apikey' };

// ===================== レシピURL解析 =====================
async function parseUrl(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15' },
  });
  const html = await res.text();

  // JSON-LD (schema.org/Recipe)
  const ldMatch = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i);
  if (ldMatch) {
    try {
      const obj = JSON.parse(ldMatch[1]);
      const recipe = Array.isArray(obj) ? obj.find(d => d['@type'] === 'Recipe') : (obj['@type'] === 'Recipe' ? obj : null);
      if (recipe) return {
        title: recipe.name || '',
        image: Array.isArray(recipe.image) ? recipe.image[0] : (recipe.image?.url || recipe.image || ''),
        description: recipe.description || '',
        ingredients: Array.isArray(recipe.recipeIngredient) ? recipe.recipeIngredient : [],
        cookingTime: recipe.totalTime || recipe.cookTime || '',
        servings: String(recipe.recipeYield || ''),
      };
    } catch (_) {}
  }

  // OGP フォールバック
  const og = (p) => html.match(new RegExp(`<meta[^>]*property=["']og:${p}["'][^>]*content=["']([^"']+)["']`, 'i'))?.[1] || '';
  return {
    title: (og('title') || html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] || url).trim(),
    image: og('image'), description: og('description'),
    ingredients: [], cookingTime: '', servings: '',
  };
}

// ===================== Claude API =====================
async function callAI(recipes, apiKey) {
  const list = recipes.map((r, i) => `${i + 1}. ${r.title}`).join('\n');
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content:
        `以下のレシピから1週間の献立を考えてください。栄養バランスを考慮し重複しないよう提案してください。\n\nレシピ:\n${list}\n\n` +
        `以下のJSON形式のみ返してください（コードブロック不要）:\n` +
        `{"mon":{"breakfast":1,"lunch":2,"dinner":3},"tue":{"breakfast":1,"lunch":2,"dinner":3},"wed":{"breakfast":1,"lunch":2,"dinner":3},"thu":{"breakfast":1,"lunch":2,"dinner":3},"fri":{"breakfast":1,"lunch":2,"dinner":3},"sat":{"breakfast":1,"lunch":2,"dinner":3},"sun":{"breakfast":1,"lunch":2,"dinner":3}}\n` +
        `数字はレシピの番号（1始まり）です。`
      }],
    }),
  });
  if (!res.ok) { const e = await res.json(); throw new Error(e.error?.message || 'APIエラー'); }
  const data = await res.json();
  const parsed = JSON.parse(data.content[0].text);
  const result = {};
  for (const day of DAY_KEYS) {
    result[day] = {};
    for (const meal of MEAL_KEYS) {
      const idx = parsed[day]?.[meal];
      result[day][meal] = (idx >= 1 && idx <= recipes.length) ? recipes[idx - 1].id : null;
    }
  }
  return result;
}

// ===================== メインアプリ =====================
export default function App() {
  const [tab, setTab]         = useState('home');
  const [recipes, setRecipes] = useState([]);
  const [plan, setPlan]       = useState({});
  const [apiKey, setApiKey]   = useState('');

  // モーダル
  const [slot, setSlot]           = useState(null);
  const [slotSearch, setSlotSearch] = useState('');

  // レシピ追加
  const [url, setUrl]         = useState('');
  const [preview, setPreview] = useState(null);
  const [fetching, setFetching] = useState(false);
  const [fetchErr, setFetchErr] = useState('');

  // AI
  const [aiLoading, setAiLoading] = useState(false);
  const [aiPlan, setAiPlan]       = useState(null);
  const [aiErr, setAiErr]         = useState('');
  const [showKey, setShowKey]     = useState(false);

  useEffect(() => {
    (async () => {
      const [r, p, k] = await Promise.all([
        AsyncStorage.getItem(KEYS.recipes),
        AsyncStorage.getItem(KEYS.plan),
        AsyncStorage.getItem(KEYS.apiKey),
      ]);
      if (r) setRecipes(JSON.parse(r));
      if (p) setPlan(JSON.parse(p));
      if (k) setApiKey(k);
    })();
  }, []);

  const saveRecipes = async (v) => { setRecipes(v); await AsyncStorage.setItem(KEYS.recipes, JSON.stringify(v)); };
  const savePlan    = async (v) => { setPlan(v);    await AsyncStorage.setItem(KEYS.plan,    JSON.stringify(v)); };
  const saveKey     = async (v) => { setApiKey(v);  await AsyncStorage.setItem(KEYS.apiKey,  v); };
  const getRecipe   = (id) => recipes.find(r => r.id === id);

  // ---- ハンドラー ----
  const onFetch = async () => {
    setFetching(true); setFetchErr(''); setPreview(null);
    try { setPreview(await parseUrl(url.trim())); }
    catch (e) { setFetchErr(e.message); }
    setFetching(false);
  };

  const onSaveRecipe = async () => {
    await saveRecipes([...recipes, { id: Date.now().toString(), url: url.trim(), ...preview, addedAt: new Date().toISOString() }]);
    setUrl(''); setPreview(null); setTab('book');
  };

  const onDeleteRecipe = (id) => Alert.alert('削除', 'このレシピを削除しますか？', [
    { text: 'キャンセル', style: 'cancel' },
    { text: '削除', style: 'destructive', onPress: async () => {
      await saveRecipes(recipes.filter(r => r.id !== id));
      const np = {};
      for (const d of DAY_KEYS) {
        np[d] = {};
        for (const m of MEAL_KEYS) np[d][m] = plan[d]?.[m] === id ? null : (plan[d]?.[m] ?? null);
      }
      await savePlan(np);
    }},
  ]);

  const onSetMeal = async (day, meal, id) => {
    await savePlan({ ...plan, [day]: { ...(plan[day] || {}), [meal]: id } });
    setSlot(null);
  };

  const onGenerateAI = async () => {
    if (!apiKey) { setShowKey(true); return; }
    if (recipes.length < 3) { setAiErr('レシピを3つ以上登録してください'); return; }
    setAiLoading(true); setAiErr(''); setAiPlan(null);
    try { setAiPlan(await callAI(recipes, apiKey)); }
    catch (e) { setAiErr(e.message); }
    setAiLoading(false);
  };

  const onApplyAI = async () => { await savePlan(aiPlan); setAiPlan(null); setTab('home'); };

  // ===================== 画面: 週間カレンダー =====================
  const HomeScreen = () => (
    <ScrollView style={s.screen}>
      <Text style={s.pageTitle}>📅 今週の献立</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
        <View>
          {/* ヘッダー行 */}
          <View style={s.calRow}>
            <View style={[s.calCell, s.calCorner]} />
            {DAY_LABELS.map((d, i) => (
              <View key={i} style={[s.calCell, s.calDayHeader]}>
                <Text style={s.calDayText}>{d}</Text>
              </View>
            ))}
          </View>
          {/* 食事行 */}
          {MEAL_KEYS.map((meal, mi) => (
            <View key={meal} style={s.calRow}>
              <View style={[s.calCell, s.calMealHeader]}>
                <Text style={s.calMealText}>{MEAL_LABELS[mi]}</Text>
              </View>
              {DAY_KEYS.map((day) => {
                const r = plan[day]?.[meal] ? getRecipe(plan[day][meal]) : null;
                return (
                  <TouchableOpacity key={day} style={[s.calCell, s.calSlot, r && s.calSlotFilled]}
                    onPress={() => { setSlot({ day, meal }); setSlotSearch(''); }}>
                    {r ? (
                      <>
                        {r.image
                          ? <Image source={{ uri: r.image }} style={s.slotImg} />
                          : <Text style={{ fontSize: 22 }}>🍽️</Text>}
                        <Text style={s.slotName} numberOfLines={2}>{r.title}</Text>
                      </>
                    ) : <Text style={s.slotPlus}>＋</Text>}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>

      <TouchableOpacity style={s.accentBtn} onPress={() => setTab('ai')}>
        <Text style={s.accentBtnText}>✨ AI献立を提案する</Text>
      </TouchableOpacity>
      <TouchableOpacity style={s.ghostBtn} onPress={() =>
        Alert.alert('リセット', '今週の献立をクリアしますか？', [
          { text: 'キャンセル', style: 'cancel' },
          { text: 'クリア', style: 'destructive', onPress: () => savePlan({}) },
        ])}>
        <Text style={s.ghostBtnText}>今週をリセット</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  // ===================== 画面: レシピ帳 =====================
  const BookScreen = () => {
    const [search, setSearch] = useState('');
    const filtered = recipes.filter(r => r.title.toLowerCase().includes(search.toLowerCase()));
    return (
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <Text style={s.pageTitle}>📖 レシピ帳</Text>
        <TextInput style={s.searchBox} placeholder="レシピを検索..." value={search} onChangeText={setSearch} />
        {recipes.length === 0 ? (
          <View style={s.emptyBox}>
            <Text style={s.emptyText}>レシピがまだありません{'\n'}URLを追加してみましょう</Text>
            <TouchableOpacity style={[s.accentBtn, { marginTop: 16 }]} onPress={() => setTab('add')}>
              <Text style={s.accentBtnText}>＋ レシピを追加</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList data={filtered} keyExtractor={r => r.id} contentContainerStyle={{ padding: 16 }}
            renderItem={({ item }) => (
              <View style={s.recipeCard}>
                {item.image
                  ? <Image source={{ uri: item.image }} style={s.cardThumb} />
                  : <View style={[s.cardThumb, s.cardThumbPlaceholder]}><Text style={{ fontSize: 28 }}>🍽️</Text></View>}
                <View style={s.cardBody}>
                  <Text style={s.cardTitle} numberOfLines={2}>{item.title}</Text>
                  {item.description ? <Text style={s.cardDesc} numberOfLines={2}>{item.description}</Text> : null}
                  <View style={{ flexDirection: 'row', marginTop: 6 }}>
                    {item.cookingTime ? <Text style={s.chip}>⏱ {item.cookingTime}</Text> : null}
                    {item.servings    ? <Text style={s.chip}>👥 {item.servings}</Text>    : null}
                  </View>
                </View>
                <TouchableOpacity onPress={() => onDeleteRecipe(item.id)} style={{ padding: 12 }}>
                  <Text style={{ fontSize: 18 }}>🗑</Text>
                </TouchableOpacity>
              </View>
            )} />
        )}
        <TouchableOpacity style={s.fab} onPress={() => setTab('add')}>
          <Text style={s.fabText}>＋</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // ===================== 画面: レシピ追加 =====================
  const AddScreen = () => (
    <ScrollView style={s.screen} keyboardShouldPersistTaps="handled">
      <Text style={s.pageTitle}>🔗 レシピを追加</Text>
      <View style={s.card}>
        <Text style={s.label}>料理サイトのURLを入力</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TextInput style={[s.input, { flex: 1, marginRight: 8 }]}
            placeholder="https://..." value={url} onChangeText={setUrl}
            autoCapitalize="none" keyboardType="url" />
          <TouchableOpacity style={s.fetchBtn} onPress={onFetch} disabled={fetching}>
            <Text style={{ color: '#fff', fontWeight: '700' }}>取得</Text>
          </TouchableOpacity>
        </View>
        {fetching && <ActivityIndicator color={C.accent} style={{ marginTop: 12 }} />}
        {fetchErr ? <Text style={s.errText}>{fetchErr}</Text> : null}
      </View>

      {preview && (
        <View style={s.card}>
          <Text style={s.label}>プレビュー</Text>
          {preview.image ? <Image source={{ uri: preview.image }} style={s.previewImg} /> : null}
          <Text style={s.previewTitle}>{preview.title}</Text>
          {preview.description ? <Text style={[s.cardDesc, { marginTop: 4 }]}>{preview.description}</Text> : null}
          {preview.ingredients?.length > 0 && (
            <>
              <Text style={[s.label, { marginTop: 12 }]}>材料</Text>
              {preview.ingredients.slice(0, 8).map((ing, i) => (
                <Text key={i} style={{ fontSize: 13, color: C.text, lineHeight: 22 }}>• {ing}</Text>
              ))}
              {preview.ingredients.length > 8 && <Text style={{ color: C.muted, fontSize: 12 }}>他 {preview.ingredients.length - 8} 品...</Text>}
            </>
          )}
          <TouchableOpacity style={[s.accentBtn, { marginTop: 16 }]} onPress={onSaveRecipe}>
            <Text style={s.accentBtnText}>✅ このレシピを保存</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );

  // ===================== 画面: AI提案 =====================
  const AIScreen = () => (
    <ScrollView style={s.screen}>
      <Text style={s.pageTitle}>✨ AI献立提案</Text>
      <View style={s.card}>
        <TouchableOpacity onPress={() => setShowKey(!showKey)}>
          <Text style={s.label}>Claude API キー　{apiKey ? '✅ 設定済み ▼' : '❌ 未設定 ▼'}</Text>
        </TouchableOpacity>
        {(showKey || !apiKey) && (
          <>
            <TextInput style={s.input} placeholder="sk-ant-..." value={apiKey}
              onChangeText={saveKey} secureTextEntry autoCapitalize="none" />
            <Text style={{ color: C.muted, fontSize: 12 }}>console.anthropic.com で取得できます</Text>
          </>
        )}
      </View>
      <View style={s.card}>
        <Text style={s.label}>保存済みレシピ: {recipes.length}件</Text>
        {recipes.length < 3 && <Text style={s.errText}>レシピを3つ以上追加してください</Text>}
        <TouchableOpacity style={[s.accentBtn, { marginTop: 12 }, (aiLoading || recipes.length < 3) && { opacity: 0.5 }]}
          onPress={onGenerateAI} disabled={aiLoading || recipes.length < 3}>
          {aiLoading ? <ActivityIndicator color="#fff" /> : <Text style={s.accentBtnText}>✨ AI献立を生成</Text>}
        </TouchableOpacity>
        {aiErr ? <Text style={[s.errText, { marginTop: 8 }]}>{aiErr}</Text> : null}
      </View>

      {aiPlan && (
        <View style={s.card}>
          <Text style={s.label}>提案された献立</Text>
          {DAY_KEYS.map((day, di) => (
            <View key={day} style={{ flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.border }}>
              <Text style={{ width: 28, fontWeight: '700', color: C.accent, fontSize: 15 }}>{DAY_LABELS[di]}</Text>
              <View style={{ flex: 1 }}>
                {MEAL_KEYS.map((meal, mi) => {
                  const r = aiPlan[day]?.[meal] ? getRecipe(aiPlan[day][meal]) : null;
                  return <Text key={meal} style={{ fontSize: 13, color: C.text, lineHeight: 20 }} numberOfLines={1}>
                    {MEAL_LABELS[mi]} {r ? r.title : '---'}
                  </Text>;
                })}
              </View>
            </View>
          ))}
          <TouchableOpacity style={[s.accentBtn, { marginTop: 16 }]} onPress={onApplyAI}>
            <Text style={s.accentBtnText}>📅 今週に適用する</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );

  // ===================== レンダリング =====================
  return (
    <SafeAreaView style={s.root}>
      <View style={{ flex: 1 }}>
        {tab === 'home' && <HomeScreen />}
        {tab === 'book' && <BookScreen />}
        {tab === 'add'  && <AddScreen />}
        {tab === 'ai'   && <AIScreen />}
      </View>

      {/* タブバー */}
      <View style={s.tabBar}>
        {[
          { key: 'home', icon: '📅', label: '献立' },
          { key: 'book', icon: '📖', label: 'レシピ' },
          { key: 'add',  icon: '➕', label: '追加' },
          { key: 'ai',   icon: '✨', label: 'AI提案' },
        ].map(t => (
          <TouchableOpacity key={t.key} style={s.tabItem} onPress={() => setTab(t.key)}>
            <Text style={{ fontSize: 22 }}>{t.icon}</Text>
            <Text style={[s.tabLabel, tab === t.key && { color: C.accent, fontWeight: '700' }]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* スロット選択モーダル */}
      <Modal visible={!!slot} animationType="slide" transparent onRequestClose={() => setSlot(null)}>
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setSlot(null)}>
          <View style={s.sheet}>
            <Text style={s.sheetTitle}>
              {slot && `${DAY_LABELS[DAY_KEYS.indexOf(slot.day)]}曜日　${MEAL_LABELS[MEAL_KEYS.indexOf(slot.meal)]}`}
            </Text>
            <TextInput style={s.searchBox} placeholder="レシピを検索..." value={slotSearch} onChangeText={setSlotSearch} />
            <ScrollView style={{ maxHeight: 320 }}>
              <TouchableOpacity style={s.slotRow} onPress={() => slot && onSetMeal(slot.day, slot.meal, null)}>
                <Text style={[s.slotRowText, { color: C.danger }]}>✕ 削除</Text>
              </TouchableOpacity>
              {recipes.filter(r => r.title.toLowerCase().includes(slotSearch.toLowerCase())).map(r => (
                <TouchableOpacity key={r.id} style={s.slotRow} onPress={() => slot && onSetMeal(slot.day, slot.meal, r.id)}>
                  <Text style={s.slotRowText}>{r.title}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

// ===================== スタイル =====================
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  screen: { flex: 1, backgroundColor: C.bg },
  pageTitle: { fontSize: 20, fontWeight: '700', color: C.text, padding: 16, paddingBottom: 8 },

  // カレンダー
  calRow: { flexDirection: 'row' },
  calCell: { width: 85, height: 86, padding: 4, borderWidth: 0.5, borderColor: C.border, justifyContent: 'center', alignItems: 'center' },
  calCorner: { width: 44, backgroundColor: C.bg },
  calDayHeader: { backgroundColor: C.accentLight, width: 85 },
  calDayText: { fontWeight: '700', color: C.accent, fontSize: 16 },
  calMealHeader: { width: 44, backgroundColor: C.accentLight },
  calMealText: { fontSize: 10, fontWeight: '600', color: C.accent, textAlign: 'center' },
  calSlot: { backgroundColor: C.card },
  calSlotFilled: { backgroundColor: '#FFF8F3' },
  slotImg: { width: 48, height: 36, borderRadius: 4, marginBottom: 2 },
  slotName: { fontSize: 9, color: C.text, textAlign: 'center' },
  slotPlus: { fontSize: 22, color: C.muted },

  // カード
  card: { backgroundColor: C.card, margin: 16, marginTop: 8, borderRadius: 12, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  recipeCard: { backgroundColor: C.card, borderRadius: 12, marginBottom: 12, flexDirection: 'row', overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 1 },
  cardThumb: { width: 90, height: 90 },
  cardThumbPlaceholder: { backgroundColor: C.accentLight, justifyContent: 'center', alignItems: 'center' },
  cardBody: { flex: 1, padding: 10 },
  cardTitle: { fontWeight: '700', fontSize: 14, color: C.text, marginBottom: 4 },
  cardDesc: { fontSize: 12, color: C.muted, lineHeight: 16 },
  chip: { fontSize: 11, backgroundColor: C.accentLight, color: C.accent, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, marginRight: 4 },

  // 入力
  label: { fontSize: 13, fontWeight: '600', color: C.muted, marginBottom: 8 },
  input: { backgroundColor: '#F5F5F5', borderRadius: 8, padding: 12, fontSize: 14, color: C.text, marginBottom: 8 },
  searchBox: { backgroundColor: '#F5F5F5', borderRadius: 8, padding: 12, fontSize: 14, color: C.text, marginHorizontal: 16, marginBottom: 8 },
  fetchBtn: { backgroundColor: C.accent, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12 },
  errText: { color: C.danger, fontSize: 12, marginTop: 4 },

  // プレビュー
  previewImg: { width: '100%', height: 180, borderRadius: 8, marginBottom: 12 },
  previewTitle: { fontSize: 18, fontWeight: '700', color: C.text },

  // ボタン
  accentBtn: { backgroundColor: C.accent, borderRadius: 10, padding: 14, alignItems: 'center', marginHorizontal: 16 },
  accentBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  ghostBtn: { padding: 12, alignItems: 'center', marginBottom: 24 },
  ghostBtnText: { color: C.muted, fontSize: 13 },
  fab: { position: 'absolute', bottom: 16, right: 16, width: 56, height: 56, borderRadius: 28, backgroundColor: C.accent, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 5 },
  fabText: { color: '#fff', fontSize: 28, fontWeight: '700', lineHeight: 32 },

  // モーダル
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: C.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40 },
  sheetTitle: { fontSize: 17, fontWeight: '700', color: C.text, marginBottom: 12, textAlign: 'center' },
  slotRow: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  slotRowText: { fontSize: 15, color: C.text },

  // タブバー
  tabBar: { flexDirection: 'row', backgroundColor: C.card, borderTopWidth: 1, borderTopColor: C.border, paddingBottom: Platform.OS === 'ios' ? 20 : 0 },
  tabItem: { flex: 1, alignItems: 'center', paddingVertical: 8 },
  tabLabel: { fontSize: 10, color: C.muted, marginTop: 2 },

  // 空状態
  emptyBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyText: { fontSize: 16, color: C.muted, textAlign: 'center', lineHeight: 26 },
});
