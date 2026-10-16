<script setup lang="ts">
import PeroxidFooter from '@dantweb/oxid-fe-user/plugin-components/peroxid/components/PeroxidFooter.vue';
import { useI18n } from 'vue-i18n';
import { OPEN_CONSENT_EVENT } from '../gdpr-cookie-consent/policy';

const { t } = useI18n();

/** Re-opens the cookie dialog of the gdpr-cookie-consent plugin (a no-op where it is not enabled). */
function openCookieSettings(): void {
  window.dispatchEvent(new CustomEvent(OPEN_CONSENT_EVENT));
}
</script>

<template>
  <div data-testid="hx-footer">
    <PeroxidFooter />
    <div class="hx-footer__legal">
      <a href="/privacy">{{ t('peroxid.footer.privacy') }}</a>
      <button type="button" data-testid="hx-cookie-settings" @click="openCookieSettings">
        {{ t('peroxid.footer.cookies') }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.hx-footer__legal {
  display: flex;
  justify-content: center;
  gap: 24px;
  padding: 0 0 28px;
  background: var(--oxfe-color-surface);
}
.hx-footer__legal a,
.hx-footer__legal button {
  color: var(--oxfe-color-link);
  font: inherit;
  font-size: 0.78rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}
.hx-footer__legal button {
  padding: 0;
  border: 0;
  background: none;
  text-decoration: underline;
  cursor: pointer;
}
</style>
