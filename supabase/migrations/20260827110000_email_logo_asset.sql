-- Slot de upload dedicado "Logo do e-mail" (Identidade Visual → E-mails):
-- uma versão do logo com o fundo já embutido nos pixels da própria imagem,
-- imune a qualquer reescrita de dark-mode de cliente de e-mail (Gmail
-- Android, principalmente — ver CHANGELOG.md). Não compete com
-- background_image_path (foto de fundo do hero da home pública) nem com
-- logo_light_path (continua sendo o fallback quando esse campo está vazio).
alter table public.tenants
  add column email_logo_path text;
