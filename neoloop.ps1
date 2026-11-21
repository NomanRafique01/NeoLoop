# NeoLoop CLI - PowerShell Edition
# Same interface as the CMD/Node version: matrix rain + big ASCII logo + input bar + theme engine

#region ── ANSI helpers ────────────────────────────────────────────────────────
function ansi($r,$g,$b,$bold=$false) {
    if ($bold) { "`e[1;38;2;${r};${g};${b}m" } else { "`e[0;38;2;${r};${g};${b}m" }
}
$RESET   = "`e[0m"
$HIDE    = "`e[?25l"
$SHOW    = "`e[?25h"
$ALT_ON  = "`e[?1049h"
$ALT_OFF = "`e[?1049l"
function pos($row,$col) { "`e[$row;${col}H" }
function clr_screen()   { "`e[2J`e[H" }

# Theme definition: Phantom (Default)
$GLOBAL:CurrentTheme = 'phantom'

function Set-NeoTheme($themeName) {
    $t = $themeName.ToLower().Trim()
    if ($t -eq 'matrix') {
        $GLOBAL:CurrentTheme = 'matrix'
        $GLOBAL:C_BODY    = ansi 57  255 106        # #39ff6a logo body
        $GLOBAL:C_SHADE   = ansi 31  158  71        # #1f9e47 logo shading
        $GLOBAL:C_TAG     = ansi 57  255 136 $true  # #39FF88 tagline bold
        $GLOBAL:C_BORDER  = ansi 31  158  71        # #1f9e47 bar borders
        $GLOBAL:C_PROMPT  = ansi 57  255 106        # #39ff6a ">"
        $GLOBAL:C_TYPED   = ansi 57  255 136        # #39FF88 typed text
        $GLOBAL:C_HOLDER  = ansi 31  158  71        # #1f9e47 placeholder
        $GLOBAL:C_CURSOR  = ansi 215 255 225        # #d7ffe1 cursor block
        $GLOBAL:C_HEAD    = ansi 215 255 225        # matrix rain head
        $GLOBAL:SHADES = for ($i=0;$i -le 20;$i++) {
            $gv = [int](25 + 230*$i/20)
            $rv = if ($i -gt 16) { 40 } else { 0 }
            $bv = [int]($gv * 0.25)
            ansi $rv $gv $bv
        }
    } elseif ($t -eq 'akira') {
        $GLOBAL:CurrentTheme = 'akira'
        $GLOBAL:C_BODY    = ansi 255 30  68         # #FF1E44 crimson logo body
        $GLOBAL:C_SHADE   = ansi 153 11  34         # #990B22 logo shadow
        $GLOBAL:C_TAG     = ansi 0   229 255 $true  # #00E5FF cyan tagline
        $GLOBAL:C_BORDER  = ansi 43  23  54         # #2B1736 dark plum border
        $GLOBAL:C_PROMPT  = ansi 255 184 0          # #FFB800 molten gold prompt
        $GLOBAL:C_TYPED   = ansi 245 235 230        # #F5EBE6 warm white text
        $GLOBAL:C_HOLDER  = ansi 92  74  99         # #5C4A63 muted plum placeholder
        $GLOBAL:C_CURSOR  = ansi 255 30  68         # #FF1E44 crimson cursor block
        $GLOBAL:C_HEAD    = ansi 255 248 231        # #FFF8E7 star-white head
        $GLOBAL:SHADES = for ($i=0;$i -le 20;$i++) {
            $f = 0.08 + 0.92 * [Math]::Pow(($i/20.0), 1.4)
            $rv = [int](7*0.4 + 255*$f)
            $gv = [int](5*0.4 + 184*$f)
            $bv = [int](9*0.4 + 0*$f)
            ansi $rv $gv $bv
        }
    } else {
        # Phantom theme (default)
        $GLOBAL:CurrentTheme = 'phantom'
        $GLOBAL:C_BODY    = ansi 0   255 163        # #00FFA3 spectral mint logo body
        $GLOBAL:C_SHADE   = ansi 0   122 77         # #007A4D deep jade shadow
        $GLOBAL:C_TAG     = ansi 255 183 3   $true  # #FFB703 solar amber tagline
        $GLOBAL:C_BORDER  = ansi 32  39  56         # #202738 dark steel border
        $GLOBAL:C_PROMPT  = ansi 0   255 163        # #00FFA3 spectral mint ">"
        $GLOBAL:C_TYPED   = ansi 237 242 247        # #EDF2F7 crisp ghost white text
        $GLOBAL:C_HOLDER  = ansi 74  87  109        # #4A576D muted slate placeholder
        $GLOBAL:C_CURSOR  = ansi 0   255 163        # #00FFA3 spectral mint cursor
        $GLOBAL:C_HEAD    = ansi 243 232 255        # #F3E8FF lilac-white head
        $GLOBAL:SHADES = for ($i=0;$i -le 20;$i++) {
            $f = 0.08 + 0.92 * [Math]::Pow(($i/20.0), 1.4)
            $rv = [int](5*0.4 + 168*$f)
            $gv = [int](6*0.4 + 85*$f)
            $bv = [int](10*0.4 + 247*$f)
            ansi $rv $gv $bv
        }
    }
}
Set-NeoTheme 'phantom'

