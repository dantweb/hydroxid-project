/**
 * `useConsent` — the single source of truth for the cookie decision, shared by the dialog, the
 * settings button and the Consent Mode bridge. Module-singleton reactive state, hydrated from
 * localStorage and written on every decision. Swap `loadRecord` / `persist` for an API call to
 * keep the record server-side without touching the UI.
 */
import { computed, reactive, type ComputedRef } from 'vue';
import { emitConsentUpdate } from './consentMode';
import {
  CONSENT_STORAGE_KEY,
  OPTIONAL_CATEGORIES,
  deniedCategories,
  grantedCategories,
  type ConsentCategories,
  type ConsentCategory,
  type ConsentMethod,
  type ConsentRecord,
} from './policy';

interface ConsentState {
  record: ConsentRecord | null;
  configuredVersion: number;
  reopened: boolean;
}

function loadRecord(): ConsentRecord | null {
  try {
    const raw = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as ConsentRecord;
    return parsed && typeof parsed.version === 'number' && parsed.categories ? parsed : null;
  } catch {
    return null;
  }
}

const state = reactive<ConsentState>({
  record: loadRecord(),
  configuredVersion: 1,
  reopened: false,
});

function makeRecord(method: ConsentMethod, categories: ConsentCategories): ConsentRecord {
  return {
    version: state.configuredVersion,
    decidedAt: new Date().toISOString(),
    method,
    // strictly necessary can never be written off
    categories: { ...categories, necessary: true },
  };
}

function persist(record: ConsentRecord): void {
  state.record = record;
  state.reopened = false;
  try {
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(record));
  } catch {
    // storage unavailable: the in-memory state still drives this session
  }
  emitConsentUpdate(record.categories);
}

export interface UseConsent {
  needsDecision: ComputedRef<boolean>;
  isDecided: ComputedRef<boolean>;
  shouldShowDialog: ComputedRef<boolean>;
  categories: ComputedRef<ConsentCategories>;
  granted(category: ConsentCategory): boolean;
  acceptAll(): void;
  rejectAll(): void;
  save(selected: Partial<ConsentCategories>): void;
  reopen(): void;
  setConsentVersion(version: number): void;
  hydrate(): void;
}

export function useConsent(): UseConsent {
  const needsDecision = computed(
    () => !state.record || state.record.version < state.configuredVersion,
  );

  return {
    needsDecision,
    isDecided: computed(() => !needsDecision.value),
    shouldShowDialog: computed(() => needsDecision.value || state.reopened),
    categories: computed(() => state.record?.categories ?? deniedCategories()),
    granted: (category) => category === 'necessary' || state.record?.categories[category] === true,
    acceptAll: () => persist(makeRecord('accept_all', grantedCategories())),
    rejectAll: () => persist(makeRecord('reject_all', deniedCategories())),
    save(selected) {
      const next = deniedCategories();
      for (const category of OPTIONAL_CATEGORIES) {
        next[category] = selected[category] === true;
      }
      persist(makeRecord('custom', next));
    },
    reopen() {
      state.reopened = true;
    },
    setConsentVersion(version) {
      if (version > 0) {
        state.configuredVersion = version;
      }
    },
    hydrate() {
      state.record = loadRecord();
    },
  };
}
