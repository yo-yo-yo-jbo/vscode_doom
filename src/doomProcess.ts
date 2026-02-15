import { ChildProcess, spawn } from 'child_process';
import * as path from 'path';
import { EventEmitter } from 'events';

const MAGIC = Buffer.from('DOOM');
const FRAME_HEADER_SIZE = 8; // 4 magic + 4 frame number
const PIXEL_DATA_SIZE = 640 * 400 * 4; // 1,024,000 bytes
const FRAME_SIZE = FRAME_HEADER_SIZE + PIXEL_DATA_SIZE;

export class DoomProcess extends EventEmitter {
    private process: ChildProcess | null = null;
    private buffer: Buffer = Buffer.alloc(0);
    private _running = false;

    get running(): boolean {
        return this._running;
    }

    start(extensionPath: string, wadPath: string): void {
        if (this._running) return;

        const binaryPath = path.join(extensionPath, 'bin', 'doom_vscode');
        this.process = spawn(binaryPath, ['-iwad', wadPath], {
            stdio: ['pipe', 'pipe', 'pipe'],
        });

        this._running = true;
        this.buffer = Buffer.alloc(0);

        this.process.stdout!.on('data', (data: Buffer) => {
            this.buffer = Buffer.concat([this.buffer, data]);
            this.processBuffer();
        });

        this.process.stderr!.on('data', (data: Buffer) => {
            // Log DOOM's stderr output for debugging
            const msg = data.toString().trim();
            if (msg) {
                console.log('[DOOM]', msg);
            }
        });

        this.process.on('exit', (code) => {
            this._running = false;
            this.emit('exit', code);
        });

        this.process.on('error', (err) => {
            this._running = false;
            this.emit('error', err);
        });
    }

    private processBuffer(): void {
        // Find the latest complete frame in the buffer
        let lastFrameStart = -1;

        for (let i = 0; i <= this.buffer.length - FRAME_SIZE; i++) {
            if (this.buffer[i] === MAGIC[0] &&
                this.buffer[i + 1] === MAGIC[1] &&
                this.buffer[i + 2] === MAGIC[2] &&
                this.buffer[i + 3] === MAGIC[3]) {
                lastFrameStart = i;
            }
        }

        if (lastFrameStart >= 0 && lastFrameStart + FRAME_SIZE <= this.buffer.length) {
            const pixels = this.buffer.subarray(
                lastFrameStart + FRAME_HEADER_SIZE,
                lastFrameStart + FRAME_SIZE
            );
            // Keep only data after this frame
            this.buffer = this.buffer.subarray(lastFrameStart + FRAME_SIZE);
            this.emit('frame', Buffer.from(pixels));
        }
    }

    sendKey(pressed: boolean, doomKeyCode: number): void {
        if (!this.process || !this.process.stdin || !this._running) return;
        const buf = Buffer.alloc(3);
        buf[0] = 0x4B; // 'K'
        buf[1] = pressed ? 1 : 0;
        buf[2] = doomKeyCode;
        this.process.stdin.write(buf);
    }

    stop(): void {
        if (this.process) {
            this.process.kill('SIGTERM');
            this.process = null;
            this._running = false;
        }
    }
}
