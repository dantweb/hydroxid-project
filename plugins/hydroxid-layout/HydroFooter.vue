<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { OPEN_CONSENT_EVENT } from '../gdpr-cookie-consent/policy';

const { t } = useI18n();
const year = new Date().getFullYear();

/** Re-opens the cookie dialog of the gdpr-cookie-consent plugin (a no-op where it is not enabled). */
function openCookieSettings(): void {
  window.dispatchEvent(new CustomEvent(OPEN_CONSENT_EVENT));
}
</script>

<template>
  <footer class="hx-footer" data-testid="hx-footer">
    <div class="hx-footer__inner">
      <strong>{{ t('hydroxid-layout.brand') }}</strong>
      <span>{{ t('hydroxid-layout.tagline') }}</span>
      <nav class="hx-footer__links">
        <router-link to="/shop">{{ t('hydroxid-layout.footer.shop') }}</router-link>
        <a href="/privacy">{{ t('hydroxid-layout.footer.privacy') }}</a>
        <button type="button" data-testid="hx-cookie-settings" @click="openCookieSettings">
          {{ t('hydroxid-layout.footer.cookies') }}
        </button>
      </nav>
      <small
        >© {{ year }} {{ t('hydroxid-layout.brand') }} ·
        {{ t('hydroxid-layout.footer.rights') }}</small
      >
    </div>
  </footer>
</template>

<style scoped>
.hx-footer {
  margin-top: 56px;
  border-top: 3px solid var(--oxfe-color-primary);
  background: var(--oxfe-color-surface);
  color: var(--oxfe-color-text);
}
.hx-footer__inner {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px 28px;
  width: min(1200px, 100% - 32px);
  margin: 0 auto;
  padding: 28px 0;
}
.hx-footer__links {
  display: flex;
  flex-wrap: wrap;
  gap: 18px;
}
.hx-footer a,
.hx-footer button {
  color: var(--oxfe-color-link);
  font: inherit;
  font-weight: 600;
}
.hx-footer button {
  padding: 0;
  border: 0;
  background: none;
  text-decoration: underline;
  cursor: pointer;
}
</style>
