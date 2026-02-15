import * as vscode from 'vscode';

export class DoomDocumentProvider implements vscode.TextDocumentContentProvider {
    private _onDidChange = new vscode.EventEmitter<vscode.Uri>();
    readonly onDidChange = this._onDidChange.event;

    private _content: string = '';

    provideTextDocumentContent(_uri: vscode.Uri): string {
        return this._content;
    }

    updateFrame(content: string): void {
        this._content = content;
        this._onDidChange.fire(DoomDocumentProvider.uri);
    }

    static readonly uri = vscode.Uri.parse('doom:frame.doom');

    dispose(): void {
        this._onDidChange.dispose();
    }
}
