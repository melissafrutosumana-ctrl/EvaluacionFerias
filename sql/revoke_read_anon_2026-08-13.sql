-- Cierre de lectura directa: los reads pasan por RPCs SECURITY DEFINER con p_session_token.
-- Aplica a anon y authenticated. Los writes no se tocan (policies + RPCs).
REVOKE SELECT ON public.usuarios FROM anon, authenticated;
REVOKE SELECT ON public.proyectos_ferias FROM anon, authenticated;
REVOKE SELECT ON public.asignaciones_jueces FROM anon, authenticated;
REVOKE SELECT ON public.evaluaciones_proyectos FROM anon, authenticated;
REVOKE SELECT ON public.observaciones_proyectos FROM anon, authenticated;
REVOKE SELECT ON public.roles FROM anon, authenticated;
