# Resumen Strix - evaluacionesctpm_a6b5

**Generado:** 2026-08-26 18:58:10 -06:00
**Motivo de cierre:** timeout 20 min
**Vigilancia iniciada:** 2026-08-26 18:37:39 -06:00
**Duracion vigilancia:** 1231 s (timeout configurado: 20 min)

## Estado del scan

- **Status:** `running`
- **Run ID:** `evaluacionesctpm_a6b5`
- **Scan mode:** `quick`
- **Modelo:** `gemini/gemini-3.6-flash`
- **Inicio:** `2026-08-27T00:23:37.992500+00:00`
- **Fin:** (aun en curso / no finalizado)
- **Duracion scan:** 00:34:32.9576456

## Hallazgos

- **Total hallazgos (findings.sarif results):** 0

### Severidades

- (sin hallazgos, no hay severidades)

### Archivos afectados (0 unicos)

- (sin archivos afectados - 0 hallazgos)

## Consumo LLM

- **Requests:** 29
- **Total tokens:** 840007
- **Input tokens:** 837272
- **Output tokens:** 2735
- **Costo estimado:** 0.1439901 USD
- **Requests con detalle:** 19 requests no vacios

## Errores

- **Hubo errores?:** Si
- **Detalle:** Errores: 11 lineas con ERROR/Exception | Reintentos LLM: 11 lineas Retrying failed
- **Reintentos LLM (Retrying failed):** 11
- **Lineas ERROR/Exception:** 11

``log
# Ultimas 20 lineas de strix.log
2026-08-26 18:27:58.009 DEBUG   evaluacionesctpm_a6b5 - openai.agents: No conversation_id available for request
2026-08-26 18:27:58.010 DEBUG   evaluacionesctpm_a6b5 - openai.agents: Tracing is disabled. Not creating span
2026-08-26 18:27:58.016 DEBUG   evaluacionesctpm_a6b5 - openai.agents: Calling LLM
2026-08-26 18:27:58.342 DEBUG   evaluacionesctpm_a6b5 - openai.agents: Retrying failed streamed model request in 2.0s (attempt 1/5).
2026-08-26 18:28:00.352 DEBUG   evaluacionesctpm_a6b5 - openai.agents: Tracing is disabled. Not creating span
2026-08-26 18:28:00.356 DEBUG   evaluacionesctpm_a6b5 - openai.agents: Calling LLM
2026-08-26 18:28:03.099 INFO    evaluacionesctpm_a6b5 - strix.report.sarif: Wrote SARIF 2.1.0 report: D:\Trabajos Importantes\En desarrollo\EvaluacionesCTPM\strix_runs\evaluacionesctpm_a6b5\findings.sarif (0 results)
2026-08-26 18:28:03.101 INFO    evaluacionesctpm_a6b5 - strix.report.state: Essential scan data saved to: D:\Trabajos Importantes\En desarrollo\EvaluacionesCTPM\strix_runs\evaluacionesctpm_a6b5
2026-08-26 18:28:03.102 DEBUG   evaluacionesctpm_a6b5 - openai.agents: Processing output item type=message class=ResponseOutputMessage
2026-08-26 18:28:03.102 DEBUG   evaluacionesctpm_a6b5 - openai.agents: Processing output item type=function_call class=ResponseFunctionToolCall
2026-08-26 18:28:03.103 DEBUG   evaluacionesctpm_a6b5 - openai.agents: Tracing is disabled. Not creating span
2026-08-26 18:28:03.270 DEBUG   evaluacionesctpm_a6b5 - openai.agents: Turn 19 complete, next_step type=NextStepRunAgain
2026-08-26 18:28:03.389 DEBUG   evaluacionesctpm_a6b5 - openai.agents: Starting turn 20, current_agent=Root Agent
2026-08-26 18:28:03.389 DEBUG   evaluacionesctpm_a6b5 - openai.agents: Tracing is disabled. Not creating span
2026-08-26 18:28:03.392 DEBUG   evaluacionesctpm_a6b5 - openai.agents: No conversation_id available for request
2026-08-26 18:28:03.392 DEBUG   evaluacionesctpm_a6b5 - openai.agents: Tracing is disabled. Not creating span
2026-08-26 18:28:03.396 DEBUG   evaluacionesctpm_a6b5 - openai.agents: Calling LLM
2026-08-26 18:28:03.670 DEBUG   evaluacionesctpm_a6b5 - openai.agents: Retrying failed streamed model request in 2.0s (attempt 1/5).
2026-08-26 18:28:05.673 DEBUG   evaluacionesctpm_a6b5 - openai.agents: Tracing is disabled. Not creating span
2026-08-26 18:28:05.677 DEBUG   evaluacionesctpm_a6b5 - openai.agents: Calling LLM
``