$PLACEHOLDER = "Type your message or ask NEOLOOP anything (try /theme)..."
#endregion

#region ── Big block font (same glyphs as splash.ts) ──────────────────────────
$FONT = @{
  'N' = @('███╗   ██╗','████╗  ██║','██╔██╗ ██║','██║╚██╗██║','██║ ╚████║','╚═╝  ╚═══╝')
  'E' = @('███████╗','██╔════╝','█████╗  ','██╔══╝  ','███████╗','╚══════╝')
  'O' = @(' ██████╗ ','██╔═══██╗','██║   ██║','██║   ██║','╚██████╔╝',' ╚═════╝ ')
  'L' = @('██╗     ','██║     ','██║     ','██║     ','███████╗','╚══════╝')
  'P' = @('██████╗ ','██╔══██╗','██████╔╝','██╔═══╝ ','██║     ','╚═╝     ')
}

function Get-BigLogo($name) {
    $rows = @('','','','','','')
    foreach ($ch in $name.ToUpper().ToCharArray()) {
        $g = $FONT["$ch"]
        if (-not $g) { return $null }
        for ($r=0;$r -lt 6;$r++) { $rows[$r] += $g[$r] }
    }
    $rows
}
#endregion

#region ── Matrix rain ─────────────────────────────────────────────────────────
$CHARSET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'.ToCharArray()
function RndChar { $CHARSET[(Get-Random -Max $CHARSET.Count)] }

function New-Drop($h,$x,$pause=0) {
    $len = [Math]::Max(3,[Math]::Min($h-1, 5+(Get-Random -Max 4)))
    $sp  = @(2,1,2,2,3,2,1,2)[([Math]::Floor($x/2)) % 8]
    [pscustomobject]@{
        x=$x; y=-1; tailY=(-1-$len); speedTicks=$sp; tickAcc=0
        len=$len; floorY=([Math]::Max(0,$h-1)); landed=$false
        splash=0; splashMax=4; pause=$pause
    }
}

function New-Stream($w,$h) {
    $numLanes = [Math]::Max(1,[Math]::Floor($w/2))
    $maxPause = [Math]::Min(30,[Math]::Max(16,[int]($numLanes*0.6)))
    $drops = @($null)*$w
    $lane  = 0
    $grid  = for ($x=0;$x -lt $w;$x++) {
        ,@(for ($y=0;$y -lt $h;$y++) { RndChar })
    }
    for ($x=0;$x -lt $w;$x++) {
        if ($x % 2 -eq 0) {
            $rank    = ($lane*13) % $numLanes
            $initPause = [Math]::Floor(($rank/$numLanes)*$maxPause)
            $drops[$x] = New-Drop $h $x $initPause
            $lane++
        }
    }
    [pscustomobject]@{ w=$w; h=$h; drops=$drops; grid=$grid; tick=0 }
}

