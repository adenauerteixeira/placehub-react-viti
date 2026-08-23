import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { useAmenitiesCatalog } from './api'

export function AmenityCheckboxes({
  selected,
  onChange,
}: {
  selected: string[]
  onChange: (next: string[]) => void
}) {
  const { data: amenities } = useAmenitiesCatalog()

  function toggle(key: string, checked: boolean) {
    onChange(checked ? [...selected, key] : selected.filter((k) => k !== key))
  }

  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
      {amenities?.map((amenity) => (
        <div key={amenity.key} className="flex items-center gap-2">
          <Checkbox
            id={`amenity-${amenity.key}`}
            checked={selected.includes(amenity.key)}
            onCheckedChange={(checked) => toggle(amenity.key, checked === true)}
          />
          <Label htmlFor={`amenity-${amenity.key}`} className="text-sm font-normal">
            {amenity.label}
          </Label>
        </div>
      ))}
    </div>
  )
}
