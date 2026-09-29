# Painel Administrativo

## Passo a passo

1. **Criar projeto no Supabase** (supabase.com)
2. **SQL Editor** → colar o conteúdo de `sql/schema.sql` e rodar
3. **Authentication → Users** → adicionar um usuário (email + senha)
   para login no painel
4. **Settings → API** → copiar `Project URL` e `anon public key`
5. Colar esses valores em `js/supabase.js`
6. **Rodar local**: abrir com um servidor estático (o `type="module"` exige
   HTTP, não file://):