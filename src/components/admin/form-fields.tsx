import type { ChangeEvent, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

type BaseFieldProps = {
  label: string
  description?: string
  className?: string
}

type TextFieldProps = BaseFieldProps & {
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  required?: boolean
  disabled?: boolean
  type?: InputHTMLAttributes<HTMLInputElement>["type"]
}

export function TextField({
  label,
  description,
  className,
  value,
  onValueChange,
  type = "text",
  ...props
}: TextFieldProps) {
  return (
    <FieldFrame label={label} description={description} className={className}>
      <Input
        type={type}
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        {...props}
      />
    </FieldFrame>
  )
}

type NumberFieldProps = Omit<TextFieldProps, "type">

export function NumberField(props: NumberFieldProps) {
  return <TextField type="number" {...props} />
}

type TextareaFieldProps = BaseFieldProps & {
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  required?: boolean
  disabled?: boolean
  rows?: number
}

export function TextareaField({
  label,
  description,
  className,
  value,
  onValueChange,
  rows = 4,
  ...props
}: TextareaFieldProps) {
  return (
    <FieldFrame label={label} description={description} className={className}>
      <textarea
        value={value}
        rows={rows}
        onChange={(event) => onValueChange(event.target.value)}
        className={cn(
          "w-full min-w-0 rounded-3xl border border-transparent bg-input/50 px-3 py-2 text-base transition-[color,box-shadow,background-color] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        )}
        {...props}
      />
    </FieldFrame>
  )
}

type SelectOption = {
  label: string
  value: string
}

type SelectFieldProps = BaseFieldProps & {
  value: string
  onValueChange: (value: string) => void
  options: SelectOption[]
  disabled?: boolean
} & Pick<SelectHTMLAttributes<HTMLSelectElement>, "required">

export function SelectField({
  label,
  description,
  className,
  value,
  onValueChange,
  options,
  ...props
}: SelectFieldProps) {
  return (
    <FieldFrame label={label} description={description} className={className}>
      <select
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        className="h-9 w-full rounded-3xl border border-transparent bg-input/50 px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FieldFrame>
  )
}

type CheckboxFieldProps = BaseFieldProps & {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
}

export function CheckboxField({
  label,
  description,
  className,
  checked,
  onCheckedChange,
  disabled,
}: CheckboxFieldProps) {
  return (
    <label className={cn("flex items-start gap-3 text-sm", className)}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onCheckedChange(event.target.checked)}
        className="mt-1 size-4 rounded border-border accent-primary"
      />
      <span className="grid gap-1">
        <span className="font-medium">{label}</span>
        {description && (
          <span className="text-muted-foreground">
            {description}
          </span>
        )}
      </span>
    </label>
  )
}

type FileInputProps = BaseFieldProps & {
  inputKey: number
  accept?: string
  disabled?: boolean
  onFileChange: (file: File | null) => void
}

export function FileInput({
  label,
  description,
  className,
  inputKey,
  accept = "image/jpeg,image/png,image/webp",
  disabled,
  onFileChange,
}: FileInputProps) {
  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    onFileChange(event.target.files?.[0] ?? null)
  }

  return (
    <FieldFrame label={label} description={description} className={className}>
      <Input
        key={inputKey}
        type="file"
        accept={accept}
        disabled={disabled}
        onChange={handleChange}
      />
    </FieldFrame>
  )
}

function FieldFrame({
  label,
  description,
  className,
  children,
}: BaseFieldProps & { children: ReactNode }) {
  return (
    <div className={cn("grid gap-2", className)}>
      <Label>{label}</Label>
      {children}
      {description && (
        <p className="text-xs leading-relaxed text-muted-foreground">
          {description}
        </p>
      )}
    </div>
  )
}
