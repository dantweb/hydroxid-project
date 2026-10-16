<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { emitConsentDefault } from './consentMode';
import { useConsentConfig } from './index';
import {
  OPEN_CONSENT_EVENT,
  OPTIONAL_CATEGORIES,
  type ConsentCategory,
  deniedCategories,
} from './policy';
import { useConsent } from './useConsent';

const { t } = useI18n();
const config = useConsentConfig();
const consent = useConsent();
const { shouldShowDialog, isDecided, categories } = consent;

const showCustomize = ref(false);
const selection = reactive(deniedCategories());
const dialog = ref<HTMLElement | null>(null);
const editable: ConsentCategory[] = ['necessary', ...OPTIONAL_CATEGORIES];
const showSettings = computed(
  () => config.showSettingsButton && isDecided.value && !shouldShowDialog.value,
);

function reopen(): void {
  consent.reopen();
}

onMounted(() => {
  consent.setConsentVersion(config.version);
  consent.hydrate();
  // nothing optional may fire before the visitor decides — and a returning visitor's choice is replayed
  emitConsentDefault();
  window.addEventListener(OPEN_CONSENT_EVENT, reopen);
});
onBeforeUnmount(() => window.removeEventListener(OPEN_CONSENT_EVENT, reopen));

// every time the dialog opens: start on layer 1 with the stored choice, focus the first action
watch(
  shouldShowDialog,
  async (open) => {
    if (!open) {
      return;
    }
    showCustomize.value = false;
    Object.assign(selection, categories.value);
    await nextTick();
    dialog.value?.querySelector<HTMLElement>('button')?.focus();
  },
  { immediate: true },
);

function toggle(category: ConsentCategory, event: Event): void {
  selection[category] = (event.target as HTMLInputElement).checked;
}

/** Tab stays inside the dialog while it is open (it is modal and cannot be dismissed undecided). */
function trapFocus(event: KeyboardEvent): void {
  if (event.key !== 'Tab' || !dialog.value) {
    return;
  }
  const focusable = [
    ...dialog.value.querySelectorAll<HTMLElement>('button, a[href], input:not([disabled])'),
  ];
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="shouldShowDialog"
      class="cc__backdrop"
      :class="{ 'cc__backdrop--bottom': config.position === 'bottom' }"
      data-testid="cookie-consent-backdrop"
    >
      <div
        ref="dialog"
        class="cc"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cc-title"
        data-testid="cookie-consent"
        @keydown="trapFocus"
      >
        <template v-if="!showCustomize">
          <h2 id="cc-title" class="cc__title">{{ t('gdpr-cookie-consent.title') }}</h2>
          <p class="cc__text">
            {{ t('gdpr-cookie-consent.summary') }}
            <a :href="config.privacyPolicyUrl" data-testid="cookie-policy-link">{{
              t('gdpr-cookie-consent.privacyLink')
            }}</a>
          </p>
          <p v-if="config.additionalText" class="cc__text" data-testid="cookie-additional-text">
            {{ config.additionalText }}
          </p>
          <div class="cc__actions">
            <button
              type="button"
              class="cc__btn cc__btn--primary"
              data-testid="cookie-accept-all"
              @click="consent.acceptAll()"
            >
              {{ t('gdpr-cookie-consent.acceptAll') }}
            </button>
            <button
              type="button"
              class="cc__btn cc__btn--primary"
              data-testid="cookie-reject-all"
              @click="consent.rejectAll()"
            >
              {{ t('gdpr-cookie-consent.rejectAll') }}
            </button>
            <button
              type="button"
              class="cc__btn"
              data-testid="cookie-customize"
              @click="showCustomize = true"
            >
              {{ t('gdpr-cookie-consent.customize') }}
            </button>
          </div>
        </template>

        <template v-else>
          <h2 id="cc-title" class="cc__title">{{ t('gdpr-cookie-consent.customizeTitle') }}</h2>
          <ul class="cc__categories">
            <li v-for="category in editable" :key="category">
              <label class="cc__label">
                <input
                  type="checkbox"
                  :checked="category === 'necessary' ? true : selection[category]"
                  :disabled="category === 'necessary'"
                  :data-testid="`cookie-toggle-${category}`"
                  @change="toggle(category, $event)"
                />
                <strong>{{ t(`gdpr-cookie-consent.categories.${category}.name`) }}</strong>
              </label>
              <p class="cc__purpose">
                {{ t(`gdpr-cookie-consent.categories.${category}.purpose`) }}
              </p>
            </li>
          </ul>
          <div class="cc__actions">
            <button
              type="button"
              class="cc__btn cc__btn--primary"
              data-testid="cookie-save"
              @click="consent.save(selection)"
            >
              {{ t('gdpr-cookie-consent.save') }}
            </button>
          </div>
        </template>
      </div>
    </div>

    <button
      v-if="showSettings"
      type="button"
      class="cc__settings"
      data-testid="cookie-settings"
      @click="reopen"
    >
      {{ t('gdpr-cookie-consent.settings') }}
    </button>
  </Teleport>
</template>

<style>
/* unscoped on purpose: the dialog is teleported to <body>; every colour is a theme token */
.cc__backdrop {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgb(0 0 0 / 55%);
}
.cc__backdrop--bottom {
  align-items: flex-end;
}
.cc {
  box-sizing: border-box;
  width: min(560px, 100%);
  max-height: 90vh;
  overflow: auto;
  padding: 24px;
  border: 2px solid var(--oxfe-color-primary, #000);
  border-radius: 12px;
  background: var(--oxfe-color-background, #fff);
  color: var(--oxfe-color-text, #000);
  font-family: var(--oxfe-font-family, sans-serif);
}
.cc__title {
  margin: 0 0 12px;
  font-family: var(--oxfe-font-heading, inherit);
}
.cc__text,
.cc__purpose {
  margin: 0 0 12px;
  line-height: 1.5;
}
.cc__purpose {
  margin: 4px 0 0 28px;
  color: var(--oxfe-color-text-muted, #555);
  font-size: 0.9rem;
}
.cc a {
  color: var(--oxfe-color-link, inherit);
}
.cc__categories {
  margin: 0 0 16px;
  padding: 0;
  list-style: none;
}
.cc__categories li {
  margin-bottom: 12px;
}
.cc__label {
  display: flex;
  align-items: center;
  gap: 10px;
}
.cc__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.cc__btn {
  padding: 10px 16px;
  border: 2px solid var(--oxfe-color-primary, #000);
  border-radius: 8px;
  background: transparent;
  color: var(--oxfe-color-primary, #000);
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}
.cc__btn--primary {
  background: var(--oxfe-color-primary, #000);
  color: var(--oxfe-color-primary-contrast, #fff);
}
.cc__btn:focus-visible,
.cc__settings:focus-visible {
  outline: 3px solid var(--oxfe-color-accent, #000);
  outline-offset: 2px;
}
.cc__settings {
  position: fixed;
  left: 16px;
  bottom: 16px;
  z-index: 1900;
  padding: 8px 14px;
  border: 2px solid var(--oxfe-color-primary, #000);
  border-radius: 999px;
  background: var(--oxfe-color-background, #fff);
  color: var(--oxfe-color-primary, #000);
  font: inherit;
  font-size: 0.85rem;
  cursor: pointer;
}
</style>
