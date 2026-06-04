Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Image]::FromFile('f:\Youtube 2.0\src\assets\icon-v2.png')
$bmp = new-object System.Drawing.Bitmap 128, 128
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.DrawImage($img, 0, 0, 128, 128)
$bmp.Save('f:\Youtube 2.0\src\assets\icon-128.png', [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose()
$bmp.Dispose()
$img.Dispose()
