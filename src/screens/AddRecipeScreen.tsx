import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { parseRecipeFromUrl } from '../services/recipeParser';
import { useRecipeStore } from '../store/recipeStore';
import { Recipe } from '../types';

export default function AddRecipeScreen() {
  const navigation = useNavigation();
  const addRecipe = useRecipeStore((s) => s.addRecipe);

  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<Recipe | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFetch() {
    if (!url.trim()) return;
    setLoading(true);
    setPreview(null);
    setError(null);

    try {
      const recipe = await parseRecipeFromUrl(url.trim());
      setPreview(recipe);
    } catch (err) {
      setError((err as Error).message || 'Không thể lấy công thức');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!preview) return;
    await addRecipe(preview);
    Alert.alert('Đã lưu', `Đã thêm "${preview.title}" vào sổ công thức!`, [
      { text: 'OK', onPress: () => navigation.goBack() },
    ]);
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* URL Input Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Nhập URL trang nấu ăn</Text>
            <Text style={styles.sectionSubText}>
              Hỗ trợ URL trang công thức như Cookpad, Rakuten Recipe, Kurashiru, v.v.
            </Text>

            <View style={styles.inputRow}>
              <TextInput
                style={styles.urlInput}
                placeholder="https://cookpad.com/recipe/..."
                placeholderTextColor="#B0A090"
                value={url}
                onChangeText={(v) => {
                  setUrl(v);
                  setError(null);
                  setPreview(null);
                }}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                returnKeyType="done"
                onSubmitEditing={handleFetch}
              />
            </View>

            <TouchableOpacity
              style={[styles.fetchBtn, !url.trim() && styles.fetchBtnDisabled]}
              onPress={handleFetch}
              disabled={!url.trim() || loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.fetchBtnText}>🔍 Lấy công thức</Text>
              )}
            </TouchableOpacity>

            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>⚠️ {error}</Text>
              </View>
            ) : null}
          </View>

          {/* Preview Section */}
          {preview ? (
            <View style={styles.previewSection}>
              <Text style={styles.previewLabel}>Kết quả</Text>
              <View style={styles.previewCard}>
                {preview.image ? (
                  <Image
                    source={{ uri: preview.image }}
                    style={styles.previewImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={[styles.previewImage, styles.previewImagePlaceholder]}>
                    <Text style={styles.previewImageEmoji}>🍽️</Text>
                  </View>
                )}
                <View style={styles.previewInfo}>
                  <Text style={styles.previewTitle}>{preview.title}</Text>
                  {preview.description ? (
                    <Text style={styles.previewDesc} numberOfLines={3}>
                      {preview.description}
                    </Text>
                  ) : null}

                  <View style={styles.previewMeta}>
                    {preview.cookingTime ? (
                      <View style={styles.metaChip}>
                        <Text style={styles.metaChipText}>
                          ⏱ {preview.cookingTime}
                        </Text>
                      </View>
                    ) : null}
                    {preview.servings ? (
                      <View style={styles.metaChip}>
                        <Text style={styles.metaChipText}>
                          👥 {preview.servings}
                        </Text>
                      </View>
                    ) : null}
                    {preview.ingredients && preview.ingredients.length > 0 ? (
                      <View style={styles.metaChip}>
                        <Text style={styles.metaChipText}>
                          🥕 {preview.ingredients.length} nguyên liệu
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  {preview.ingredients && preview.ingredients.length > 0 ? (
                    <View style={styles.ingredientsBox}>
                      <Text style={styles.ingredientsTitle}>Nguyên liệu</Text>
                      <Text style={styles.ingredientsText}>
                        {preview.ingredients.slice(0, 8).join('、')}
                        {preview.ingredients.length > 8 ? '…' : ''}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>

              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSave}
                activeOpacity={0.85}
              >
                <Text style={styles.saveBtnText}>✅ Lưu vào sổ công thức</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {/* Tips */}
          {!preview && !loading && (
            <View style={styles.tips}>
              <Text style={styles.tipsTitle}>Ví dụ trang hỗ trợ</Text>
              {[
                { name: 'Cookpad', url: 'cookpad.com' },
                { name: 'Rakuten Recipe', url: 'recipe.rakuten.co.jp' },
                { name: 'Kurashiru', url: 'kurashiru.com' },
                { name: 'Delish Kitchen', url: 'delishkitchen.tv' },
                { name: 'NHK Kyou no Ryouri', url: 'nhk.or.jp/cook' },
              ].map((site) => (
                <View key={site.name} style={styles.tipRow}>
                  <Text style={styles.tipBullet}>•</Text>
                  <Text style={styles.tipText}>
                    <Text style={styles.tipName}>{site.name}</Text>
                    {'  '}
                    <Text style={styles.tipUrl}>{site.url}</Text>
                  </Text>
                </View>
              ))}
              <Text style={styles.tipsNote}>
                ※ Hoạt động với hầu hết các trang công thức hỗ trợ schema.org/Recipe hoặc thẻ OGP
              </Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFBF5',
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#3D2B1F',
    marginBottom: 6,
  },
  sectionSubText: {
    fontSize: 13,
    color: '#7A6A5A',
    lineHeight: 18,
    marginBottom: 16,
  },
  inputRow: {
    marginBottom: 12,
  },
  urlInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 14,
    color: '#3D2B1F',
    borderWidth: 1.5,
    borderColor: '#F0E6D3',
  },
  fetchBtn: {
    backgroundColor: '#E8833A',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#E8833A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  fetchBtnDisabled: {
    backgroundColor: '#D0C0B0',
    shadowOpacity: 0,
    elevation: 0,
  },
  fetchBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  errorBox: {
    marginTop: 12,
    backgroundColor: '#FFF0EE',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FFCCCC',
  },
  errorText: {
    fontSize: 13,
    color: '#CC4433',
    lineHeight: 18,
  },
  previewSection: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  previewLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9A8A7A',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  previewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#3D2B1F',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
    marginBottom: 16,
  },
  previewImage: {
    width: '100%',
    height: 180,
    backgroundColor: '#F5EBE0',
  },
  previewImagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewImageEmoji: {
    fontSize: 56,
  },
  previewInfo: {
    padding: 16,
  },
  previewTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#3D2B1F',
    lineHeight: 24,
    marginBottom: 6,
  },
  previewDesc: {
    fontSize: 13,
    color: '#7A6A5A',
    lineHeight: 18,
    marginBottom: 10,
  },
  previewMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  metaChip: {
    backgroundColor: '#FFF3E8',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  metaChipText: {
    fontSize: 12,
    color: '#E8833A',
    fontWeight: '600',
  },
  ingredientsBox: {
    backgroundColor: '#FFFBF5',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F0E6D3',
  },
  ingredientsTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9A8A7A',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  ingredientsText: {
    fontSize: 13,
    color: '#3D2B1F',
    lineHeight: 18,
  },
  saveBtn: {
    backgroundColor: '#4CAF50',
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  tips: {
    margin: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#F0E6D3',
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#3D2B1F',
    marginBottom: 12,
  },
  tipRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  tipBullet: {
    fontSize: 14,
    color: '#E8833A',
    marginRight: 8,
    lineHeight: 20,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
  },
  tipName: {
    fontWeight: '600',
    color: '#3D2B1F',
  },
  tipUrl: {
    color: '#9A8A7A',
  },
  tipsNote: {
    marginTop: 12,
    fontSize: 11,
    color: '#B0A090',
    lineHeight: 16,
  },
});
