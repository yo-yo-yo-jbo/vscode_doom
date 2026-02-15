import * as vscode from 'vscode';
import { DoomProcess } from './doomProcess';

// DOOM key codes (from doomkeys.h)
const DOOM_KEYS = {
    KEY_RIGHTARROW: 0xae,
    KEY_LEFTARROW: 0xac,
    KEY_UPARROW: 0xad,
    KEY_DOWNARROW: 0xaf,
    KEY_USE: 0xa2,     // space
    KEY_FIRE: 0xa3,    // ctrl
    KEY_ESCAPE: 27,
    KEY_ENTER: 13,
    KEY_TAB: 9,
    KEY_RSHIFT: 0x80 + 0x36,
    KEY_RCTRL: 0x80 + 0x1d,
    KEY_F1: 0x80 + 0x3b,
    KEY_F2: 0x80 + 0x3c,
    KEY_F3: 0x80 + 0x3d,
    KEY_F4: 0x80 + 0x3e,
    KEY_F5: 0x80 + 0x3f,
    KEY_F6: 0x80 + 0x40,
    KEY_F7: 0x80 + 0x41,
    KEY_F8: 0x80 + 0x42,
    KEY_F9: 0x80 + 0x43,
    KEY_F10: 0x80 + 0x44,
    KEY_EQUALS: 0x3d,
    KEY_MINUS: 0x2d,
};

export class DoomInput {
    private disposables: vscode.Disposable[] = [];
    private releaseTimers: Map<number, NodeJS.Timeout> = new Map();
    private readonly RELEASE_DELAY = 150;

    constructor(private process: DoomProcess) {}

    register(): void {
        // Override the 'type' command to capture printable characters
        this.disposables.push(
            vscode.commands.registerCommand('type', (args: { text: string }) => {
                if (!this.isDoomActive()) {
                    // Pass through to default handler
                    vscode.commands.executeCommand('default:type', args);
                    return;
                }
                const ch = args.text.toLowerCase();
                const code = ch.charCodeAt(0);
                this.pressAndRelease(code);
            })
        );

        // Register keybinding commands
        const keyMap: Record<string, number> = {
            'doom.key.up': DOOM_KEYS.KEY_UPARROW,
            'doom.key.down': DOOM_KEYS.KEY_DOWNARROW,
            'doom.key.left': DOOM_KEYS.KEY_LEFTARROW,
            'doom.key.right': DOOM_KEYS.KEY_RIGHTARROW,
            'doom.key.enter': DOOM_KEYS.KEY_ENTER,
            'doom.key.escape': DOOM_KEYS.KEY_ESCAPE,
            'doom.key.space': DOOM_KEYS.KEY_USE,
            'doom.key.ctrl': DOOM_KEYS.KEY_FIRE,
            'doom.key.shift': DOOM_KEYS.KEY_RSHIFT,
            'doom.key.tab': DOOM_KEYS.KEY_TAB,
            'doom.key.y': 'y'.charCodeAt(0),
            'doom.key.n': 'n'.charCodeAt(0),
            'doom.key.equals': DOOM_KEYS.KEY_EQUALS,
            'doom.key.minus': DOOM_KEYS.KEY_MINUS,
            'doom.key.f1': DOOM_KEYS.KEY_F1,
            'doom.key.f2': DOOM_KEYS.KEY_F2,
            'doom.key.f3': DOOM_KEYS.KEY_F3,
            'doom.key.f4': DOOM_KEYS.KEY_F4,
            'doom.key.f5': DOOM_KEYS.KEY_F5,
            'doom.key.f6': DOOM_KEYS.KEY_F6,
            'doom.key.f7': DOOM_KEYS.KEY_F7,
            'doom.key.f8': DOOM_KEYS.KEY_F8,
            'doom.key.f9': DOOM_KEYS.KEY_F9,
            'doom.key.f10': DOOM_KEYS.KEY_F10,
        };

        for (const [command, keyCode] of Object.entries(keyMap)) {
            this.disposables.push(
                vscode.commands.registerCommand(command, () => {
                    this.pressAndRelease(keyCode);
                })
            );
        }
    }

    private isDoomActive(): boolean {
        const editor = vscode.window.activeTextEditor;
        return editor?.document.uri.scheme === 'doom';
    }

    private pressAndRelease(keyCode: number): void {
        // Send press
        this.process.sendKey(true, keyCode);

        // Clear existing release timer for this key
        const existing = this.releaseTimers.get(keyCode);
        if (existing) {
            clearTimeout(existing);
        }

        // Set debounced release
        const timer = setTimeout(() => {
            this.process.sendKey(false, keyCode);
            this.releaseTimers.delete(keyCode);
        }, this.RELEASE_DELAY);
        this.releaseTimers.set(keyCode, timer);
    }

    dispose(): void {
        for (const timer of this.releaseTimers.values()) {
            clearTimeout(timer);
        }
        this.releaseTimers.clear();
        for (const d of this.disposables) {
            d.dispose();
        }
        this.disposables = [];
    }
}
