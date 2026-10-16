<script setup lang="ts">
import { CoreEvents } from '@dantweb/oxid-fe-core';
import { computed, onBeforeUnmount, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { useLayoutContext } from './index';

const { t } = useI18n();
const router = useRouter();
const { auth, events, registry } = useLayoutContext();

const authenticated = ref(auth.isAuthenticated());
const refresh = (): void => {
  authenticated.value = auth.isAuthenticated();
};
const off = [CoreEvents.AuthLogin, CoreEvents.AuthLogout, CoreEvents.SessionExpired].map((event) =>
  events.on(event, refresh),
);
onBeforeUnmount(() => off.forEach((unsubscribe) => unsubscribe()));

const navItems = computed(() =>
  registry.navItems.filter((item) => !item.requiresAuth || authenticated.value),
);

function logout(): void {
  auth.logout();
  void router.push('/');
}
</script>

<template>
  <header class="hx-header" data-testid="hx-header">
    <div class="hx-header__inner">
      <router-link to="/" class="hx-header__brand" data-testid="hx-brand">
        <span class="hx-header__drop" aria-hidden="true"></span>{{ t('hydroxid-layout.brand') }}
      </router-link>
      <nav class="hx-header__nav" :aria-label="t('hydroxid-layout.brand')">
        <router-link v-for="item in navItems" :key="item.to" :to="item.to">{{
          t(item.labelKey)
        }}</router-link>
        <button
          v-if="authenticated"
          type="button"
          class="btn btn-outline-primary btn-sm"
          data-testid="hx-logout"
          @click="logout"
        >
          {{ t('hydroxid-layout.logout') }}
        </button>
        <router-link v-else to="/login" class="btn btn-primary btn-sm" data-testid="hx-login">{{
          t('hydroxid-layout.login')
        }}</router-link>
      </nav>
    </div>
  </header>
</template>

<style scoped>
.hx-header {
  border-bottom: 3px solid var(--oxfe-color-primary);
  background: var(--oxfe-color-background);
}
.hx-header__inner {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px 24px;
  width: min(1200px, 100% - 32px);
  margin: 0 auto;
  padding: 14px 0;
}
.hx-header__brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: var(--oxfe-color-text);
  font-family: var(--oxfe-font-heading, inherit);
  font-size: 1.6rem;
  font-weight: 800;
  letter-spacing: 0.02em;
  text-decoration: none;
}
.hx-header__drop {
  width: 18px;
  height: 18px;
  border-radius: 50% 50% 50% 0;
  background: var(--oxfe-color-accent);
  transform: rotate(-45deg);
}
.hx-header__nav {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 16px;
}
.hx-header__nav a:not(.btn) {
  color: var(--oxfe-color-text);
  font-weight: 600;
  text-decoration: none;
}
.hx-header__nav a:not(.btn):hover {
  color: var(--oxfe-color-primary);
  text-decoration: underline;
}
</style>
