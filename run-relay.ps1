$ErrorActionPreference = 'SilentlyContinue'
function Write-ColorOutput($message) {
    Write-Host $message -ForegroundColor Green
}

$proc = Start-Process -FilePath "node" -ArgumentList "relay.js" -WorkingDirectory "C:\Users\marmo\Desktop\Desarrollo\Ia descentralizada\versionOpencode" -PassThru -WindowStyle Hidden
Start-Sleep 2

if ($proc -and !$proc.HasExited) {
    Write-ColorOutput "Relay started with PID: $($proc.Id)"
    $proc.Id | Out-File -FilePath "C:\Users\marmo\Desktop\Desarrollo\Ia descentralizada\versionOpencode\relay.pid" -Encoding UTF8
} else {
    Write-ColorOutput "Failed to start relay"
}