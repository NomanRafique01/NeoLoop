# NeoLoop CLI - PowerShell Edition
# Same interface as the CMD/Node version: matrix rain + big ASCII logo + input bar

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

# Theme colours (identical to splash.ts)
$C_BODY    = ansi 57  255 106        # #39ff6a logo body
$C_SHADE   = ansi 31  158  71        # #1f9e47 logo shading
$C_TAG     = ansi 57  255 136 $true  # #39FF88 tagline bold
$C_BORDER  = ansi 57  255 106        # #39ff6a bar borders
$C_PROMPT  = ansi 57  255 106        # #39ff6a ">"
$C_TYPED   = ansi 57  255 136        # #39FF88 typed text
$C_HOLDER  = ansi 31  158  71        # #1f9e47 placeholder
$C_CURSOR  = ansi 215 255 225        # #d7ffe1 cursor block
$C_HEAD    = ansi 215 255 225        # matrix rain head
$PLACEHOLDER = "Type your message or ask NEOLOOP anything..."
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

# Build 21 green shades (index 0=dark .. 20=bright)
$SHADES = for ($i=0;$i -le 20;$i++) {
    $gv = [int](25 + 230*$i/20)
    $rv = if ($i -gt 16) { 40 } else { 0 }
    $bv = [int]($gv * 0.25)
    ansi $rv $gv $bv
}

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
# Returns a string buffer for the entire screen (differential in the caller)
function Compose-Frame($st,$W,$H,$streamH,$logo,$tagline,$inputBuf,$cursorOn,$inputVisible,$shimFrame) {
    # cells: char + ansi-colour prefix, row-major
    $cells  = [string[]]::new($W*$H)
    $colors = [string[]]::new($W*$H)
    for ($i=0;$i -lt $cells.Count;$i++) { $cells[$i]=' '; $colors[$i]='' }

    # 1) matrix rain
    $splashChars  = '*','o','~','.'
    $splashColors = $C_HEAD,$SHADES[17],$SHADES[11],$SHADES[5]

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
                $colors[$i] = $C_HEAD
            } else {
                $dist = $headY - $y
                $t    = [Math]::Max(0, 1-$dist/[Math]::Max(1,$d.len))
                $si   = [Math]::Min($SHADES.Count-1,[Math]::Round($t*$t*($SHADES.Count-1)))
                $colors[$i] = $SHADES[$si]
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
                $colors[$i] = if ($c -eq [char]0x2588) { $C_BODY } else { $C_SHADE }
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
            # shimmer t
            $dist=[Math]::Abs($k-$center)
            if ($dist -lt $bw) {
                $t=0.5*(1+[Math]::Cos(($dist/$bw)*[Math]::PI))
                # map t -> green colour: dark=0 bright=1
                $gv=[int](92+163*$t); $rv=if($t -gt 0.8){[int](57*($t-0.8)/0.2)}else{0}; $bv=[int](50+86*$t)
                $colors[$i] = ansi $rv $gv $bv $true
            } else {
                $colors[$i] = $C_TAG
            }
        }
    }

    # 4) input bar  (3 rows: top rule | prompt | bottom rule)
    if ($inputVisible) {
        $ruleW   = [Math]::Max(1,$W-2)
        $dashedR = [string]([char]0x254C)*$ruleW   # ╌
        $topY    = $streamH
        $prmY    = $streamH+1
        $botY    = $streamH+2

        # write helper inline
        $writeRow = {
            param($ry,$sx,$txt,$col)
            for ($k=0;$k -lt $txt.Length -and $sx+$k -lt $W;$k++) {
                $ii=$ry*$W+$sx+$k
                if ($ii -lt 0 -or $ii -ge $cells.Count) { continue }
                $cells[$ii]=$txt[$k]; $colors[$ii]=$col
            }
        }

        & $writeRow $topY 1 $dashedR $C_BORDER
        & $writeRow $botY 1 $dashedR $C_BORDER
        & $writeRow $prmY 2 '> ' $C_PROMPT

        $contentX=4
        if ($inputBuf.Length -eq 0) {
            $ph=$PLACEHOLDER.Substring(0,[Math]::Min($PLACEHOLDER.Length,[Math]::Max(0,$W-$contentX-1)))
            & $writeRow $prmY $contentX $ph $C_HOLDER
            # cursor at start
            $i=$prmY*$W+$contentX
            if ($i -ge 0 -and $i -lt $cells.Count) {
                $cells[$i]  = if($cursorOn){'█'}else{ if($ph.Length -gt 0){$ph[0]}else{' '} }
                $colors[$i] = if($cursorOn){$C_CURSOR}else{$C_HOLDER}
            }
        } else {
            $maxV=[Math]::Max(1,$W-$contentX-1)
            $vis=$inputBuf.Substring(0,[Math]::Min($inputBuf.Length,$maxV))
            & $writeRow $prmY $contentX $vis $C_TYPED
            # cursor at end
            $curX=$contentX+$vis.Length
            $i=$prmY*$W+$curX
            if ($i -ge 0 -and $i -lt $cells.Count -and $curX -lt $W) {
                $cells[$i]  = if($cursorOn){'█'}else{' '}
                $colors[$i] = if($cursorOn){$C_CURSOR}else{$C_TYPED}
            }
        }
    }

    # 5) build output string row by row
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

