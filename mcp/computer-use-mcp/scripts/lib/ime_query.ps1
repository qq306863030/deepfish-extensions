# ime_query.ps1
# Output format (one per line):
#   TITLE=<window title>
#   LAYOUT=0x<hex>
#   ISCN=<True|False>
#
# We use multiple strategies to detect the IME:
#   1. Foreground window keyboard layout
#   2. Current thread (idThread=0) keyboard layout (most reliable)

# Ensure UTF-8 output so callers (Node.js) can read non-ASCII window titles
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
using System.Text;
public class I {
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint pid);
  [DllImport("user32.dll")] public static extern IntPtr GetKeyboardLayout(uint idThread);
  [DllImport("user32.dll", CharSet = CharSet.Auto)] public static extern int GetWindowText(IntPtr hWnd, StringBuilder s, int n);
}
"@

# Strategy 1: foreground window
$hwnd = [I]::GetForegroundWindow()
$sb = New-Object System.Text.StringBuilder 256
[void][I]::GetWindowText($hwnd, $sb, 256)
$title = $sb.ToString()
$procId = 0
[void][I]::GetWindowThreadProcessId($hwnd, [ref]$procId)
$layoutFg = [I]::GetKeyboardLayout($procId)

# Strategy 2: current thread
$layoutCur = [I]::GetKeyboardLayout(0)

# Pick the first non-zero layout
$layout = $layoutCur
if ($layout.ToInt64() -eq 0) { $layout = $layoutFg }

$hex = '0x' + $layout.ToString('X')
$low = $layout.ToInt64() -band 0xFFFF
$isCn = $low -in 0x0804, 0x0404, 0x0C04, 0x1004, 0x1404

Write-Output "TITLE=$title"
Write-Output "LAYOUT=$hex"
Write-Output "ISCN=$isCn"
