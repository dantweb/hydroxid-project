// Single-file components imported from @dantweb/oxid-fe-user (plugin components a project wraps).
declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<object, object, unknown>;
  export default component;
}
