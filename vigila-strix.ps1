# vigila-strix.ps1 — ponytail: polling simple, sin deps, 1 archivo
$RunDir  = "D:\Trabajos Importantes\En desarrollo\EvaluacionesCTPM\strix_runs\evaluacionesctpm_a6b5"
$RunJson = Join-Path $RunDir "run.json"
$Sarif   = Join-Path $RunDir "findings.sarif"
$Log     = Join-Path $RunDir "strix.log"
$Resumen = Join-Path $RunDir "resumen.md"

$IntervalSec = 30
$TimeoutSec  = 20 * 60
$Start = Get-Date
$Deadline = $Start.AddSeconds($TimeoutSec)

Write-Host "[vigila-strix] Inicio: $($Start.ToString('o'))"
Write-Host "[vigila-strix] RunDir: $RunDir"
Write-Host "[vigila-strix] Intervalo: ${IntervalSec}s | Timeout: $($Deadline.ToString('HH:mm:ss')) (20 min)"

function Read-JsonSafe($path) {
    for ($i=0; $i -lt 3; $i++) {
        try { return (Get-Content -LiteralPath $path -Raw -ErrorAction Stop | ConvertFrom-Json) } catch { Start-Sleep -Milliseconds 200 }
    }
    return $null
}

$iter = 0
while ($true) {
    $iter++
    $now = Get-Date
    $elapsed = [int]($now - $Start).TotalSeconds
    $remaining = [int]($Deadline - $now).TotalSeconds
    if ($remaining -lt 0) { $remaining = 0 }

    $run = Read-JsonSafe $RunJson
    $status = if ($run) { $run.status } else { "desconocido" }
    $tokens = if ($run -and $run.llm_usage) { $run.llm_usage.total_tokens } else { "?" }
    $requests = if ($run -and $run.llm_usage) { $run.llm_usage.requests } else { "?" }
    $inputTokens = if ($run -and $run.llm_usage) { $run.llm_usage.input_tokens } else { "?" }
    $outputTokens = if ($run -and $run.llm_usage) { $run.llm_usage.output_tokens } else { "?" }
    $cost = if ($run -and $run.llm_usage) { $run.llm_usage.cost } else { "?" }

    $sarif = Read-JsonSafe $Sarif
    $results = @()
    if ($sarif -and $sarif.runs) { foreach ($r in $sarif.runs) { if ($r.results) { $results += $r.results } } }
    $findingsCount = $results.Count

    $logTail = ""
    $logErrors = 0
    $retryCount = 0
    if (Test-Path -LiteralPath $Log) {
        try {
            $logTail = (Get-Content -LiteralPath $Log -Tail 5 -ErrorAction Stop) -join "`n"
            $logErrors = (Select-String -LiteralPath $Log -Pattern "ERROR|Exception|Traceback" -ErrorAction SilentlyContinue | Measure-Object).Count
            $retryCount = (Select-String -LiteralPath $Log -Pattern "Retrying failed" -ErrorAction SilentlyContinue | Measure-Object).Count
        } catch {}
    } else { $logTail = "(sin strix.log)" }

    Write-Host ""
    Write-Host "[$($now.ToString('HH:mm:ss'))] iter=$iter elapsed=${elapsed}s remaining=${remaining}s | status=$status | tokens=$tokens (in=$inputTokens out=$outputTokens) | requests=$requests | findings=$findingsCount | retries=$retryCount errors=$logErrors"
    if ($logTail) { Write-Host "  log tail:"; $logTail.Split("`n") | ForEach-Object { Write-Host "    $_" } }

    $done = ($status -in @("completed","failed"))
    $timedOut = ($now -ge $Deadline)
    if ($done -or $timedOut) {
        if ($done) { Write-Host "`n[vigila-strix] Status terminal: $status — generando resumen..." }
        else { Write-Host "`n[vigila-strix] Timeout 20 min alcanzado — generando resumen..." }
        break
    }
    Start-Sleep -Seconds $IntervalSec
}

