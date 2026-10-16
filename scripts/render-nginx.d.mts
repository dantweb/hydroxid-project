export interface InstanceTargets {
  instances: Record<string, { theme?: string; ports: Record<string, number> }>;
}
export function renderNginx(targets: InstanceTargets, targetName: string): string;
