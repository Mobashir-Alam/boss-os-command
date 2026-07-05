# Renders every figures/*.mmd to a same-named PNG using mermaid-cli (via npx).
# First run downloads a headless Chromium (a few hundred MB) — be patient.
#
# Usage (from the repo root or anywhere):
#   pwsh report/render_figures.ps1
# Requires Node.js / npx on PATH. If you'd rather not install anything,
# paste each .mmd into https://mermaid.live and export a PNG by hand.

$figDir = Join-Path $PSScriptRoot "figures"
$scale  = 3   # higher = sharper raster for print
$bg     = "white"

Get-ChildItem -Path $figDir -Filter *.mmd | ForEach-Object {
    $in  = $_.FullName
    $out = [System.IO.Path]::ChangeExtension($in, ".png")
    Write-Host "Rendering $($_.Name) -> $([System.IO.Path]::GetFileName($out))"
    npx -y @mermaid-js/mermaid-cli -i $in -o $out -b $bg -s $scale
}

Write-Host "Done. PNGs are in $figDir"