function Step-Stream($st) {
    $st.tick++
    $mutate = ($st.tick % 2 -eq 0)
    for ($x=0;$x -lt $st.w;$x++) {
        $d = $st.drops[$x]; if ($null -eq $d) { continue }
        if ($d.pause -gt 0) { $d.pause--; continue }
        $d.tickAcc++
        if ($d.tickAcc -ge $d.speedTicks) {
            $d.tickAcc = 0
            if (-not $d.landed) {
                $d.y++; $d.tailY++
                if ($d.y -ge 0 -and $d.y -lt $st.h) { $st.grid[$x][$d.y] = RndChar }
                if ($d.y -ge $d.floorY) { $d.y=$d.floorY; $d.landed=$true; $d.splash=0 }
            } else {
                $d.tailY++; $d.splash++
                if ($d.tailY -ge $d.floorY) {
                    $d.y=-1; $d.tailY=(-1-$d.len); $d.landed=$false
                    $d.splash=0; $d.pause=($d.speedTicks*3+(Get-Random -Max 4))
                }
            }
        } elseif ($d.landed -and $d.splash -lt $d.splashMax) { $d.splash++ }

        if ($mutate -and ((Get-Random -Max 100) -lt 20)) {
            $head = if ($d.landed) { $d.floorY } else { $d.y }
            $s    = [Math]::Max(0,$d.tailY+1)
            if ($head -gt $s) {
                $my = $s + (Get-Random -Max ([Math]::Max(1,$head-$s)))
                if ($my -ge 0 -and $my -lt $st.h) { $st.grid[$x][$my] = RndChar }
            }
        }
    }
}
#endregion

