import type { ModuleManifest } from "@suplai/module-sdk"

const registry = new Map<string, ModuleManifest>()

export const ModuleRegistry = {
  register(manifest: ModuleManifest): void {
    registry.set(manifest.id, manifest)
  },

  get(id: string): ModuleManifest | undefined {
    return registry.get(id)
  },

  getAll(): ModuleManifest[] {
    return Array.from(registry.values())
  },

  getActive(moduleIds: string[]): ModuleManifest[] {
    return moduleIds.flatMap((id) => {
      const m = registry.get(id)
      return m ? [m] : []
    })
  },
}
