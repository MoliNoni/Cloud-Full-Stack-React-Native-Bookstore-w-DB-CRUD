alter table clientes
add column if not exists rol text not null default 'cliente';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'clientes_rol_check'
  ) then
    alter table clientes
    add constraint clientes_rol_check
    check (rol in ('cliente', 'admin'));
  end if;
end $$;

create table if not exists categorias (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  tipo text not null check (tipo in ('book', 'vinyl')),
  activa boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index if not exists categorias_tipo_nombre_unique
on categorias (tipo, lower(nombre));

insert into categorias (nombre, tipo)
select distinct trim(genero), category
from productos
where genero is not null
  and trim(genero) <> ''
  and category in ('book', 'vinyl')
  and not exists (
    select 1
    from categorias
    where categorias.tipo = productos.category
      and lower(categorias.nombre) = lower(trim(productos.genero))
  );

alter table productos
add column if not exists categoria_id uuid;

update productos
set categoria_id = categorias.id
from categorias
where productos.categoria_id is null
  and categorias.tipo = productos.category
  and lower(categorias.nombre) = lower(trim(productos.genero));

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'productos_categoria_id_fkey'
  ) then
    alter table productos
    add constraint productos_categoria_id_fkey
    foreign key (categoria_id)
    references categorias(id)
    on update cascade
    on delete set null;
  end if;
end $$;

alter table categorias enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'categorias'
      and policyname = 'Categorias visibles para todos'
  ) then
    create policy "Categorias visibles para todos"
    on categorias
    for select
    using (activa = true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'categorias'
      and policyname = 'Solo admins gestionan categorias'
  ) then
    create policy "Solo admins gestionan categorias"
    on categorias
    for all
    using (
      exists (
        select 1
        from clientes
        where clientes.email = auth.jwt() ->> 'email'
          and clientes.rol = 'admin'
      )
    )
    with check (
      exists (
        select 1
        from clientes
        where clientes.email = auth.jwt() ->> 'email'
          and clientes.rol = 'admin'
      )
    );
  end if;
end $$;
