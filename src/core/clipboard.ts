/**
 * NeoLoop CLI — Cross-Platform Clipboard System
 *
 * Provides non-blocking OS clipboard integration (read, write) with
 * OSC 52 terminal clipboard tunneling support.
 */

import { spawn, spawnSync } from 'child_process';

function fallbackPowershellCopy(text: string): boolean {
  try {
    const b64 = Buffer.from(text, 'utf8').toString('base64');
    const ps = [
      '[Console]::OutputEncoding = [System.Text.Encoding]::UTF8;',
      `[System.Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${b64}')) | Set-Clipboard`,
    ].join(' ');
    const child = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-NoLogo', '-Command', ps], {
      windowsHide: true,
      stdio: 'ignore',
    });
    child.on('error', () => {});
    return true;
  } catch {
    return false;
  }
}

/**
 * Write plain text to the system clipboard and broadcast OSC 52 sequence.
 */
export function copyToClipboard(text: string): boolean {
  if (typeof text !== 'string') return false;

  // 1. Send OSC 52 sequence directly to terminal emulator
  try {
    if (process.stdout && process.stdout.isTTY) {
      const b64 = Buffer.from(text, 'utf8').toString('base64');
      process.stdout.write(`\x1b]52;c;${b64}\x07`);
    }
  } catch {
    /* ignore OSC 52 error */
  }

  // 2. Write to OS clipboard
  if (process.platform === 'win32') {
    try {
      const child = spawn('clip.exe', [], {
        windowsHide: true,
        stdio: ['pipe', 'ignore', 'ignore'],
      });
      child.on('error', () => {
        fallbackPowershellCopy(text);
      });
      if (child.stdin) {
        child.stdin.on('error', () => {
          fallbackPowershellCopy(text);
        });
        child.stdin.write(text, 'utf8');
        child.stdin.end();
      }
      return true;
    } catch {
      return fallbackPowershellCopy(text);
    }
  } else if (process.platform === 'darwin') {
    try {
      const child = spawn('pbcopy', [], { stdio: ['pipe', 'ignore', 'ignore'] });
      child.stdin.write(text, 'utf8');
      child.stdin.end();
      return true;
    } catch {
      return false;
    }
  } else {
    // Linux / BSD: try xclip then wl-copy
    try {
      const child = spawn('xclip', ['-selection', 'clipboard'], {
        stdio: ['pipe', 'ignore', 'ignore'],
      });
      child.on('error', () => {
        try {
          const wl = spawn('wl-copy', [], { stdio: ['pipe', 'ignore', 'ignore'] });
          wl.stdin.write(text, 'utf8');
          wl.stdin.end();
        } catch {
          /* ignore */
        }
      });
      child.stdin.write(text, 'utf8');
      child.stdin.end();
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Read plain text asynchronously from the system clipboard.
 * Guaranteed never to block the terminal animation loop.
 */
export function readFromClipboard(): Promise<string> {
  return new Promise(resolve => {
    if (process.platform === 'win32') {
      try {
        const child = spawn(
          'powershell.exe',
          [
            '-NoProfile',
            '-NonInteractive',
            '-NoLogo',
            '-Command',
            '[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; Get-Clipboard',
          ],
          { windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'] }
        );

        let out = '';
        child.stdout.on('data', chunk => {
          out += chunk.toString('utf8');
        });

        const timer = setTimeout(() => {
          try {
            child.kill();
          } catch {
            /* ignore */
          }
          resolve(out.replace(/\r?\n$/, ''));
        }, 1500);

        child.on('close', () => {
          clearTimeout(timer);
          resolve(out.replace(/\r?\n$/, ''));
        });

        child.on('error', () => {
          clearTimeout(timer);
          resolve('');
        });
      } catch {
        resolve('');
      }
    } else if (process.platform === 'darwin') {
      try {
        const child = spawn('pbpaste', [], { stdio: ['ignore', 'pipe', 'ignore'] });
        let out = '';
        child.stdout.on('data', chunk => {
          out += chunk.toString('utf8');
        });
        child.on('close', () => resolve(out));
        child.on('error', () => resolve(''));
      } catch {
        resolve('');
      }
    } else {
      try {
        const child = spawn('xclip', ['-selection', 'clipboard', '-o'], {
          stdio: ['ignore', 'pipe', 'ignore'],
        });
        let out = '';
        child.stdout.on('data', chunk => {
          out += chunk.toString('utf8');
        });
        child.on('close', () => resolve(out));
        child.on('error', () => {
          try {
            const wl = spawn('wl-paste', [], { stdio: ['ignore', 'pipe', 'ignore'] });
            let wlOut = '';
            wl.stdout.on('data', chunk => {
              wlOut += chunk.toString('utf8');
            });
            wl.on('close', () => resolve(wlOut));
            wl.on('error', () => resolve(''));
          } catch {
            resolve('');
          }
        });
      } catch {
        resolve('');
      }
    }
  });
}

/**
 * Read plain text synchronously from the system clipboard.
 */
export function readFromClipboardSync(): string {
  if (process.platform === 'win32') {
    try {
      const res = spawnSync(
        'powershell',
        [
          '-NoProfile',
          '-NonInteractive',
          '-Command',
          '[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; Get-Clipboard',
        ],
        { encoding: 'utf8', timeout: 1000, windowsHide: true }
      );
      return (res.stdout || '').replace(/\r?\n$/, '');
    } catch {
      return '';
    }
  } else if (process.platform === 'darwin') {
    try {
      const res = spawnSync('pbpaste', [], { encoding: 'utf8', timeout: 1000 });
      return res.stdout || '';
    } catch {
      return '';
    }
  } else {
    try {
      const res = spawnSync('xclip', ['-selection', 'clipboard', '-o'], {
        encoding: 'utf8',
        timeout: 1000,
      });
      if (res.stdout) return res.stdout;
      const wl = spawnSync('wl-paste', [], { encoding: 'utf8', timeout: 1000 });
      return wl.stdout || '';
    } catch {
      return '';
    }
  }
}
