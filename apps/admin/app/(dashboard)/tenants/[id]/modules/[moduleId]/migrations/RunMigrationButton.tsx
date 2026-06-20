"use client"

import { useState } from "react"
import type { ReactElement } from "react"
import { runMigration } from "@/actions/tenants"

export function RunMigrationButton({
  tenantId,
  moduleId,
  migrationName,
  applied,
}: {
  tenantId: string
  moduleId: string
  migrationName: string
  applied: boolean
}): ReactElement | null {
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const handleRun = async () => {
    setLoading(true)
    try {
      await runMigration(tenantId, moduleId, migrationName)
      setDone(true)
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al correr migración")
    } finally {
      setLoading(false)
    }
  }

  if (applied || done) return null

  return (
    <button
      onClick={handleRun}
      disabled={loading}
      className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
    >
      {loading ? "Corriendo..." : "Correr"}
    </button>
  )
}
