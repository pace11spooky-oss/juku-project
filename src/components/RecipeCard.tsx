import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Recipe } from '../types';

interface RecipeCardProps {
  recipe: Recipe;
  onPress?: () => void;
  onLongPress?: () => void;
  compact?: boolean;
}

const { width } = Dimensions.get('window');

export default function RecipeCard({
  recipe,
  onPress,
  onLongPress,
  compact = false,
}: RecipeCardProps) {
  if (compact) {
    return (
      <TouchableOpacity
        style={styles.compactCard}
        onPress={onPress}
        onLongPress={onLongPress}
        activeOpacity={0.75}
      >
        {recipe.image ? (
          <Image
            source={{ uri: recipe.image }}
            style={styles.compactImage}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.compactImage, styles.compactImagePlaceholder]}>
            <Text style={styles.placeholderEmoji}>🍽️</Text>
          </View>
        )}
        <View style={styles.compactInfo}>
          <Text style={styles.compactTitle} numberOfLines={2}>
            {recipe.title}
          </Text>
          {recipe.cookingTime ? (
            <Text style={styles.compactMeta}>⏱ {recipe.cookingTime}</Text>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.8}
    >
      {recipe.image ? (
        <Image
          source={{ uri: recipe.image }}
          style={styles.image}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.image, styles.imagePlaceholder]}>
          <Text style={styles.placeholderEmojiBig}>🍽️</Text>
        </View>
      )}
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>
          {recipe.title}
        </Text>
        {recipe.description ? (
          <Text style={styles.description} numberOfLines={2}>
            {recipe.description}
          </Text>
        ) : null}
        <View style={styles.meta}>
          {recipe.cookingTime ? (
            <View style={styles.metaChip}>
              <Text style={styles.metaText}>⏱ {recipe.cookingTime}</Text>
            </View>
          ) : null}
          {recipe.servings ? (
            <View style={styles.metaChip}>
              <Text style={styles.metaText}>👥 {recipe.servings}</Text>
            </View>
          ) : null}
          {recipe.ingredients && recipe.ingredients.length > 0 ? (
            <View style={styles.metaChip}>
              <Text style={styles.metaText}>
                🥕 材料{recipe.ingredients.length}種
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    overflow: 'hidden',
    shadowColor: '#3D2B1F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  image: {
    width: '100%',
    height: 160,
    backgroundColor: '#F5EBE0',
  },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderEmojiBig: {
    fontSize: 48,
  },
  info: {
    padding: 14,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#3D2B1F',
    marginBottom: 4,
    lineHeight: 22,
  },
  description: {
    fontSize: 13,
    color: '#7A6A5A',
    lineHeight: 18,
    marginBottom: 8,
  },
  meta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  metaChip: {
    backgroundColor: '#FFF3E8',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  metaText: {
    fontSize: 11,
    color: '#E8833A',
    fontWeight: '600',
  },
  // Compact styles
  compactCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 4,
    overflow: 'hidden',
    shadowColor: '#3D2B1F',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  compactImage: {
    width: 64,
    height: 64,
    backgroundColor: '#F5EBE0',
  },
  compactImagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactInfo: {
    flex: 1,
    padding: 10,
    justifyContent: 'center',
  },
  compactTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3D2B1F',
    lineHeight: 18,
  },
  compactMeta: {
    fontSize: 11,
    color: '#E8833A',
    marginTop: 3,
  },
  placeholderEmoji: {
    fontSize: 28,
  },
});
