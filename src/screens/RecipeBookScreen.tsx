import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useRecipeStore } from '../store/recipeStore';
import { useMealPlanStore } from '../store/mealPlanStore';
import RecipeCard from '../components/RecipeCard';
import { Recipe } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function RecipeBookScreen() {
  const navigation = useNavigation<Nav>();
  const recipes = useRecipeStore((s) => s.recipes);
  const deleteRecipe = useRecipeStore((s) => s.deleteRecipe);
  const clearWeek = useMealPlanStore((s) => s.clearWeek);
  const [search, setSearch] = useState('');

  const filtered = recipes.filter(
    (r) =>
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      (r.description && r.description.toLowerCase().includes(search.toLowerCase()))
  );

  function handleLongPress(recipe: Recipe) {
    Alert.alert(recipe.title, 'Bạn có muốn xóa công thức này không?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: () => deleteRecipe(recipe.id),
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📖 Sổ công thức</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => navigation.navigate('AddRecipe')}
          activeOpacity={0.8}
        >
          <Text style={styles.addBtnText}>＋ Thêm</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchWrapper}>
        <TextInput
          style={styles.searchInput}
          placeholder="🔍 Tìm công thức…"
          placeholderTextColor="#B0A090"
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
        />
      </View>

      {/* Recipe list */}
      {recipes.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🍳</Text>
          <Text style={styles.emptyTitle}>Chưa có công thức nào</Text>
          <Text style={styles.emptySubText}>
            Dán URL trang nấu ăn để thêm công thức vào đây
          </Text>
          <TouchableOpacity
            style={styles.emptyAddBtn}
            onPress={() => navigation.navigate('AddRecipe')}
          >
            <Text style={styles.emptyAddBtnText}>Thêm công thức</Text>
          </TouchableOpacity>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>
            Không tìm thấy công thức nào khớp với "{search}"
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <RecipeCard
              recipe={item}
              onLongPress={() => handleLongPress(item)}
            />
          )}
          ListFooterComponent={
            <Text style={styles.footer}>
              Nhấn giữ để xóa công thức
            </Text>
          }
        />
      )}
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
  addBtn: {
    backgroundColor: '#E8833A',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  searchWrapper: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  searchInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 11,
    fontSize: 14,
    color: '#3D2B1F',
    borderWidth: 1,
    borderColor: '#F0E6D3',
    shadowColor: '#3D2B1F',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  list: {
    paddingTop: 4,
    paddingBottom: 24,
  },
  footer: {
    textAlign: 'center',
    fontSize: 12,
    color: '#C0B0A0',
    marginTop: 16,
    marginBottom: 8,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#3D2B1F',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    color: '#7A6A5A',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyAddBtn: {
    backgroundColor: '#E8833A',
    paddingHorizontal: 28,
    paddingVertical: 13,
    borderRadius: 24,
    shadowColor: '#E8833A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyAddBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