``log
# Lineas de error/reintento (hasta 20)
2026-08-26 18:24:04.129 DEBUG   evaluacionesctpm_a6b5 - openai.agents: Retrying failed streamed model request in 2.0s (attempt 1/5).
2026-08-26 18:24:06.443 DEBUG   evaluacionesctpm_a6b5 - openai.agents: Retrying failed streamed model request in 4.0s (attempt 2/5).
2026-08-26 18:24:10.737 DEBUG   evaluacionesctpm_a6b5 - openai.agents: Retrying failed streamed model request in 8.0s (attempt 3/5).
2026-08-26 18:24:19.034 DEBUG   evaluacionesctpm_a6b5 - openai.agents: Retrying failed streamed model request in 16.0s (attempt 4/5).
2026-08-26 18:24:35.320 DEBUG   evaluacionesctpm_a6b5 - openai.agents: Retrying failed streamed model request in 32.0s (attempt 5/5).
2026-08-26 18:27:20.442 DEBUG   evaluacionesctpm_a6b5 - openai.agents: Retrying failed streamed model request in 2.0s (attempt 1/5).
2026-08-26 18:27:22.767 DEBUG   evaluacionesctpm_a6b5 - openai.agents: Retrying failed streamed model request in 4.0s (attempt 2/5).
2026-08-26 18:27:27.055 DEBUG   evaluacionesctpm_a6b5 - openai.agents: Retrying failed streamed model request in 8.0s (attempt 3/5).
2026-08-26 18:27:35.367 DEBUG   evaluacionesctpm_a6b5 - openai.agents: Retrying failed streamed model request in 16.0s (attempt 4/5).
2026-08-26 18:27:58.342 DEBUG   evaluacionesctpm_a6b5 - openai.agents: Retrying failed streamed model request in 2.0s (attempt 1/5).
2026-08-26 18:28:03.670 DEBUG   evaluacionesctpm_a6b5 - openai.agents: Retrying failed streamed model request in 2.0s (attempt 1/5).
2026-08-26 18:24:04.129 DEBUG   evaluacionesctpm_a6b5 - openai.agents: Retrying failed streamed model request in 2.0s (attempt 1/5).
2026-08-26 18:24:06.443 DEBUG   evaluacionesctpm_a6b5 - openai.agents: Retrying failed streamed model request in 4.0s (attempt 2/5).
2026-08-26 18:24:10.737 DEBUG   evaluacionesctpm_a6b5 - openai.agents: Retrying failed streamed model request in 8.0s (attempt 3/5).
2026-08-26 18:24:19.034 DEBUG   evaluacionesctpm_a6b5 - openai.agents: Retrying failed streamed model request in 16.0s (attempt 4/5).
2026-08-26 18:24:35.320 DEBUG   evaluacionesctpm_a6b5 - openai.agents: Retrying failed streamed model request in 32.0s (attempt 5/5).
2026-08-26 18:27:20.442 DEBUG   evaluacionesctpm_a6b5 - openai.agents: Retrying failed streamed model request in 2.0s (attempt 1/5).
2026-08-26 18:27:22.767 DEBUG   evaluacionesctpm_a6b5 - openai.agents: Retrying failed streamed model request in 4.0s (attempt 2/5).
2026-08-26 18:27:27.055 DEBUG   evaluacionesctpm_a6b5 - openai.agents: Retrying failed streamed model request in 8.0s (attempt 3/5).
2026-08-26 18:27:35.367 DEBUG   evaluacionesctpm_a6b5 - openai.agents: Retrying failed streamed model request in 16.0s (attempt 4/5).
``

## Archivos vigilados

- `D:\Trabajos Importantes\En desarrollo\EvaluacionesCTPM\strix_runs\evaluacionesctpm_a6b5\run.json` -> status, total_tokens, requests
- `` -> results count
- `D:\Trabajos Importantes\En desarrollo\EvaluacionesCTPM\strix_runs\evaluacionesctpm_a6b5\strix.log` -> ultimas lineas

> Nota: Este resumen se genero automaticamente al detectar status terminal (completed/failed) o al alcanzar 20 min de vigilancia. No se borro ningun archivo.