#region ── Compose & render one frame ─────────────────────────────────────────
function Compose-Frame($st,$W,$H,$streamH,$logo,$tagline,$inputBuf,$cursorOn,$inputVisible,$shimFrame,$logs) {
    $cells  = [string[]]::new($W*$H)
    $colors = [string[]]::new($W*$H)
    for ($i=0;$i -lt $cells.Count;$i++) { $cells[$i]=' '; $colors[$i]='' }

    # 1) matrix rain
    $splashChars  = '*','o','~','.'
    $splashColors = $GLOBAL:C_HEAD,$GLOBAL:SHADES[17],$GLOBAL:SHADES[11],$GLOBAL:SHADES[5]

    for ($x=0;$x -lt $st.w;$x++) {
        $d = $st.drops[$x]; if ($null -eq $d -or $d.pause -gt 0) { continue }
        $headY  = if ($d.landed) { $d.floorY } else { $d.y }
        $startY = [Math]::Max(0,$d.tailY+1)
        $endY   = if ($d.landed) { $d.floorY-1 } else { [Math]::Min($d.floorY,$d.y) }

        for ($y=$startY;$y -le $endY;$y++) {
            if ($y -lt 0 -or $y -ge $streamH) { continue }
            $i = $y*$W+$x
            $cells[$i] = $st.grid[$x][$y]
            if ($y -eq $d.y -and -not $d.landed) {
                $colors[$i] = $GLOBAL:C_HEAD
            } else {
                $dist = $headY - $y
                $t    = [Math]::Max(0, 1-$dist/[Math]::Max(1,$d.len))
                $si   = [Math]::Min($GLOBAL:SHADES.Count-1,[Math]::Round($t*$t*($GLOBAL:SHADES.Count-1)))
                $colors[$i] = $GLOBAL:SHADES[$si]
            }
        }
        if ($d.landed -and $d.splash -lt $d.splashMax -and $d.floorY -ge 0 -and $d.floorY -lt $streamH) {
            $i = $d.floorY*$W+$x
            $si = [Math]::Min($splashChars.Count-1,$d.splash)
            $cells[$i]  = $splashChars[$si]
            $colors[$i] = $splashColors[$si]
        }
    }

    # 2) logo
    if ($logo) {
        $logoW = $logo[0].Length
        $x0    = [Math]::Max(0,[Math]::Floor(($W-$logoW)/2))
        $y0    = [Math]::Max(0,[Math]::Floor($H/4 - $logo.Count/2))

        # clear strip behind logo
        $cx0=[Math]::Max(0,$x0-3); $cx1=[Math]::Min($W,$x0+$logoW+3)
        for ($y=[Math]::Max(0,$y0-1);$y -lt $streamH;$y++) {
            for ($x=$cx0;$x -lt $cx1;$x++) { $cells[$y*$W+$x]=' '; $colors[$y*$W+$x]='' }
        }

        for ($r=0;$r -lt $logo.Count;$r++) {
            $row=$logo[$r]
            for ($k=0;$k -lt $row.Length;$k++) {
                $c = $row[$k]
                if ($c -eq ' ') { continue }
                $i = ($y0+$r)*$W+$x0+$k
                if ($i -lt 0 -or $i -ge $cells.Count) { continue }
                $cells[$i]  = $c
                $colors[$i] = if ($c -eq [char]0x2588) { $GLOBAL:C_BODY } else { $GLOBAL:C_SHADE }
            }
        }

        # 3) tagline shimmer
        $tagRow = $y0 + $logo.Count + 1
        $tx0    = [Math]::Max(0,[Math]::Floor(($W-$tagline.Length)/2))
        $SWEEP  = 24; $bw=4.0; $span=$tagline.Length+$bw
        $center = -$bw + (($shimFrame % $SWEEP)/$SWEEP)*$span

        for ($k=0;$k -lt $tagline.Length;$k++) {
            $c=$tagline[$k]; if ($c -eq ' ') { continue }
            $i=$tagRow*$W+$tx0+$k
            if ($i -lt 0 -or $i -ge $cells.Count) { continue }
            $cells[$i] = $c
            $dist=[Math]::Abs($k-$center)
            if ($dist -lt $bw) {
                $t=0.5*(1+[Math]::Cos(($dist/$bw)*[Math]::PI))
                if ($GLOBAL:CurrentTheme -eq 'phantom') {
                    $rv=255; $gv=[int](183 + (255-183)*$t); $bv=[int](3 + (255-3)*$t)
                } else {
                    $gv=[int](92+163*$t); $rv=if($t -gt 0.8){[int](57*($t-0.8)/0.2)}else{0}; $bv=[int](50+86*$t)
                }
                $colors[$i] = ansi $rv $gv $bv $true
            } else {
                $colors[$i] = $GLOBAL:C_TAG
            }
        }
    }

    # 4) input bar  (3 rows: top rule | prompt | bottom rule)
    if ($inputVisible) {
        $ruleW   = [Math]::Max(1,$W-2)
        $dashedR = '-' * $ruleW
        $topY    = $streamH
        $prmY    = $streamH+1
        $botY    = $streamH+2

        $writeRow = {
            param($ry,$sx,$txt,$col)
            for ($k=0;$k -lt $txt.Length -and $sx+$k -lt $W;$k++) {
                $ii=$ry*$W+$sx+$k
                if ($ii -lt 0 -or $ii -ge $cells.Count) { continue }
                $cells[$ii]=$txt[$k]; $colors[$ii]=$col
            }
        }

        & $writeRow $topY 1 $dashedR $GLOBAL:C_BORDER
        & $writeRow $botY 1 $dashedR $GLOBAL:C_BORDER
        & $writeRow $prmY 2 '> ' $GLOBAL:C_PROMPT

        $contentX=4
        if ($inputBuf.Length -eq 0) {
            $ph=$PLACEHOLDER.Substring(0,[Math]::Min($PLACEHOLDER.Length,[Math]::Max(0,$W-$contentX-1)))
            & $writeRow $prmY $contentX $ph $GLOBAL:C_HOLDER
            $i=$prmY*$W+$contentX
            if ($i -ge 0 -and $i -lt $cells.Count) {
                $cells[$i]  = if($cursorOn){'█'}else{ if($ph.Length -gt 0){$ph[0]}else{' '} }
                $colors[$i] = if($cursorOn){$GLOBAL:C_CURSOR}else{$GLOBAL:C_HOLDER}
            }
        } else {
            $maxV=[Math]::Max(1,$W-$contentX-1)
            $vis=$inputBuf.Substring(0,[Math]::Min($inputBuf.Length,$maxV))
            & $writeRow $prmY $contentX $vis $GLOBAL:C_TYPED
            $curX=$contentX+$vis.Length
            $i=$prmY*$W+$curX
            if ($i -ge 0 -and $i -lt $cells.Count -and $curX -lt $W) {
                $cells[$i]  = if($cursorOn){'█'}else{' '}
                $colors[$i] = if($cursorOn){$GLOBAL:C_CURSOR}else{$GLOBAL:C_TYPED}
            }
        }

        # 5) logs below
        $outStartY = $streamH + 3
        $availR = [Math]::Max(0, $H - $outStartY)
        if ($availR -gt 0 -and $logs.Count -gt 0) {
            $startIdx = [Math]::Max(0, $logs.Count - $availR)
            for ($idx = 0; $idx -lt [Math]::Min($availR, $logs.Count - $startIdx); $idx++) {
                $l = $logs[$startIdx + $idx]
                $lCol = if ($l.StartsWith('> ')) { $GLOBAL:C_HOLDER } elseif ($l.Contains('[theme]')) { ansi 97 221 170 } else { $GLOBAL:C_TYPED }
                & $writeRow ($outStartY + $idx) 2 $l.Substring(0, [Math]::Min($l.Length, [Math]::Max(1, $W - 3))) $lCol
            }
        }
    }

    # 6) build output string row by row
    $sb = [System.Text.StringBuilder]::new($W*$H*20)
    for ($y=0;$y -lt $H;$y++) {
        [void]$sb.Append((pos ($y+1) 1))
        $lastCol=''
        for ($x=0;$x -lt $W;$x++) {
            $i=$y*$W+$x
            $col=$colors[$i]
            if ($col -ne $lastCol) {
                if ($col) { [void]$sb.Append($col) } else { [void]$sb.Append($RESET) }
                $lastCol=$col
            }
            [void]$sb.Append($cells[$i])
        }
    }
    [void]$sb.Append($RESET)
    $sb.ToString()
}
#endregion

