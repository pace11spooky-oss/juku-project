import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useRecipeStore } from '../store/recipeStore';
import { useMealPlanStore } from '../store/mealPlanStore';
import { DayOfWeek, MealType } from '../types';
import WeeklyCalendar from '../components/WeeklyCalendar';
import MealSlotModal from '../components/MealSlotModal';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const recipes = useRecipeStore((s) => s.recipes);
  const { currentPlan, setMeal, clearWeek } = useMealPlanStore();

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDay, setSelectedDay] = useState<DayOfWeek | null>(null);
  const [selectedMeal, setSelectedMeal] = useState<MealType | null>(null);

  function handleSlotPress(day: DayOfWeek, mealType: MealType) {
    setSelectedDay(day);
    setSelectedMeal(mealType);
    setModalVisible(true);
  }

  function handleRecipeSelect(recipeId: string | null) {
    if (selectedDay && selectedMeal) {
      setMeal(selectedDay, selectedMeal, recipeId);
    }
    setModalVisible(false);
  }

  function handleClearWeek() {
    Alert.alert(
      'Xóa thực đơn',
      'Xóa tất cả thực đơn tuần này. Bạn có chắc không?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: () => clearWeek(),
        },
      ]
    );
  }

  const currentRecipeId =
    selectedDay && selectedMeal && currentPlan
      ? currentPlan.plan[selectedDay][selectedMeal].recipeId
      : null;

  const weekStart = currentPlan
    ? new Date(currentPlan.weekStart)
    : new Date();
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const formatDate = (d: Date) =>
    `${d.getDate()}/${d.getMonth() + 1}`;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>🍱 Lịch thực đơn</Text>
          {currentPlan ? (
            <Text style={styles.headerWeek}>
              {formatDate(weekStart)} 〜 {formatDate(weekEnd)}
            </Text>
          ) : null}
        </View>
        <TouchableOpacity
          style={styles.aiBtn}
          onPress={() => navigation.navigate('AIGenerate')}
          activeOpacity={0.8}
        >
          <Text style={styles.aiBtnText}>✨ Gợi ý AI</Text>
        </TouchableOpacity>
      </View>

      {/* Calendar */}
      <ScrollView style={styles.calendarScroll} showsVerticalScrollIndicator={false}>
        {currentPlan ? (
          <WeeklyCalendar
            plan={currentPlan}
            recipes={recipes}
            onSlotPress={handleSlotPress}
          />
        ) : (
          <View style={styles.loading}>
            <Text style={styles.loadingText}>Đang tải…</Text>
          </View>
        )}

        {/* Legend */}
        <View style={styles.legend}>
          <Text style={styles.legendText}>
            📌 Nhấn ô để gán công thức
          </Text>
          <TouchableOpacity onPress={handleClearWeek} style={styles.clearBtn}>
            <Text style={styles.clearBtnText}>🗑 Xóa tuần này</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Meal Slot Modal */}
      <MealSlotModal
        visible={modalVisible}
        day={selectedDay}
        mealType={selectedMeal}
        currentRecipeId={currentRecipeId}
        recipes={recipes}
        onSelect={handleRecipeSelect}
        onClose={() => setModalVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFBF5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0E6D3',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#3D2B1F',
  },
  headerWeek: {
    fontSize: 12,
    color: '#9A8A7A',
    marginTop: 2,
  },
  aiBtn: {
    backgroundColor: '#E8833A',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    shadowColor: '#E8833A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  aiBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  calendarScroll: {
    flex: 1,
    paddingTop: 12,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  loadingText: {
    fontSize: 16,
    color: '#9A8A7A',
  },
  legend: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  legendText: {
    fontSize: 12,
    color: '#9A8A7A',
    textAlign: 'center',
  },
  clearBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F0E6D3',
    backgroundColor: '#FFF8F2',
  },
  clearBtnText: {
    fontSize: 13,
    color: '#C0432A',
    fontWeight: '600',
  },
});
