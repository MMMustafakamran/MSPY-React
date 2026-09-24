# Start dev servers in separate terminal windows with command visibly shown
$rootDir = $PSScriptRoot

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host " Launching dev servers in separate terminals...                 " -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

$managers = @(
    @{ Port = 3021; Name = "npm";  Cmd = "npm run dev" },
    @{ Port = 3022; Name = "pnpm"; Cmd = "pnpm run dev" },
    @{ Port = 3024; Name = "bun";  Cmd = "bun run dev" },
    @{ Port = 3023; Name = "yarn"; Cmd = "yarn run dev" }
)

foreach ($m in $managers) {
    $name = $m.Name
    $cmd = $m.Cmd
    $ui = $m.Port
    $ag = $m.Port + 5000
    $targetPath = $null

    if (Test-Path "$rootDir\$name\app\package.json") {
        $targetPath = "$rootDir\$name\app"
    } elseif (Test-Path "$rootDir\$name\package.json") {
        $targetPath = "$rootDir\$name"
    }

    if ($targetPath) {
        Write-Host "[$name] Opening terminal for: $cmd" -ForegroundColor Green
        Write-Host "       Target: $targetPath" -ForegroundColor Gray

        $psCommand = "Set-Location '$targetPath'; `$env:PORT='$ui'; `$env:AGENT_PORT='$ag'; `$env:AGENT_URL='http://localhost:$ag'; " +
                     "Write-Host '================================================================' -ForegroundColor Cyan; " +
                     "Write-Host ' Location: $targetPath' -ForegroundColor Gray; " +
                     "Write-Host ' Running:  $cmd (UI :$ui, Python Agent :$ag)' -ForegroundColor Yellow; " +
                     "Write-Host '================================================================' -ForegroundColor Cyan; " +
                     "Write-Host ''; " +
                     "$cmd"

        Start-Process powershell -ArgumentList "-NoExit", "-Command", $psCommand
    } else {
        Write-Host "[$name] No project found in $name\app or $name. Skipping." -ForegroundColor DarkGray
    }
}

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host " All dev server terminals have been opened!                     " -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