#region ── Disable QuickEdit Mode ───────────────────────────────────────────────
try {
    $qeDef = @'
using System;
using System.Runtime.InteropServices;
public static class Win32QuickEdit {
    [DllImport("kernel32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    public static extern IntPtr CreateFile(string f, uint da, uint sm, IntPtr sa, uint cd, uint fa, IntPtr tf);

    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern bool GetConsoleMode(IntPtr hConsoleHandle, out uint lpMode);

    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern bool SetConsoleMode(IntPtr hConsoleHandle, uint dwMode);

    public static uint Disable() {
        IntPtr h = CreateFile("CONIN$", 0x80000000u | 0x40000000u, 1 | 2, IntPtr.Zero, 3, 0, IntPtr.Zero);
        if (h == (IntPtr)(-1)) return 0;
        uint mode = 0;
        if (GetConsoleMode(h, out mode)) {
            uint newMode = (mode & ~0x0040u) | 0x0080u | 0x0010u | 0x0200u;
            SetConsoleMode(h, newMode);
        }
        return mode;
    }

    public static void Restore(uint mode) {
        if (mode != 0) {
            IntPtr h = CreateFile("CONIN$", 0x80000000u | 0x40000000u, 1 | 2, IntPtr.Zero, 3, 0, IntPtr.Zero);
            if (h != (IntPtr)(-1)) {
                SetConsoleMode(h, mode | 0x0080u);
            }
        }
    }
}
'@
    Add-Type -TypeDefinition $qeDef -ErrorAction SilentlyContinue
} catch {}
#endregion

#region ── Main loop ───────────────────────────────────────────────────────────
function Start-NeoLoop {
    $title   = 'NEOLOOP'
    $tagline = 'THINK. CODE. EXECUTE.'

    $origConsoleMode = 0
    try {
        if ([Win32QuickEdit]) {
            $origConsoleMode = [Win32QuickEdit]::Disable()
        }
    } catch {}

    [Console]::Write($ALT_ON + $HIDE + (clr_screen))

    $W = [Math]::Max(20,$Host.UI.RawUI.WindowSize.Width-1)
    $H = [Math]::Max(8, $Host.UI.RawUI.WindowSize.Height)

    $logo   = Get-BigLogo $title
    $logoH  = if ($logo) { $logo.Count } else { 1 }
    $y0     = [Math]::Max(0,[Math]::Floor($H/4 - $logoH/2))
    $tagRow = $y0 + $logoH + 1

    $streamH = [Math]::Min([Math]::Max(6,$H-4), $tagRow+1)
    $stream = New-Stream $W $streamH

    $FPS        = 20
    $frameMs    = 1000/$FPS
    $frame      = 0
    $shimFrame  = 0
    $cursorOn   = $true
    $cursorTick = 0
    $CURSOR_BLINK_FRAMES = [Math]::Round(530/$frameMs)

    $inputBuf     = ''
    $inputVisible = $false
    $STREAM_START  = 15
    $logs          = [System.Collections.Generic.List[string]]::new()

    $running = $true
    $origTitle = $Host.UI.RawUI.WindowTitle
    $Host.UI.RawUI.WindowTitle = 'NeoLoop'

    try {
        while ($running) {
            $t0 = [DateTime]::UtcNow.Ticks

            $frame++; $shimFrame++
            $cursorTick++
            if ($cursorTick -ge $CURSOR_BLINK_FRAMES) { $cursorOn = -not $cursorOn; $cursorTick=0 }

            if ($frame -ge $STREAM_START) {
                Step-Stream $stream
                $inputVisible = $true
            }

            $newW = [Math]::Max(20,$Host.UI.RawUI.WindowSize.Width-1)
            $newH = [Math]::Max(8, $Host.UI.RawUI.WindowSize.Height)
            if ($newW -ne $W -or $newH -ne $H) {
                $W=$newW; $H=$newH
                $y0      = [Math]::Max(0,[Math]::Floor($H/4 - $logoH/2))
                $tagRow  = $y0 + $logoH + 1
                $streamH = [Math]::Min([Math]::Max(6,$H-4),$tagRow+1)
                $stream  = New-Stream $W $streamH
                [Console]::Write((clr_screen))
            }

            $frame_str = Compose-Frame $stream $W $H $streamH $logo $tagline $inputBuf $cursorOn $inputVisible $shimFrame $logs
            [Console]::Write($frame_str)

            while ($true) {
                try { if (-not [Console]::KeyAvailable) { break } } catch { break }
                $ki = [Console]::ReadKey($true)

                if ($ki.Key -eq 'C' -and ($ki.Modifiers -band [ConsoleModifiers]::Control)) {
                    if ($inputBuf.Length -gt 0) {
                        try { Set-Clipboard -Value $inputBuf } catch {}
                        $logs.Add("[clipboard] Copied input to clipboard")
                        continue
                    }
                    $running = $false; break
                }

                if ($ki.Key -eq 'V' -and ($ki.Modifiers -band [ConsoleModifiers]::Control)) {
                    try {
                        $clip = Get-Clipboard -Raw
                        if ($clip) {
                            $clean = ($clip -replace "[\r\n]+", " ").Trim()
                            $inputBuf += $clean
                        }
                    } catch {}
                    continue
                }

                if ($ki.Key -eq 'X' -and ($ki.Modifiers -band [ConsoleModifiers]::Control)) {
                    if ($inputBuf.Length -gt 0) {
                        try { Set-Clipboard -Value $inputBuf } catch {}
                        $inputBuf = ''
                    }
                    continue
                }

                if (-not $inputVisible) { continue }

                switch ($ki.Key) {
                    'Enter' {
                        if (($ki.Modifiers -band [ConsoleModifiers]::Shift) -or ($ki.Modifiers -band [ConsoleModifiers]::Alt)) {
                            $inputBuf += "`n"
                            break
                        }
                        $trimmed = $inputBuf.Trim()
                        if ($trimmed) {
                            $logs.Add("> $trimmed")
                            if ($trimmed.StartsWith('/theme ') -or $trimmed -eq '/theme' -or $trimmed -eq '/themes') {
                                $tParts = $trimmed.Split(' ', [System.StringSplitOptions]::RemoveEmptyEntries)
                                if ($tParts.Count -ge 2) {
                                    $tName = $tParts[1]
                                    Set-NeoTheme $tName
                                    $logs.Add("[theme] Switched to `"$GLOBAL:CurrentTheme`"")
                                } else {
                                    $logs.Add("[theme] Active: $GLOBAL:CurrentTheme")
                                    $logs.Add("[theme] Available: phantom, akira, matrix")
                                    $logs.Add("[theme] Usage: /theme <name>")
                                }
                            } elseif ($trimmed -eq '/help') {
                                $logs.Add("[commands] /theme <name>, /themes, /clear, /help")
                            } else {
                                $logs.Add("[neoloop] processing: `"$trimmed`"")
                            }
                        }
                        $inputBuf = ''
                        break
                    }
                    'Backspace' {
                        if ($inputBuf.Length -gt 0) { $inputBuf=$inputBuf.Substring(0,$inputBuf.Length-1) }
                        break
                    }
                    'Escape' { $inputBuf=''; break }
                    default {
                        $c = $ki.KeyChar
                        if ($c -ge ' ' -and [int]$c -lt 127) { $inputBuf += $c }
                    }
                }
            }

            $elapsed = ([DateTime]::UtcNow.Ticks - $t0)/10000
            $sleep   = [Math]::Max(0,$frameMs - $elapsed)
            if ($sleep -gt 0) { Start-Sleep -Milliseconds $sleep }
        }
    } finally {
        [Console]::Write($ALT_OFF + $SHOW + $RESET)
        $Host.UI.RawUI.WindowTitle = $origTitle
        try {
            if ([Win32QuickEdit] -and $origConsoleMode) {
                [Win32QuickEdit]::Restore($origConsoleMode)
            }
        } catch {}
    }
}

Start-NeoLoop
