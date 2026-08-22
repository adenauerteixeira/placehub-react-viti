import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { PERMISSION_MODULES } from './permissions'

export function PermissionCheckboxes({
  selected,
  onChange,
}: {
  selected: string[]
  onChange: (next: string[]) => void
}) {
  function toggle(key: string, checked: boolean) {
    onChange(checked ? [...selected, key] : selected.filter((k) => k !== key))
  }

  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
      {PERMISSION_MODULES.map((module) => (
        <div key={module.key} className="flex items-center gap-2">
          <Checkbox
            id={`perm-${module.key}`}
            checked={selected.includes(module.key)}
            onCheckedChange={(checked) => toggle(module.key, checked === true)}
          />
          <Label htmlFor={`perm-${module.key}`} className="text-sm font-normal">
            {module.label}
          </Label>
        </div>
      ))}
    </div>
  )
}