#region ── Disable QuickEdit Mode (prevents clicking from pausing animation) ───
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
            // 0x0040 = ENABLE_QUICK_EDIT_MODE, 0x0080 = ENABLE_EXTENDED_FLAGS
            uint newMode = (mode & ~0x0040u) | 0x0080u;
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

    # Hide cursor + switch to alternate buffer
    [Console]::Write($ALT_ON + $HIDE + (clr_screen))

    $W = [Math]::Max(20,$Host.UI.RawUI.WindowSize.Width-1)
    $H = [Math]::Max(8, $Host.UI.RawUI.WindowSize.Height)

    $logo   = Get-BigLogo $title
    $logoH  = if ($logo) { $logo.Count } else { 1 }
    $y0     = [Math]::Max(0,[Math]::Floor($H/4 - $logoH/2))
    $tagRow = $y0 + $logoH + 1

    # Rain fills rows 0 .. streamH-1
    $streamH = [Math]::Min([Math]::Max(6,$H-4), $tagRow+1)

    $stream = New-Stream $W $streamH

    # Animation timing
    $FPS        = 20
    $frameMs    = 1000/$FPS
    $frame      = 0
    $shimFrame  = 0
    $cursorOn   = $true
    $cursorTick = 0
    $CURSOR_BLINK_FRAMES = [Math]::Round(530/$frameMs)  # ~11 frames

    $inputBuf     = ''
    $inputVisible = $false   # shown after STREAM_START_FRAME
    $STREAM_START  = 15      # ~0.75s before rain + input appear
    $logs          = [System.Collections.Generic.List[string]]::new()

    $running = $true
    # Save original console state
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

            # Resize check
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

            $frame_str = Compose-Frame $stream $W $H $streamH $logo $tagline $inputBuf $cursorOn $inputVisible $shimFrame
            [Console]::Write($frame_str)

            # ── keyboard (non-blocking) ──────────────────────────────────────
            while ($true) {
                try { if (-not [Console]::KeyAvailable) { break } } catch { break }
                $ki = [Console]::ReadKey($true)

                # Ctrl-C
                if ($ki.Key -eq 'C' -and ($ki.Modifiers -band [ConsoleModifiers]::Control)) {
                    $running = $false; break
                }

                if (-not $inputVisible) { continue }

                switch ($ki.Key) {
                    'Enter' {
                        $trimmed = $inputBuf.Trim()
                        if ($trimmed) {
                            $logs.Add("> $trimmed")
                            $logs.Add("[neoloop] processing: `"$trimmed`"")
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

            # ── sleep remainder of frame ─────────────────────────────────────
            $elapsed = ([DateTime]::UtcNow.Ticks - $t0)/10000   # ms
            $sleep   = [Math]::Max(0,$frameMs - $elapsed)
            if ($sleep -gt 0) { Start-Sleep -Milliseconds $sleep }
        }
    } finally {
        # Restore terminal
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
