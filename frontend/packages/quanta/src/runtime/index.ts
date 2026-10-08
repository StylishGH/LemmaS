export { bootstrapScript } from './bootstrap.js'
export type { BootstrapOptions } from './bootstrap.js'

export { readInitialThemeState, ThemeController } from './controller.js'
export type {
  ReadInitialThemeStateOptions,
  ThemeControllerOptions,
  ThemePref,
  ThemeState,
  ThemeSubscriber,
} from './controller.js'

export {
  defineTheme,
  hasTheme,
  hydratePersistedThemes,
  listThemes,
  removeTheme,
} from './define-theme.js'
export type {
  DefineThemeOptions,
  HydrateOptions,
  RemoveThemeOptions,
  ThemeTokens,
} from './define-theme.js'

export {
  localStorageAdapter,
  memoryStorage,
  sessionStorageAdapter,
  urlAdapter,
} from './storage.js'
export type { ThemeStorage, UrlAdapterOptions } from './storage.js'