# --- Generar resumen ---
Write-Host "[vigila-strix] Generando $Resumen ..."
$runFinal = Read-JsonSafe $RunJson
$sarifFinal = Read-JsonSafe $Sarif

$finalStatus = if ($runFinal) { $runFinal.status } else { "desconocido" }
$finalStart = if ($runFinal) { $runFinal.start_time } else { "?" }
$finalEnd = if ($runFinal) { $runFinal.end_time } else { $null }
$totalTokens = if ($runFinal -and $runFinal.llm_usage) { $runFinal.llm_usage.total_tokens } else { "?" }
$inputT = if ($runFinal -and $runFinal.llm_usage) { $runFinal.llm_usage.input_tokens } else { "?" }
$outputT = if ($runFinal -and $runFinal.llm_usage) { $runFinal.llm_usage.output_tokens } else { "?" }
$reqs = if ($runFinal -and $runFinal.llm_usage) { $runFinal.llm_usage.requests } else { "?" }
$costFinal = if ($runFinal -and $runFinal.llm_usage) { $runFinal.llm_usage.cost } else { "?" }
$scanMode = if ($runFinal) { $runFinal.scan_mode } else { "?" }
$model = if ($runFinal -and $runFinal.llm_usage -and $runFinal.llm_usage.agents -and $runFinal.llm_usage.agents.Count -gt 0) { $runFinal.llm_usage.agents[0].model } else { "?" }

$finalResults = @()
if ($sarifFinal -and $sarifFinal.runs) { foreach ($r in $sarifFinal.runs) { if ($r.results) { $finalResults += $r.results } } }
$totalFindings = $finalResults.Count

# Severidades
$sevMap = @{}
foreach ($res in $finalResults) {
    $sev = $res.level
    if (-not $sev -and $res.properties -and $res.properties.severity) { $sev = $res.properties.severity }
    if (-not $sev -and $res.properties -and $res.properties.tags) { $sev = ($res.properties.tags -join ",") }
    if (-not $sev) { $sev = "unknown" }
    $sev = $sev.ToString().ToLower()
    if (-not $sevMap.ContainsKey($sev)) { $sevMap[$sev] = 0 }
    $sevMap[$sev]++
}

# Archivos afectados
$files = @()
foreach ($res in $finalResults) {
    if ($res.locations) {
        foreach ($loc in $res.locations) {
            $uri = $null
            try { $uri = $loc.physicalLocation.artifactLocation.uri } catch {}
            if ($uri) { $files += $uri }
        }
    }
}
$filesUnique = $files | Sort-Object -Unique
$filesCount = $filesUnique.Count

# Errores en log
$logText = ""
$errLines = @()
$retryLines = @()
$lastLines = @()
if (Test-Path -LiteralPath $Log) {
    $logText = Get-Content -LiteralPath $Log -Raw -ErrorAction SilentlyContinue
    $errLines = Select-String -LiteralPath $Log -Pattern "ERROR|Exception|Traceback|Failed" -ErrorAction SilentlyContinue | ForEach-Object { $_.Line }
    $retryLines = Select-String -LiteralPath $Log -Pattern "Retrying failed" -ErrorAction SilentlyContinue | ForEach-Object { $_.Line }
    $lastLines = Get-Content -LiteralPath $Log -Tail 20 -ErrorAction SilentlyContinue
}

