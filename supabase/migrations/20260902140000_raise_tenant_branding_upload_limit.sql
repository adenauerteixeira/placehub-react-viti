-- Fotos de banner de anúncio de parceiro (Vitrine) são imagens de
-- marketing "de verdade" — maiores que logo/favicon, que é o que
-- justificava o limite de 2 MB original desse bucket. Sobe pra 5 MB
-- (mesmo teto já usado no bucket catalog-media, pra fotos de imóvel).
update storage.buckets
set file_size_limit = 5242880
where id = 'tenant-branding';
