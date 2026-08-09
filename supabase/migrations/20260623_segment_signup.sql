-- Phase 1: capture the chosen segment (men/women) at signup via handle_new_user.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_role    TEXT;
  v_phone   TEXT;
  v_name    TEXT;
  v_segment TEXT;
BEGIN
  v_role := CASE COALESCE(NEW.raw_user_meta_data->>'role', '')
    WHEN 'owner' THEN 'shop_owner'
    WHEN 'admin' THEN 'customer'
    ELSE 'customer'
  END;

  v_phone := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'phone', NEW.phone, '')), '');

  v_name := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'name'),      ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'user_name'), '')
  );

  -- Segment chosen at signup (default men)
  v_segment := CASE WHEN NEW.raw_user_meta_data->>'segment' = 'women' THEN 'women' ELSE 'men' END;

  INSERT INTO public.users (id, email, phone, name, role, segment)
  VALUES (NEW.id, NEW.email, v_phone, v_name, v_role, v_segment)
  ON CONFLICT (id) DO UPDATE
    SET email      = EXCLUDED.email,
        phone      = COALESCE(EXCLUDED.phone, public.users.phone),
        name       = COALESCE(EXCLUDED.name,  public.users.name),
        updated_at = now();  -- segment left unchanged on conflict (set once at creation)

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'handle_new_user failed for %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;
