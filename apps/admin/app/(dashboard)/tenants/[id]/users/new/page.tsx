import { notFound } from "next/navigation"
import { getTenant } from "@/actions/tenants"
import NewUserForm from "./form"

export default async function NewUserPage({ params }: { params: Promise<{ id: string }> }): Promise<React.ReactElement> {
  const { id } = await params
  const tenant = await getTenant(id)
  if (!tenant) notFound()

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Nuevo usuario</h1>
        <p className="text-sm text-gray-500 mt-1">{tenant.nombre}</p>
      </div>
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <NewUserForm tenantId={id} schemaName={tenant.schema_name} />
      </div>
    </div>
  )
}
