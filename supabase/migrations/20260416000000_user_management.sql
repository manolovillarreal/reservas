ALTER TABLE IF EXISTS public.account_users
  ADD COLUMN IF NOT EXISTS invited_by uuid REFERENCES auth.users(id) NULL,
  ADD COLUMN IF NOT EXISTS invited_at timestamptz,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS is_owner boolean DEFAULT false;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'account_users_status_check'
      AND conrelid = 'public.account_users'::regclass
  ) THEN
    ALTER TABLE public.account_users
      ADD CONSTRAINT account_users_status_check
      CHECK (status IN ('active', 'pending', 'inactive'));
  END IF;
END $$;

UPDATE public.account_users
SET status = COALESCE(status, 'active');

UPDATE public.account_users
SET is_owner = false
WHERE is_owner IS NULL;

ALTER TABLE IF EXISTS public.account_users
  ALTER COLUMN status SET DEFAULT 'active',
  ALTER COLUMN is_owner SET DEFAULT false;

CREATE INDEX IF NOT EXISTS account_users_account_id_status_idx
  ON public.account_users (account_id, status);

CREATE INDEX IF NOT EXISTS account_users_account_id_is_owner_idx
  ON public.account_users (account_id, is_owner);

UPDATE public.account_users
SET is_owner = true
WHERE role = 'admin'
  AND id IN (
    SELECT DISTINCT ON (account_id) id
    FROM public.account_users
    WHERE role = 'admin'
    ORDER BY account_id, created_at ASC
  );

CREATE OR REPLACE FUNCTION public.get_account_role_usage(p_account_id uuid)
RETURNS TABLE(role text, used_slots integer, max_slots integer)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH membership AS (
    SELECT 1
    FROM public.account_users
    WHERE user_id = auth.uid()
      AND account_id = p_account_id
    LIMIT 1
  ),
  usage_rows AS (
    SELECT 'admin'::text AS role, 2 AS max_slots
    UNION ALL SELECT 'manager'::text, 2
    UNION ALL SELECT 'staff'::text, 4
  )
  SELECT
    u.role,
    COALESCE((
      SELECT COUNT(*)::integer
      FROM public.account_users au
      WHERE au.account_id = p_account_id
        AND au.role = u.role
        AND COALESCE(au.status, 'active') IN ('active', 'pending')
    ), 0) AS used_slots,
    u.max_slots
  FROM usage_rows u
  WHERE EXISTS (SELECT 1 FROM membership);
$$;

