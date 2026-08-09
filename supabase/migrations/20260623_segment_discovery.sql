-- Phase 2: segment-filter nearby discovery. Adds p_segment (men/women) — shows
-- that segment's shops plus unisex. NULL = no filter (guests default handled client-side).
DROP FUNCTION IF EXISTS public.shops_nearby(FLOAT, FLOAT, FLOAT, BOOLEAN, FLOAT, FLOAT, TEXT[], TEXT, INT, INT);

CREATE OR REPLACE FUNCTION public.shops_nearby(
  p_lat        FLOAT,
  p_lng        FLOAT,
  p_radius_km  FLOAT   DEFAULT 5,
  p_open_now   BOOLEAN DEFAULT false,
  p_min_rating FLOAT   DEFAULT 0,
  p_max_price  FLOAT   DEFAULT NULL,
  p_features   TEXT[]  DEFAULT NULL,
  p_sort_by    TEXT    DEFAULT 'nearest',
  p_limit      INT     DEFAULT 20,
  p_offset     INT     DEFAULT 0,
  p_segment    TEXT    DEFAULT NULL
)
RETURNS TABLE (
  id UUID, name TEXT, slug TEXT, address TEXT, city TEXT, lat NUMERIC, lng NUMERIC,
  photos TEXT[], features TEXT[], specialties TEXT[], rating NUMERIC, review_count INT,
  is_featured BOOLEAN, distance_km FLOAT, is_open_now BOOLEAN, min_price NUMERIC
) LANGUAGE plpgsql STABLE SET search_path = public AS $$
DECLARE
  v_point GEOGRAPHY := ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326);
  v_day   INT  := EXTRACT(DOW FROM NOW() AT TIME ZONE 'Asia/Kolkata');
  v_time  TIME := (NOW() AT TIME ZONE 'Asia/Kolkata')::TIME;
BEGIN
  RETURN QUERY
  SELECT
    s.id, s.name, s.slug, s.address, s.city, s.lat, s.lng,
    s.photos, s.features, s.specialties, s.rating, s.review_count, s.is_featured,
    ST_Distance(s.location, v_point) / 1000.0 AS distance_km,
    EXISTS (
      SELECT 1 FROM public.shop_hours sh
      WHERE sh.shop_id = s.id AND sh.day_of_week = v_day AND sh.is_closed = false
        AND v_time BETWEEN sh.open_time AND sh.close_time
        AND NOT EXISTS (
          SELECT 1 FROM public.shop_breaks sb
          WHERE sb.shop_id = s.id AND (sb.day_of_week IS NULL OR sb.day_of_week = v_day)
            AND v_time BETWEEN sb.start_time AND sb.end_time
        )
    ) AS is_open_now,
    (SELECT MIN(price) FROM public.services sv WHERE sv.shop_id = s.id AND sv.is_active = true AND sv.is_addon = false) AS min_price
  FROM public.shops s
  WHERE
    s.status = 'verified'
    AND (s.location IS NOT NULL)
    AND ST_DWithin(s.location, v_point, p_radius_km * 1000)
    AND s.rating >= p_min_rating
    AND (p_segment IS NULL OR s.segment = p_segment OR s.segment = 'unisex')
    AND (p_features IS NULL OR s.features @> p_features)
    AND (
      NOT p_open_now OR EXISTS (
        SELECT 1 FROM public.shop_hours sh
        WHERE sh.shop_id = s.id AND sh.day_of_week = v_day
          AND sh.is_closed = false AND v_time BETWEEN sh.open_time AND sh.close_time
      )
    )
    AND (
      p_max_price IS NULL OR EXISTS (
        SELECT 1 FROM public.services sv
        WHERE sv.shop_id = s.id AND sv.is_active = true
          AND sv.is_addon = false AND sv.price <= p_max_price
      )
    )
  ORDER BY
    CASE WHEN p_sort_by = 'nearest'   THEN ST_Distance(s.location, v_point) END ASC NULLS LAST,
    CASE WHEN p_sort_by = 'top_rated' THEN s.rating END DESC NULLS LAST,
    s.is_featured DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;
