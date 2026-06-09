import { adminApi, type Studio, type StudioPayload } from "@/api/admin"
import { FileUploadForm } from "@/components/admin/file-upload-form"
import { ImageFileField, TextField } from "@/components/admin/form-fields"
import { AdminResourcePage, type ResourceFormProps } from "@/components/admin/resource-page"
import { useDocumentTitle } from "@/hooks/use-document-title"
import { formatDateTime, nullableString } from "@/lib/admin-form"

type StudioForm = {
  logo: string
  logoFile: File | null
}

const emptyStudioForm: StudioForm = {
  logo: "",
  logoFile: null,
}

export default function AdminStudiosPage() {
  useDocumentTitle("Студии — Админ-панель")

  return (
    <AdminResourcePage<Studio, StudioForm, StudioPayload, StudioPayload>
      resourceKey="admin-studios"
      title="Студии"
      description="CRUD для записей studio."
      createLabel="Создать студию"
      editLabel="Редактировать студию"
      emptyText="Студии не найдены"
      initialForm={emptyStudioForm}
      sortOptions={[{ label: "ID", value: "id" }]}
      defaultSortBy="id"
      columns={[
        { header: "ID", className: "w-20 text-muted-foreground", render: (item) => item.id },
        {
          header: "Логотип",
          render: (item) =>
            item.logo ? (
              <a className="text-primary underline-offset-4 hover:underline" href={item.logo} target="_blank" rel="noreferrer">
                {item.logo}
              </a>
            ) : (
              "—"
            ),
        },
        { header: "Обновлено", render: (item) => formatDateTime(item.updatedAt) },
      ]}
      getId={(item) => item.id}
      getTitle={(item) => `Studio #${item.id}`}
      list={adminApi.listStudios}
      create={adminApi.createStudio}
      afterCreate={(item, form) =>
        form.logoFile ? adminApi.uploadStudioLogo(item.id, form.logoFile).then(() => undefined) : Promise.resolve()
      }
      update={adminApi.updateStudio}
      remove={adminApi.deleteStudio}
      toForm={(item) => ({ logo: item.logo ?? "", logoFile: null })}
      buildCreatePayload={buildStudioPayload}
      buildUpdatePayload={buildStudioPayload}
      renderForm={(props) => <StudioFormFields {...props} />}
      renderFormExtra={({ editingItem, disabled, refresh }) =>
        editingItem ? (
          <FileUploadForm
            label="Загрузить logo"
            disabled={disabled}
            onUpload={(file) => adminApi.uploadStudioLogo(editingItem.id, file)}
            onSuccess={refresh}
          />
        ) : null
      }
    />
  )
}

function StudioFormFields({ value, disabled, isEditing, onChange }: ResourceFormProps<StudioForm>) {
  return (
    <>
      <TextField
        label="Logo URL"
        value={value.logo}
        disabled={disabled}
        onValueChange={(logo) => onChange({ logo })}
      />
      {!isEditing && (
        <ImageFileField
          label="Logo"
          description="JPEG, PNG или WebP, до 10 МБ. Выбранный файл имеет приоритет над URL."
          value={value.logoFile}
          disabled={disabled}
          onFileChange={(logoFile) => onChange({ logoFile })}
        />
      )}
    </>
  )
}

function buildStudioPayload(form: StudioForm): StudioPayload {
  return {
    logo: nullableString(form.logo),
  }
}
