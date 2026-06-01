# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**献立アプリ (Juku)** is a React Native Expo mobile app for weekly meal planning. Users import recipes from URLs, then the app (optionally via Claude AI) generates a balanced weekly meal schedule.

The app runs on iOS, Android, and web via Expo. It uses the Claude API (`claude-sonnet-4-6`) for AI meal plan generation and scrapes recipe metadata from cooking sites.

## Development Commands

```bash
npm start          # Start Expo dev server (scan QR code with Expo Go)
npm run android    # Launch on Android emulator
npm run ios        # Launch on iOS simulator
npm run web        # Launch in browser
```

**Environment setup**: Copy `.env.example` to `.env` and set `EXPO_PUBLIC_CLAUDE_API_KEY`.

**Android builds** (requires EAS CLI and `EXPO_TOKEN`):
```bash
eas build --platform android --profile preview    # APK for testing
eas build --platform android --profile production # App bundle for Play Store
```

There are no linting scripts or test suites configured — `npm start` is the primary development workflow.

## Architecture

### State Management
Two Zustand stores handle all app state, both backed by `AsyncStorage`:

- **`recipeStore`** (`src/store/recipeStore.ts`) — CRUD for the user's recipe collection. Key: `@juku:recipes`.
- **`mealPlanStore`** (`src/store/mealPlanStore.ts`) — Current week's plan (Monday-anchored). Key: `@juku:mealPlan`. The `applyGeneratedPlan()` action bridges AI output to stored state.

Both stores are initialized in `App.tsx` on mount via `loadRecipes()` and `loadPlan()`.

### Data Flow

```
URL input → recipeParser.ts (scrape + parse) → recipeStore (AsyncStorage)
                                                      ↓
                                             aiService.ts (Claude API)
                                                      ↓
                                         mealPlanStore.applyGeneratedPlan()
                                                      ↓
                                            HomeScreen → WeeklyCalendar
```

### Recipe Parsing (`src/services/recipeParser.ts`)
Parses recipe metadata from any URL in this priority order:
1. JSON-LD schema.org/Recipe — richest source
2. Open Graph meta tags
3. HTML `<title>` tag
4. URL string as fallback

Uses `User-Agent` spoofing for broader site compatibility. Handles ISO 8601 duration strings (e.g. `PT1H30M` → `1時間30分`).

### AI Integration (`src/services/aiService.ts`)
Calls Claude with a structured prompt that returns a JSON weekly plan. Key behaviors:
- System prompt enforces nutritional rules, no consecutive duplicates, weekday/weekend meal weight differences
- Parses both code-fenced and bare JSON responses
- Sanitizes output: only applies recipe IDs that exist in the store
- Uses `dangerouslyAllowBrowser: true` in SDK config (required for Expo web)

### Navigation (`src/navigation/AppNavigator.tsx`)
- **Bottom tabs**: `Home` (calendar view) + `RecipeBook` (recipe list)
- **Modal stack screens**: `AddRecipe` + `AIGenerate` — pushed over the tab navigator

### Type System (`src/types/index.ts`)
All shared types live here. Key constraints:
- `DayOfWeek`: `'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'`
- `MealType`: `'breakfast' | 'lunch' | 'dinner'`
- `WeeklyPlan.weekStart` is an ISO date string for the Monday of that week

### Path Alias
`@/*` maps to `./src/*` (configured in `tsconfig.json` and `babel.config.js`).

## Design System

All UI uses a consistent warm-toned palette — do not introduce arbitrary colors:

| Role | Value |
|---|---|
| Background | `#FFFBF5` |
| Accent (orange) | `#E8833A` |
| Accent light | `#FFF0E6` |
| Text (dark brown) | `#3D2B1F` |
| Muted text | `#9A8A7A` |
| Saturday | `#3355CC` |
| Sunday | `#CC3333` |

## Expo Snack Version

`App.snack.js` is a self-contained single-file version of the entire app for the [Expo Snack](https://snack.expo.dev) platform. It duplicates logic from `src/` intentionally — keep it in sync manually when making significant feature changes to the structured version.

## CI/CD

`.github/workflows/build-android.yml` triggers manually (`workflow_dispatch`) and builds an Android APK via EAS. Requires `EXPO_TOKEN` as a GitHub Actions secret.
