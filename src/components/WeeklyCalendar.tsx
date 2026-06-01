import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import {
  Recipe,
  DayOfWeek,
  MealType,
  WeeklyPlan,
  DAY_LABELS,
  MEAL_LABELS,
  DAYS_OF_WEEK,
  MEAL_TYPES,
} from '../types';

interface WeeklyCalendarProps {
  plan: WeeklyPlan;
  recipes: Recipe[];
  onSlotPress: (day: DayOfWeek, mealType: MealType) => void;
}

function MealCell({
  recipe,
  onPress,
}: {
  recipe?: Recipe;
  onPress: () => void;
}) {
  if (!recipe) {
    return (
      <TouchableOpacity style={styles.emptyCell} onPress={onPress} activeOpacity={0.7}>
        <Text style={styles.emptyCellPlus}>+</Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={styles.filledCell} onPress={onPress} activeOpacity={0.75}>
      {recipe.image ? (
        <Image
          source={{ uri: recipe.image }}
          style={styles.cellImage}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.cellImage, styles.cellImagePlaceholder]}>
          <Text style={styles.cellPlaceholderEmoji}>🍽️</Text>
        </View>
      )}
      <Text style={styles.cellTitle} numberOfLines={2}>
        {recipe.title}
      </Text>
    </TouchableOpacity>
  );
}

export default function WeeklyCalendar({
  plan,
  recipes,
  onSlotPress,
}: WeeklyCalendarProps) {
  const recipeMap = new Map(recipes.map((r) => [r.id, r]));

  const weekStart = new Date(plan.weekStart);
  const dayDates = DAYS_OF_WEEK.map((_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d.getDate();
  });

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      {/* Meal type label column */}
      <View style={styles.labelColumn}>
        <View style={styles.dayHeaderSpacer} />
        {MEAL_TYPES.map((mealType) => (
          <View key={mealType} style={styles.mealLabelCell}>
            <Text style={styles.mealLabelText}>{MEAL_LABELS[mealType]}</Text>
          </View>
        ))}
      </View>

      {/* Day columns */}
      {DAYS_OF_WEEK.map((day, dayIndex) => {
        const isSat = day === 'sat';
        const isSun = day === 'sun';
        return (
          <View key={day} style={styles.dayColumn}>
            <View
              style={[
                styles.dayHeader,
                isSat && styles.dayHeaderSat,
                isSun && styles.dayHeaderSun,
              ]}
            >
              <Text
                style={[
                  styles.dayLabel,
                  isSat && styles.dayLabelSat,
                  isSun && styles.dayLabelSun,
                ]}
              >
                {DAY_LABELS[day]}
              </Text>
              <Text
                style={[
                  styles.dayDate,
                  isSat && styles.dayLabelSat,
                  isSun && styles.dayLabelSun,
                ]}
              >
                {dayDates[dayIndex]}
              </Text>
            </View>
            {MEAL_TYPES.map((mealType) => {
              const slot = plan.plan[day][mealType];
              const recipe = slot.recipeId
                ? recipeMap.get(slot.recipeId)
                : undefined;
              return (
                <View key={mealType} style={styles.cellWrapper}>
                  <MealCell
                    recipe={recipe}
                    onPress={() => onSlotPress(day, mealType)}
                  />
                </View>
              );
            })}
          </View>
        );
      })}
    </ScrollView>
  );
}

const CELL_WIDTH = 96;
const CELL_HEIGHT = 110;
const LABEL_COL_WIDTH = 64;

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 12,
    paddingBottom: 16,
  },
  labelColumn: {
    width: LABEL_COL_WIDTH,
    marginRight: 4,
  },
  dayHeaderSpacer: {
    height: 52,
  },
  mealLabelCell: {
    height: CELL_HEIGHT + 8,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 8,
  },
  mealLabelText: {
    fontSize: 11,
    color: '#7A6A5A',
    fontWeight: '600',
    textAlign: 'right',
    lineHeight: 16,
  },
  dayColumn: {
    width: CELL_WIDTH,
    marginHorizontal: 3,
  },
  dayHeader: {
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    marginBottom: 4,
    backgroundColor: '#F5EBE0',
  },
  dayHeaderSat: {
    backgroundColor: '#EBF0FF',
  },
  dayHeaderSun: {
    backgroundColor: '#FFE8E8',
  },
  dayLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#3D2B1F',
  },
  dayLabelSat: {
    color: '#3355CC',
  },
  dayLabelSun: {
    color: '#CC3333',
  },
  dayDate: {
    fontSize: 11,
    color: '#7A6A5A',
    marginTop: 2,
  },
  cellWrapper: {
    marginBottom: 8,
  },
  emptyCell: {
    width: CELL_WIDTH,
    height: CELL_HEIGHT,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#D0C0B0',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFBF5',
  },
  emptyCellPlus: {
    fontSize: 24,
    color: '#C0B0A0',
    fontWeight: '300',
  },
  filledCell: {
    width: CELL_WIDTH,
    height: CELL_HEIGHT,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    shadowColor: '#3D2B1F',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  cellImage: {
    width: '100%',
    height: 62,
    backgroundColor: '#F5EBE0',
  },
  cellImagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellPlaceholderEmoji: {
    fontSize: 26,
  },
  cellTitle: {
    fontSize: 10,
    fontWeight: '600',
    color: '#3D2B1F',
    paddingHorizontal: 5,
    paddingVertical: 4,
    lineHeight: 14,
  },
});
