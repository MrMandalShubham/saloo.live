# Install Supabase CLI for Windows
$ErrorActionPreference = "Stop"

$dest = "$env:USERPROFILE\AppData\Local\supabase"
$tarFile = "$dest\supabase.tar.gz"
$exeDest = "$dest\supabase.exe"

Write-Host "Creating directory: $dest"
New-Item -ItemType Directory -Force -Path $dest | Out-Null

Write-Host "Downloading Supabase CLI..."
$url = "https://github.com/supabase/cli/releases/latest/download/supabase_windows_amd64.tar.gz"
Invoke-WebRequest -Uri $url -OutFile $tarFile -UseBasicParsing
Write-Host "Downloaded."

Write-Host "Extracting..."
tar -xzf $tarFile -C $dest
Write-Host "Extracted."

# Add to PATH for current session
$env:PATH = "$dest;$env:PATH"

# Add to user PATH permanently
$currentPath = [Environment]::GetEnvironmentVariable("PATH", "User")
if ($currentPath -notlike "*$dest*") {
    [Environment]::SetEnvironmentVariable("PATH", "$dest;$currentPath", "User")
    Write-Host "Added $dest to PATH permanently."
}

Write-Host ""
Write-Host "Done! Testing..."
& "$exeDest" --version
Write-Host ""
Write-Host "Supabase CLI installed. Restart PowerShell or run:"
Write-Host "  `$env:PATH = '$dest;' + `$env:PATH"