GRANT EXECUTE ON FUNCTION public.get_account_role_usage(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_account_users(p_account_id uuid)
RETURNS TABLE(
  id uuid,
  account_id uuid,
  user_id uuid,
  email text,
  full_name text,
  role text,
  status text,
  is_owner boolean,
  invited_by uuid,
  invited_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_account_id IS NULL THEN
    RAISE EXCEPTION 'account_id is required';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.account_users
    WHERE user_id = auth.uid()
      AND account_id = p_account_id
  ) THEN
    RAISE EXCEPTION 'No autorizado para esta cuenta.';
  END IF;

  RETURN QUERY
  SELECT
    au.id,
    au.account_id,
    au.user_id,
    u.email::text,
    NULLIF(
      COALESCE(
        NULLIF(trim(COALESCE(u.raw_user_meta_data->>'full_name', '')), ''),
        NULLIF(trim(COALESCE(u.raw_user_meta_data->>'name', '')), ''),
        NULLIF(trim(concat_ws(' ', u.raw_user_meta_data->>'first_name', u.raw_user_meta_data->>'last_name')), ''),
        NULLIF(trim(concat_ws(' ', u.raw_app_meta_data->>'first_name', u.raw_app_meta_data->>'last_name')), '')
      ),
      ''
    ) AS full_name,
    au.role,
    COALESCE(au.status, 'active') AS status,
    COALESCE(au.is_owner, false) AS is_owner,
    au.invited_by,
    au.invited_at,
    au.created_at,
    au.updated_at
  FROM public.account_users au
  LEFT JOIN auth.users u ON u.id = au.user_id
  WHERE au.account_id = p_account_id
  ORDER BY au.created_at ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_account_users(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.update_account_user_role(
  p_membership_id uuid,
  p_account_id uuid,
  p_role text
)
RETURNS public.account_users
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid;
  v_actor record;
  v_target public.account_users%ROWTYPE;
  v_limit integer;
  v_used integer;
  v_result public.account_users%ROWTYPE;
BEGIN
  v_actor_id := auth.uid();

  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_membership_id IS NULL OR p_account_id IS NULL OR p_role IS NULL THEN
    RAISE EXCEPTION 'Datos incompletos para actualizar rol.';
  END IF;

  IF p_role NOT IN ('admin', 'manager', 'staff') THEN
    RAISE EXCEPTION 'Rol inválido.';
  END IF;

  SELECT * INTO v_actor
  FROM public.account_users
  WHERE user_id = v_actor_id
    AND account_id = p_account_id
  LIMIT 1;

  IF v_actor IS NULL OR v_actor.role <> 'admin' THEN
    RAISE EXCEPTION 'Solo un admin puede cambiar roles.';
  END IF;

  SELECT * INTO v_target
  FROM public.account_users
  WHERE id = p_membership_id
    AND account_id = p_account_id
  LIMIT 1;

  IF v_target.id IS NULL THEN
    RAISE EXCEPTION 'Usuario no encontrado en esta cuenta.';
  END IF;

  IF v_target.user_id = v_actor_id THEN
    RAISE EXCEPTION 'No puedes cambiar tu propio rol.';
  END IF;

  IF COALESCE(v_target.is_owner, false) THEN
    RAISE EXCEPTION 'No puedes cambiar el rol del propietario.';
  END IF;

  IF v_target.role = p_role THEN
    RETURN v_target;
  END IF;

  v_limit := CASE p_role
    WHEN 'admin' THEN 2
    WHEN 'manager' THEN 2
    WHEN 'staff' THEN 4
    ELSE 0
  END;

  SELECT COUNT(*)::integer INTO v_used
  FROM public.account_users
  WHERE account_id = p_account_id
    AND role = p_role
    AND COALESCE(status, 'active') IN ('active', 'pending')
    AND id <> p_membership_id;

  IF v_used >= v_limit THEN
    RAISE EXCEPTION 'Límite de % alcanzado (% por cuenta).', p_role, v_limit;
  END IF;

  UPDATE public.account_users
  SET role = p_role
  WHERE id = p_membership_id
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_account_user_role(uuid, uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.remove_account_user(
  p_membership_id uuid,
  p_account_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid;
  v_actor record;
  v_target public.account_users%ROWTYPE;
BEGIN
  v_actor_id := auth.uid();

  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_actor
  FROM public.account_users
  WHERE user_id = v_actor_id
    AND account_id = p_account_id
  LIMIT 1;

  IF v_actor IS NULL OR v_actor.role <> 'admin' THEN
    RAISE EXCEPTION 'Solo un admin puede quitar usuarios.';
  END IF;

  SELECT * INTO v_target
  FROM public.account_users
  WHERE id = p_membership_id
    AND account_id = p_account_id
  LIMIT 1;

  IF v_target.id IS NULL THEN
    RAISE EXCEPTION 'Usuario no encontrado en esta cuenta.';
  END IF;

  IF v_target.user_id = v_actor_id THEN
    RAISE EXCEPTION 'No puedes quitarte de tu propia cuenta.';
  END IF;

  IF COALESCE(v_target.is_owner, false) THEN
    RAISE EXCEPTION 'No puedes quitar al propietario de la cuenta.';
  END IF;

  DELETE FROM public.account_users
  WHERE id = p_membership_id
    AND account_id = p_account_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.remove_account_user(uuid, uuid) TO authenticated;

DROP POLICY IF EXISTS account_users_own_account ON public.account_users;
DROP POLICY IF EXISTS account_users_read_same_account ON public.account_users;

CREATE POLICY account_users_read_same_account ON public.account_users
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR account_id = public.current_account_id()
);

CREATE OR REPLACE FUNCTION public.handle_account_user_email_confirmed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL THEN
    UPDATE public.account_users
    SET status = 'active'
    WHERE user_id = NEW.id
      AND COALESCE(status, 'active') = 'pending';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_email_confirmed ON auth.users;

CREATE TRIGGER on_auth_user_email_confirmed
AFTER UPDATE OF email_confirmed_at ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_account_user_email_confirmed();
