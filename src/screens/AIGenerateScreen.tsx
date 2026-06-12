import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { generateWeeklyPlan, GeneratedWeeklyPlan } from '../services/aiService';
import { useRecipeStore } from '../store/recipeStore';
import { useMealPlanStore } from '../store/mealPlanStore';
import {
  DAY_LABELS,
  MEAL_LABELS,
  DAYS_OF_WEEK,
  MEAL_TYPES,
  DayOfWeek,
  MealType,
} from '../types';

export default function AIGenerateScreen() {
  const navigation = useNavigation();
  const recipes = useRecipeStore((s) => s.recipes);
  const applyGeneratedPlan = useMealPlanStore((s) => s.applyGeneratedPlan);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GeneratedWeeklyPlan | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const generated = await generateWeeklyPlan(recipes);
      setResult(generated);
    } catch (err) {
      setError((err as Error).message || 'Không thể tạo thực đơn AI');
    } finally {
      setLoading(false);
    }
  }

  async function handleApply() {
    if (!result) return;
    await applyGeneratedPlan(result.plan);
    Alert.alert('Đã áp dụng', 'Đã áp dụng đề xuất AI vào thực đơn tuần này!', [
      { text: 'Xem lịch', onPress: () => navigation.goBack() },
    ]);
  }

  const recipeMap = new Map(recipes.map((r) => [r.id, r]));

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Intro */}
        <View style={styles.introSection}>
          <Text style={styles.introEmoji}>✨</Text>
          <Text style={styles.introTitle}>AI gợi ý thực đơn</Text>
          <Text style={styles.introText}>
            Tự động tạo thực đơn 1 tuần cân bằng dinh dưỡng từ các công thức đã đăng ký.
          </Text>

          <View style={styles.recipeCount}>
            <Text style={styles.recipeCountText}>
              📖 Số công thức：<Text style={styles.recipeCountNum}>{recipes.length}</Text> món
            </Text>
          </View>

          {recipes.length < 3 && (
            <View style={styles.warningBox}>
              <Text style={styles.warningText}>
                ⚠️ Để có thực đơn tốt hơn, nên đăng ký ít nhất 3 công thức.
              </Text>
            </View>
          )}
        </View>

        {/* Generate Button */}
        <View style={styles.generateSection}>
          <TouchableOpacity
            style={[
              styles.generateBtn,
              (loading || recipes.length === 0) && styles.generateBtnDisabled,
            ]}
            onPress={handleGenerate}
            disabled={loading || recipes.length === 0}
            activeOpacity={0.85}
          >
            {loading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color="#FFFFFF" size="small" />
                <Text style={styles.generateBtnText}>  Đang nghĩ…</Text>
              </View>
            ) : (
              <Text style={styles.generateBtnText}>
                {result ? '🔄 Tạo lại' : '🤖 Tạo thực đơn AI'}
              </Text>
            )}
          </TouchableOpacity>

          {recipes.length === 0 && (
            <Text style={styles.noRecipeHint}>
              Cần thêm công thức vào sổ trước khi sử dụng
            </Text>
          )}
        </View>

        {/* Error */}
        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
          </View>
        ) : null}

        {/* Result */}
        {result ? (
          <View style={styles.resultSection}>
            {/* AI Comment */}
            <View style={styles.commentBox}>
              <Text style={styles.commentIcon}>💬</Text>
              <Text style={styles.commentText}>{result.comment}</Text>
            </View>

            {/* Weekly Plan Table */}
            <Text style={styles.planTitle}>Thực đơn được đề xuất</Text>
            {DAYS_OF_WEEK.map((day: DayOfWeek) => (
              <View key={day} style={styles.dayRow}>
                <View
                  style={[
                    styles.dayBadge,
                    day === 'sat' && styles.dayBadgeSat,
                    day === 'sun' && styles.dayBadgeSun,
                  ]}
                >
                  <Text
                    style={[
                      styles.dayBadgeText,
                      day === 'sat' && styles.dayBadgeTextSat,
                      day === 'sun' && styles.dayBadgeTextSun,
                    ]}
                  >
                    {DAY_LABELS[day]}
                  </Text>
                </View>
                <View style={styles.dayMeals}>
                  {MEAL_TYPES.map((mealType: MealType) => {
                    const recipeId = result.plan[day][mealType];
                    const recipe = recipeId ? recipeMap.get(recipeId) : null;
                    return (
                      <View key={mealType} style={styles.mealRow}>
                        <Text style={styles.mealTypeLabel}>
                          {MEAL_LABELS[mealType]}
                        </Text>
                        <Text
                          style={[
                            styles.mealName,
                            !recipe && styles.mealNameEmpty,
                          ]}
                          numberOfLines={1}
                        >
                          {recipe ? recipe.title : 'Chưa gán'}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            ))}

            {/* Apply Button */}
            <TouchableOpacity
              style={styles.applyBtn}
              onPress={handleApply}
              activeOpacity={0.85}
            >
              <Text style={styles.applyBtnText}>
                📅 Áp dụng thực đơn này cho tuần này
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFBF5',
  },
  introSection: {
    padding: 24,
    alignItems: 'center',
  },
  introEmoji: {
    fontSize: 56,
    marginBottom: 12,
  },
  introTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#3D2B1F',
    marginBottom: 10,
    textAlign: 'center',
  },
  introText: {
    fontSize: 14,
    color: '#7A6A5A',
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 16,
  },
  recipeCount: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#F0E6D3',
    marginBottom: 12,
  },
  recipeCountText: {
    fontSize: 15,
    color: '#3D2B1F',
  },
  recipeCountNum: {
    fontSize: 18,
    fontWeight: '800',
    color: '#E8833A',
  },
  warningBox: {
    backgroundColor: '#FFF8E8',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FFE0A0',
    width: '100%',
  },
  warningText: {
    fontSize: 13,
    color: '#AA7700',
    lineHeight: 18,
  },
  generateSection: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  generateBtn: {
    backgroundColor: '#E8833A',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#E8833A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },
  generateBtnDisabled: {
    backgroundColor: '#D0C0B0',
    shadowOpacity: 0,
    elevation: 0,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  generateBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  noRecipeHint: {
    textAlign: 'center',
    fontSize: 13,
    color: '#9A8A7A',
    marginTop: 10,
  },
  errorBox: {
    marginHorizontal: 24,
    marginBottom: 16,
    backgroundColor: '#FFF0EE',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FFCCCC',
  },
  errorText: {
    fontSize: 13,
    color: '#CC4433',
    lineHeight: 18,
  },
  resultSection: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  commentBox: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#F0E6D3',
    shadowColor: '#3D2B1F',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  commentIcon: {
    fontSize: 22,
    marginRight: 10,
    marginTop: 2,
  },
  commentText: {
    flex: 1,
    fontSize: 14,
    color: '#3D2B1F',
    lineHeight: 21,
  },
  planTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#3D2B1F',
    marginBottom: 12,
  },
  dayRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    marginBottom: 8,
    overflow: 'hidden',
    shadowColor: '#3D2B1F',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  dayBadge: {
    width: 44,
    backgroundColor: '#F5EBE0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayBadgeSat: {
    backgroundColor: '#EBF0FF',
  },
  dayBadgeSun: {
    backgroundColor: '#FFE8E8',
  },
  dayBadgeText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#3D2B1F',
  },
  dayBadgeTextSat: {
    color: '#3355CC',
  },
  dayBadgeTextSun: {
    color: '#CC3333',
  },
  dayMeals: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  mealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
  },
  mealTypeLabel: {
    fontSize: 11,
    color: '#9A8A7A',
    width: 60,
    flexShrink: 0,
  },
  mealName: {
    flex: 1,
    fontSize: 13,
    color: '#3D2B1F',
    fontWeight: '500',
  },
  mealNameEmpty: {
    color: '#C0B0A0',
    fontStyle: 'italic',
  },
  applyBtn: {
    marginTop: 20,
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  applyBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
