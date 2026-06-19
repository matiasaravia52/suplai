"use client"

import type { FieldEmployee } from "@suplai/types"

interface Props {
  employees: FieldEmployee[]
  selectedId?: string
  onSelect: (userId: string) => void
}

function timeAgo(dateStr: string): string {
  const diff = Math.round((Date.now() - new Date(dateStr).getTime()) / 60000)
  if (diff < 1) return "ahora"
  if (diff < 60) return `hace ${diff}m`
  return `hace ${Math.round(diff / 60)}h`
}

export function EmployeeList({ employees, selectedId, onSelect }: Props) {
  const active = employees.filter((e) => e.status?.current_lat != null)
  const inactive = employees.filter((e) => e.status?.current_lat == null)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b border-gray-200">
        <h2 className="font-semibold text-gray-900">Preventistas / Repartidores</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          {active.length} activo{active.length !== 1 ? "s" : ""} · {employees.length} total
        </p>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
        {active.map((employee) => (
          <EmployeeRow
            key={employee.id}
            employee={employee}
            selected={selectedId === employee.id}
            onSelect={onSelect}
          />
        ))}

        {inactive.length > 0 && (
          <>
            <div className="px-4 py-2 bg-gray-50">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Sin actividad</p>
            </div>
            {inactive.map((employee) => (
              <EmployeeRow
                key={employee.id}
                employee={employee}
                selected={selectedId === employee.id}
                onSelect={onSelect}
              />
            ))}
          </>
        )}

        {employees.length === 0 && (
          <div className="p-8 text-center text-gray-400">
            <p className="text-sm">No hay empleados de campo configurados</p>
          </div>
        )}
      </div>
    </div>
  )
}

function EmployeeRow({
  employee,
  selected,
  onSelect,
}: {
  employee: FieldEmployee
  selected: boolean
  onSelect: (id: string) => void
}) {
  const { status } = employee
  const enVisita = !!status?.visit_id
  const activo = status?.current_lat != null

  return (
    <button
      onClick={() => onSelect(employee.id)}
      className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${
        selected ? "bg-blue-50 border-l-2 border-blue-500" : ""
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0"
          style={{ background: enVisita ? "#16a34a" : activo ? "#6b7280" : "#e5e7eb" }}
        >
          {activo ? "👤" : "💤"}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{employee.nombre}</p>
          <p className="text-xs text-gray-500">
            {enVisita
              ? "En visita"
              : activo
              ? "En tránsito"
              : "Sin actividad hoy"}
          </p>
        </div>
        {status?.last_seen_at && (
          <span className="text-xs text-gray-400 flex-shrink-0">
            {timeAgo(status.last_seen_at)}
          </span>
        )}
      </div>
    </button>
  )
}
