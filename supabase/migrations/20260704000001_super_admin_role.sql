-- PAPEL DO DONO DA PLATAFORMA (Painel Arboria, /arboria).
-- Separado do 'admin' (que é o painel da ESCOLA, usado pela coordenação).
-- Precisa rodar ANTES da migration que usa o valor (enum novo não pode ser
-- usado na mesma transação em que nasce).

ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';
