// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { commands, ExtensionContext, window } from 'vscode';
import { Book } from './bookUtil';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "t-reader" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let book = new Book(context);

	// 老板键
	let displayCode = commands.registerCommand('extension.displayCode', () => {
		book.init()
		window.setStatusBarMessage('done');
	});

	// 看书
	let displayBook = commands.registerCommand('extension.displayBook', () => {
		book.getPageContent();
	});

	// 上一章节
	let getPreviousChapter = commands.registerCommand('extension.getPreviousChapter', () => {
		book.getPreviousChapter();
	});

	// 下一章节
	let getNextChapter = commands.registerCommand('extension.getNextChapter', () => {
		book.getNextChapter();
	});

	// 上一页
	let getPreviousPage = commands.registerCommand('extension.getPreviousPage', () => {
		book.getPreviousPage();
	});

	// 下一页
	let getNextPage = commands.registerCommand('extension.getNextPage', () => {
		book.getNextPage();
	});

	context.subscriptions.push(displayCode);
	context.subscriptions.push(displayBook);
	context.subscriptions.push(getPreviousChapter);
	context.subscriptions.push(getNextChapter);
	context.subscriptions.push(getPreviousPage);
	context.subscriptions.push(getNextPage);
}

// This method is called when your extension is deactivated
export function deactivate() {}
