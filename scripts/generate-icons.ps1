Add-Type -AssemblyName System.Drawing

function Generate-Icon {
    param (
        [int]$size,
        [string]$outputPath,
        [bool]$maskable = $false
    )

    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    $rect = New-Object System.Drawing.Rectangle(0, 0, $size, $size)
    $color1 = [System.Drawing.Color]::FromArgb(67, 56, 202) # Indigo 700
    $color2 = [System.Drawing.Color]::FromArgb(99, 102, 241) # Indigo 500
    $bgBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect, $color1, $color2, 45.0)

    if ($maskable) {
        # Full bleed background for maskable
        $g.FillRectangle($bgBrush, $rect)
    } else {
        # Rounded rectangle icon
        $radius = [int]($size * 0.22)
        $path = New-Object System.Drawing.Drawing2D.GraphicsPath
        $d = $radius * 2
        $path.AddArc(0, 0, $d, $d, 180, 90)
        $path.AddArc($size - $d, 0, $d, $d, 270, 90)
        $path.AddArc($size - $d, $size - $d, $d, $d, 0, 90)
        $path.AddArc(0, $size - $d, $d, $d, 90, 90)
        $path.CloseFigure()
        $g.FillPath($bgBrush, $path)
    }

    # Center scale factor (keep maskable inside 65% safe zone, standard within 75%)
    $contentScale = if ($maskable) { 0.60 } else { 0.70 }
    $boxW = $size * $contentScale
    $boxH = $size * $contentScale
    $left = ($size - $boxW) / 2
    $top = ($size - $boxH) / 2
    $right = $left + $boxW
    $bottom = $top + $boxH

    # 1. Corner brackets (Face Detection frame)
    $bracketPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 255, 255), [Math]::Max(2, [int]($size * 0.035)))
    $bracketPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $bracketPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $cornerLen = $boxW * 0.22

    # Top-Left
    $g.DrawLine($bracketPen, [float]$left, [float]($top + $cornerLen), [float]$left, [float]$top)
    $g.DrawLine($bracketPen, [float]$left, [float]$top, [float]($left + $cornerLen), [float]$top)

    # Top-Right
    $g.DrawLine($bracketPen, [float]($right - $cornerLen), [float]$top, [float]$right, [float]$top)
    $g.DrawLine($bracketPen, [float]$right, [float]$top, [float]$right, [float]($top + $cornerLen))

    # Bottom-Left
    $g.DrawLine($bracketPen, [float]$left, [float]($bottom - $cornerLen), [float]$left, [float]$bottom)
    $g.DrawLine($bracketPen, [float]$left, [float]$bottom, [float]($left + $cornerLen), [float]$bottom)

    # Bottom-Right
    $g.DrawLine($bracketPen, [float]($right - $cornerLen), [float]$bottom, [float]$right, [float]$bottom)
    $g.DrawLine($bracketPen, [float]$right, [float]$bottom, [float]$right, [float]($bottom - $cornerLen))

    # 2. Face Silhouette
    $faceCenterX = $size / 2
    $faceCenterY = ($top + $bottom) / 2
    $faceW = $boxW * 0.46
    $faceH = $boxH * 0.56

    $facePen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(224, 231, 255), [Math]::Max(2, [int]($size * 0.025)))
    $g.DrawEllipse($facePen, [float]($faceCenterX - $faceW/2), [float]($faceCenterY - $faceH/2), [float]$faceW, [float]$faceH)

    # Eyes
    $eyeBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
    $eyeRadius = [Math]::Max(2, [int]($size * 0.025))
    $eyeOffsetX = $faceW * 0.24
    $eyeOffsetY = $faceH * 0.12
    $g.FillEllipse($eyeBrush, [float]($faceCenterX - $eyeOffsetX - $eyeRadius), [float]($faceCenterY - $eyeOffsetY - $eyeRadius), [float]($eyeRadius * 2), [float]($eyeRadius * 2))
    $g.FillEllipse($eyeBrush, [float]($faceCenterX + $eyeOffsetX - $eyeRadius), [float]($faceCenterY - $eyeOffsetY - $eyeRadius), [float]($eyeRadius * 2), [float]($eyeRadius * 2))

    # Smile / Mouth
    $mouthW = $faceW * 0.36
    $mouthH = $faceH * 0.20
    $mouthPen = New-Object System.Drawing.Pen([System.Drawing.Color]::White, [Math]::Max(2, [int]($size * 0.022)))
    $g.DrawArc($mouthPen, [float]($faceCenterX - $mouthW/2), [float]($faceCenterY + $faceH*0.12), [float]$mouthW, [float]$mouthH, 0, 180)

    # 3. Horizontal Cyan Scan Line
    $scanPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(220, 56, 189, 248), [Math]::Max(2, [int]($size * 0.02)))
    $scanLineY = $faceCenterY + ($faceH * 0.02)
    $g.DrawLine($scanPen, [float]($left + $boxW * 0.12), [float]$scanLineY, [float]($right - $boxW * 0.12), [float]$scanLineY)

    # Biometric Keypoint Dots
    $cyanBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 56, 189, 248))
    $dotR = [Math]::Max(1.5, [float]($size * 0.016))
    # Forehead
    $g.FillEllipse($cyanBrush, [float]($faceCenterX - $dotR), [float]($faceCenterY - $faceH*0.35 - $dotR), [float]($dotR*2), [float]($dotR*2))
    # Cheekbones
    $g.FillEllipse($cyanBrush, [float]($faceCenterX - $faceW*0.38 - $dotR), [float]($faceCenterY + $faceH*0.05 - $dotR), [float]($dotR*2), [float]($dotR*2))
    $g.FillEllipse($cyanBrush, [float]($faceCenterX + $faceW*0.38 - $dotR), [float]($faceCenterY + $faceH*0.05 - $dotR), [float]($dotR*2), [float]($dotR*2))
    # Chin
    $g.FillEllipse($cyanBrush, [float]($faceCenterX - $dotR), [float]($faceCenterY + $faceH*0.38 - $dotR), [float]($dotR*2), [float]($dotR*2))

    $bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
    Write-Host "Generated: $outputPath ($size x $size)"
}

Generate-Icon -size 512 -outputPath "public/icons/icon-512x512.png" -maskable $false
Generate-Icon -size 192 -outputPath "public/icons/icon-192x192.png" -maskable $false
Generate-Icon -size 512 -outputPath "public/icons/icon-maskable-512x512.png" -maskable $true
Generate-Icon -size 192 -outputPath "public/icons/icon-maskable-192x192.png" -maskable $true
Generate-Icon -size 180 -outputPath "public/icons/apple-touch-icon.png" -maskable $false
Generate-Icon -size 32 -outputPath "public/icons/favicon-32x32.png" -maskable $false
Generate-Icon -size 16 -outputPath "public/icons/favicon-16x16.png" -maskable $false
