Add-Type -AssemblyName System.Drawing

function Create-Icon {
    param([int]$size, [string]$outputPath)
    
    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = 'AntiAlias'
    $g.Clear([System.Drawing.Color]::Transparent)
    
    # Create gradient brush
    $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        (New-Object System.Drawing.Point(0, 0)),
        (New-Object System.Drawing.Point($size, $size)),
        [System.Drawing.Color]::FromArgb(59, 130, 246),
        [System.Drawing.Color]::FromArgb(139, 92, 246)
    )
    
    # Draw rounded rectangle
    $radius = [int]($size * 0.15)
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $path.AddArc(0, 0, $radius * 2, $radius * 2, 180, 90)
    $path.AddArc($size - $radius * 2, 0, $radius * 2, $radius * 2, 270, 90)
    $path.AddArc($size - $radius * 2, $size - $radius * 2, $radius * 2, $radius * 2, 0, 90)
    $path.AddArc(0, $size - $radius * 2, $radius * 2, $radius * 2, 90, 90)
    $path.CloseFigure()
    $g.FillPath($brush, $path)
    
    # Draw T letter
    $fontSize = [int]($size * 0.55)
    $font = New-Object System.Drawing.Font('Arial', $fontSize, [System.Drawing.FontStyle]::Bold)
    $textBrush = [System.Drawing.Brushes]::White
    $sf = New-Object System.Drawing.StringFormat
    $sf.Alignment = 'Center'
    $sf.LineAlignment = 'Center'
    $rect = New-Object System.Drawing.RectangleF(0, 0, $size, $size)
    $g.DrawString('T', $font, $textBrush, $rect, $sf)
    
    $bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
    Write-Host "Created: $outputPath"
}

$iconDir = "c:\Users\Gao\Documents\workspace\deep-translate\icons"
Create-Icon -size 16 -outputPath "$iconDir\icon16.png"
Create-Icon -size 48 -outputPath "$iconDir\icon48.png"
Create-Icon -size 128 -outputPath "$iconDir\icon128.png"
Write-Host "All icons created successfully!"
