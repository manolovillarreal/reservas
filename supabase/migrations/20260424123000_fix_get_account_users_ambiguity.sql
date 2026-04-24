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
    FROM public.account_users au_membership
    WHERE au_membership.user_id = auth.uid()
      AND au_membership.account_id = p_account_id
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