import * as vscode from 'vscode';
import { DoomProcess } from './doomProcess';
import { DoomDocumentProvider } from './doomDocumentProvider';
import { DoomInput } from './doomInput';
import { renderFrame } from './doomRenderer';
import { buildQuantizationLUT } from './palette';

let doomProcess: DoomProcess | null = null;
let doomDocProvider: DoomDocumentProvider | null = null;
let doomInput: DoomInput | null = null;
let providerRegistration: vscode.Disposable | null = null;
let lastFrameTime = 0;
const MIN_FRAME_INTERVAL = 66; // ~15 FPS

export function activate(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.commands.registerCommand('doom.start', async () => {
            if (doomProcess?.running) {
                vscode.window.showWarningMessage('DOOM is already running!');
                return;
            }

            // Look for DOOM1.WAD bundled with the extension
            const path = await import('path');
            const fs = await import('fs');
            const bundledWad = path.join(context.extensionPath, 'DOOM1.WAD');
            let wadPath: string;

            if (fs.existsSync(bundledWad)) {
                wadPath = bundledWad;
            } else {
                const wadFiles = await vscode.window.showOpenDialog({
                    canSelectFiles: true,
                    canSelectFolders: false,
                    canSelectMany: false,
                    filters: { 'WAD Files': ['wad'] },
                    title: 'Select DOOM WAD file',
                });
                if (!wadFiles || wadFiles.length === 0) return;
                wadPath = wadFiles[0].fsPath;
            }

            // Build quantization LUT
            buildQuantizationLUT();

            // Set up document provider
            doomDocProvider = new DoomDocumentProvider();
            providerRegistration = vscode.workspace.registerTextDocumentContentProvider('doom', doomDocProvider);
            context.subscriptions.push(providerRegistration);

            // Open virtual document
            const doc = await vscode.workspace.openTextDocument(DoomDocumentProvider.uri);
            const editor = await vscode.window.showTextDocument(doc, {
                viewColumn: vscode.ViewColumn.One,
                preserveFocus: false,
                preview: false,
            });

            // Apply editor settings for DOOM display
            const editorOptions: vscode.TextEditorOptions = {
                cursorStyle: vscode.TextEditorCursorStyle.LineThin,
            };
            editor.options = editorOptions;

            // Spawn DOOM process
            doomProcess = new DoomProcess();

            doomProcess.on('frame', (pixels: Buffer) => {
                const now = Date.now();
                if (now - lastFrameTime < MIN_FRAME_INTERVAL) return;
                lastFrameTime = now;

                const text = renderFrame(pixels);
                doomDocProvider?.updateFrame(text);
            });

            doomProcess.on('exit', (code: number) => {
                vscode.window.showInformationMessage(`DOOM exited with code ${code}`);
                cleanup();
            });

            doomProcess.on('error', (err: Error) => {
                vscode.window.showErrorMessage(`DOOM error: ${err.message}`);
                cleanup();
            });

            // Set up input handling
            doomInput = new DoomInput(doomProcess);
            doomInput.register();

            // Start the process
            doomProcess.start(context.extensionPath, wadPath);

            // Activate DOOM color theme
            vscode.workspace.getConfiguration().update(
                'workbench.colorTheme',
                'DOOM',
                vscode.ConfigurationTarget.Workspace
            );
        }),

        vscode.commands.registerCommand('doom.stop', () => {
            if (!doomProcess?.running) {
                vscode.window.showWarningMessage('DOOM is not running.');
                return;
            }
            cleanup();
            vscode.window.showInformationMessage('DOOM stopped.');
        })
    );
}

function cleanup(): void {
    doomInput?.dispose();
    doomInput = null;
    doomProcess?.stop();
    doomProcess = null;
    providerRegistration?.dispose();
    providerRegistration = null;
    doomDocProvider?.dispose();
    doomDocProvider = null;
}

export function deactivate() {
    cleanup();
}
