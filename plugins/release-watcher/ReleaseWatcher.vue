<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useWatcherConfig } from './index';
import { isNewRelease, mayReloadHere, runningBundle } from './watcher';

const { t } = useI18n();
const config = useWatcherConfig();
const available = ref(false);
let timer: ReturnType<typeof setInterval> | undefined;
const running = runningBundle(document);

async function check(): Promise<void> {
  if (available.value || document.visibilityState !== 'visible') {
    return;
  }
  try {
    // index.html is served `no-cache`; the query string keeps any intermediary from answering for it
    const response = await fetch(`/?release-check=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok || !isNewRelease(running, await response.text())) {
      return;
    }
    if (config.autoReload && mayReloadHere(window.location.pathname)) {
      window.location.reload();
    } else {
      available.value = true;
    }
  } catch {
    // offline or a blip: try again on the next tick
  }
}

const onVisible = (): void => void check();
const reload = (): void => window.location.reload();

onMounted(() => {
  timer = setInterval(() => void check(), config.intervalSeconds * 1000);
  document.addEventListener('visibilitychange', onVisible);
});
onBeforeUnmount(() => {
  clearInterval(timer);
  document.removeEventListener('visibilitychange', onVisible);
});
</script>

<template>
  <div v-if="available" class="rw" role="status" data-testid="release-banner">
    <span>{{ t('release-watcher.available') }}</span>
    <button
      type="button"
      class="btn btn-primary btn-sm"
      data-testid="release-refresh"
      @click="reload"
    >
      {{ t('release-watcher.refresh') }}
    </button>
  </div>
</template>

<style scoped>
.rw {
  position: fixed;
  right: 16px;
  bottom: 16px;
  left: 16px;
  z-index: 1800;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  border: 2px solid var(--oxfe-color-primary);
  border-radius: 12px;
  background: var(--oxfe-color-background);
  color: var(--oxfe-color-text);
  font-family: var(--oxfe-font-family);
}
@media (min-width: 700px) {
  .rw {
    left: auto;
    max-width: 420px;
  }
}
</style>
