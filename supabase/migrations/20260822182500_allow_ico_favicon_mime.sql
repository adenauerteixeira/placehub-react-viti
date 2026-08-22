-- O bucket tenant-branding só aceitava image/png, image/jpeg, image/webp e
-- image/svg+xml — um favicon .ico é rejeitado pelo Storage antes mesmo de
-- chegar nas policies, porque o browser reporta o arquivo como
-- image/x-icon (ou variantes), que não estava na lista.
update storage.buckets
set allowed_mime_types = array[
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/svg+xml',
  'image/x-icon',
  'image/vnd.microsoft.icon'
]
where id = 'tenant-branding';
