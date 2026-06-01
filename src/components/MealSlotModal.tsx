import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  Image,
  TextInput,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Recipe, MealType, DayOfWeek, DAY_LABELS, MEAL_LABELS } from '../types';

interface MealSlotModalProps {
  visible: boolean;
  day: DayOfWeek | null;
  mealType: MealType | null;
  currentRecipeId: string | null;
  recipes: Recipe[];
  onSelect: (recipeId: string | null) => void;
  onClose: () => void;
}

export default function MealSlotModal({
  visible,
  day,
  mealType,
  currentRecipeId,
  recipes,
  onSelect,
  onClose,
}: MealSlotModalProps) {
  const [search, setSearch] = useState('');

  const filtered = recipes.filter((r) =>
    r.title.toLowerCase().includes(search.toLowerCase())
  );

  const dayLabel = day ? DAY_LABELS[day] : '';
  const mealLabel = mealType ? MEAL_LABELS[mealType] : '';

  function handleSelect(recipeId: string | null) {
    onSelect(recipeId);
    setSearch('');
    onClose();
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay} />
      </TouchableWithoutFeedback>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.sheetWrapper}
      >
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.headerTitle}>
              {dayLabel}曜日 {mealLabel}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.searchInput}
            placeholder="レシピを検索…"
            placeholderTextColor="#B0A090"
            value={search}
            onChangeText={setSearch}
          />

          {currentRecipeId && (
            <TouchableOpacity
              style={styles.clearBtn}
              onPress={() => handleSelect(null)}
            >
              <Text style={styles.clearBtnText}>🗑 このスロットをクリア</Text>
            </TouchableOpacity>
          )}

          {recipes.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>📖</Text>
              <Text style={styles.emptyText}>
                レシピがありません{'\n'}まずレシピを追加してください
              </Text>
            </View>
          ) : filtered.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>
                "{search}" に一致するレシピが見つかりません
              </Text>
            </View>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 24 }}
              renderItem={({ item }) => {
                const isSelected = item.id === currentRecipeId;
                return (
                  <TouchableOpacity
                    style={[
                      styles.recipeRow,
                      isSelected && styles.recipeRowSelected,
                    ]}
                    onPress={() => handleSelect(item.id)}
                    activeOpacity={0.7}
                  >
                    {item.image ? (
                      <Image
                        source={{ uri: item.image }}
                        style={styles.recipeThumb}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={[styles.recipeThumb, styles.thumbPlaceholder]}>
                        <Text style={styles.thumbEmoji}>🍽️</Text>
                      </View>
                    )}
                    <View style={styles.recipeInfo}>
                      <Text
                        style={[
                          styles.recipeTitle,
                          isSelected && styles.recipeTitleSelected,
                        ]}
                        numberOfLines={2}
                      >
                        {item.title}
                      </Text>
                      {item.cookingTime ? (
                        <Text style={styles.recipeMeta}>
                          ⏱ {item.cookingTime}
                        </Text>
                      ) : null}
                    </View>
                    {isSelected && (
                      <Text style={styles.checkmark}>✓</Text>
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheetWrapper: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFBF5',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingTop: 12,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#D0C0B0',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: '#3D2B1F',
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F0E6D3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 13,
    color: '#7A6A5A',
    fontWeight: '700',
  },
  searchInput: {
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#3D2B1F',
    borderWidth: 1,
    borderColor: '#F0E6D3',
  },
  clearBtn: {
    marginHorizontal: 16,
    marginBottom: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: '#FFF0EE',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFCCCC',
  },
  clearBtnText: {
    fontSize: 13,
    color: '#CC5544',
    fontWeight: '600',
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyEmoji: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#7A6A5A',
    textAlign: 'center',
    lineHeight: 20,
  },
  recipeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F5EBE0',
  },
  recipeRowSelected: {
    backgroundColor: '#FFF3E8',
  },
  recipeThumb: {
    width: 52,
    height: 52,
    borderRadius: 10,
    backgroundColor: '#F5EBE0',
    marginRight: 12,
  },
  thumbPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbEmoji: {
    fontSize: 22,
  },
  recipeInfo: {
    flex: 1,
  },
  recipeTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3D2B1F',
    lineHeight: 19,
  },
  recipeTitleSelected: {
    color: '#E8833A',
  },
  recipeMeta: {
    fontSize: 11,
    color: '#9A8A7A',
    marginTop: 3,
  },
  checkmark: {
    fontSize: 18,
    color: '#E8833A',
    fontWeight: '700',
    marginLeft: 8,
  },
});