$huboErrores = if (($errLines.Count -gt 0) -or ($retryLines.Count -gt 0)) { "Si" } else { "No" }
$motivo = if ($finalStatus -in @("completed","failed")) { "status=$finalStatus" } else { "timeout 20 min" }
$nowStr = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss K")
$startStr = $Start.ToString("yyyy-MM-dd HH:mm:ss K")
$vigilanciaSec = [int]((Get-Date)-$Start).TotalSeconds
$duration = if ($runFinal -and $runFinal.start_time) {
    try { $s = [DateTime]::Parse($runFinal.start_time); $e = if ($runFinal.end_time) { [DateTime]::Parse($runFinal.end_time) } else { Get-Date }; ($e - $s).ToString() } catch { "?" }
} else { "?" }
$finStr = if ($finalEnd) { "``$finalEnd``" } else { "(aun en curso / no finalizado)" }
$runIdStr = if ($runFinal) { $runFinal.run_id } else { "?" }
$sevLines = if ($sevMap.Count -eq 0) { "- (sin hallazgos, no hay severidades)" } else { ($sevMap.GetEnumerator() | Sort-Object Name | ForEach-Object { "- **$($_.Key)**: $($_.Value)" }) -join "`n" }
$filesLines = if ($filesCount -eq 0) { "- (sin archivos afectados - 0 hallazgos)" } else { ($filesUnique | ForEach-Object { "- ``$_``" }) -join "`n" }
$errSummary = if ($errLines.Count -eq 0 -and $retryLines.Count -eq 0) { "No se detectaron errores en strix.log." } else { "Errores: $($errLines.Count) lineas con ERROR/Exception | Reintentos LLM: $($retryLines.Count) lineas Retrying failed" }
$reqsNoVacios = "?"
if ($runFinal -and $runFinal.llm_usage -and $runFinal.llm_usage.request_usage_entries) { $reqsNoVacios = ($runFinal.llm_usage.request_usage_entries | Where-Object { $_.total_tokens -gt 0 } | Measure-Object).Count }
$retryCountFinal = $retryLines.Count
$errCountFinal = $errLines.Count
$lastLogJoined = ($lastLines -join "`n")
$errJoined = (($errLines + $retryLines | Select-Object -First 20) -join "`n")
if (-not $lastLogJoined) { $lastLogJoined = "(sin log)" }
if (-not $errJoined) { $errJoined = "(sin errores)" }

$md = @"
# Resumen Strix - evaluacionesctpm_a6b5

**Generado:** $nowStr
**Motivo de cierre:** $motivo
**Vigilancia iniciada:** $startStr
**Duracion vigilancia:** $vigilanciaSec s (timeout configurado: 20 min)

## Estado del scan

- **Status:** ``$finalStatus``
- **Run ID:** ``$runIdStr``
- **Scan mode:** ``$scanMode``
- **Modelo:** ``$model``
- **Inicio:** ``$finalStart``
- **Fin:** $finStr
- **Duracion scan:** $duration

## Hallazgos

- **Total hallazgos (findings.sarif results):** $totalFindings

### Severidades

$sevLines

### Archivos afectados ($filesCount unicos)

$filesLines

## Consumo LLM

- **Requests:** $reqs
- **Total tokens:** $totalTokens
- **Input tokens:** $inputT
- **Output tokens:** $outputT
- **Costo estimado:** $costFinal USD
- **Requests con detalle:** $reqsNoVacios requests no vacios

## Errores

- **Hubo errores?:** $huboErrores
- **Detalle:** $errSummary
- **Reintentos LLM (Retrying failed):** $retryCountFinal
- **Lineas ERROR/Exception:** $errCountFinal

````log
# Ultimas 20 lineas de strix.log
$lastLogJoined
````

````log
# Lineas de error/reintento (hasta 20)
$errJoined
````

## Archivos vigilados

- ``$RunJson`` -> status, total_tokens, requests
- ``$Sarif`` -> results count
- ``$Log`` -> ultimas lineas

> Nota: Este resumen se genero automaticamente al detectar status terminal (completed/failed) o al alcanzar 20 min de vigilancia. No se borro ningun archivo.
"@

Set-Content -LiteralPath $Resumen -Value $md -Encoding UTF8
Write-Host "[vigila-strix] Resumen escrito en $Resumen ($totalFindings hallazgos, status=$finalStatus, tokens=$totalTokens)"
Write-Host "[vigila-strix] Fin."
