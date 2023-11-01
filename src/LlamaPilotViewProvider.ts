import * as vscode from 'vscode'
import { LlamaApi, LlamaApiParams } from './LlamaApi'

export class LlamaPilotViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'llamaPilot.chatView'

  private _view?: vscode.WebviewView

  // This variable holds a reference to the ChatGPTAPI instance
  private _llamaApi?: LlamaApi
  private _conversation?: number

  private _response?: string
  private _prompt?: string
  private _fullPrompt?: string

  public selectedInsideCodeblock = false
  public pasteOnClick = true
  public keepConversation = true
  public timeoutLength = 60

  public llamaUrl: string = ''
  public llamaApiParams: LlamaApiParams = {}

  // In the constructor, we store the URI of the extension
  constructor(private readonly _extensionUri: vscode.Uri) {}

  public setConversationId(conversationId?: string, parentMessageId?: string) {
    // if (!conversationId || !parentMessageId) {
    //   this._conversation = this._chatGPTAPI?.getConversation();
    // } else if (conversationId && parentMessageId) {
    //   this._conversation = this._chatGPTAPI?.getConversation({
    //     conversationId: conversationId,
    //     parentMessageId: parentMessageId,
    //   });
    // }
    console.debug('setConversationId', conversationId, parentMessageId)
  }

  public getConversationId() {
    return this._conversation
  }
  public getParentMessageId() {
    return 'no id'
  }

  public resetConversation() {
    if (this._llamaApi) {
      this._llamaApi.resetConversation(this._conversation || 0)
    }
  }

  // This private method initializes a new LlamaApi instance, using the session token if it is set
  private _newAPI() {
    this._llamaApi = new LlamaApi(this.llamaUrl, this.llamaApiParams)
    this._conversation = this._llamaApi.newConversationId()
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ) {
    this._view = webviewView

    // set options for the webview
    webviewView.webview.options = {
      // Allow scripts in the webview
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    }

    // set the HTML for the webview
    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview)

    // add an event listener for messages received by the webview
    webviewView.webview.onDidReceiveMessage((data) => {
      console.debug('onDidReceiveMessage', data)
      switch (data.type) {
        case 'codeSelected': {
          // do nothing if the pasteOnClick option is disabled
          if (!this.pasteOnClick) {
            break
          }

          let code = data.value
          code = code.replace(/([^\\])(\$)([^{0-9])/g, '$1\\$$$3')

          // insert the code as a snippet into the active text editor
          vscode.window.activeTextEditor?.insertSnippet(
            new vscode.SnippetString(code),
          )
          break
        }
        case 'prompt': {
          this.search(data.value)
        }
      }
    })
  }

  public async search(prompt?: string) {
    if (!prompt) {
      prompt = ''
    }
    this._prompt = prompt

    // Check if the ChatGPTAPI instance is defined
    if (!this._llamaApi) {
      this._newAPI()
    }

    // focus gpt activity from activity bar
    if (!this._view) {
      await vscode.commands.executeCommand('llamaPilot.chatView.focus')
    } else {
      this._view?.show?.(true)
    }

    let response = ''

    // Get the selected text of the active editor
    const selection = vscode.window.activeTextEditor?.selection
    const selectedText =
      vscode.window.activeTextEditor?.document.getText(selection)
    let searchPrompt = ''

    if (selection && selectedText) {
      // If there is a selection, add the prompt and the selected text to the search prompt
      if (this.selectedInsideCodeblock) {
        searchPrompt = `${prompt}\n\`\`\`\n${selectedText}\n\`\`\``
      } else {
        searchPrompt = `${prompt}\n${selectedText}\n`
      }
    } else {
      // Otherwise, just use the prompt if user typed it
      searchPrompt = prompt
    }

    this._fullPrompt = searchPrompt

    if (!this._llamaApi || !this._conversation) {
      response = '[ERROR] LlamApi'
    } else {
      console.debug('sendMessage\n', searchPrompt)
      console.debug('prompt\n', this._prompt)

      // Make sure the prompt is shown
      this._view?.webview.postMessage({
        type: 'setPrompt',
        value: this._prompt,
      })

      if (this._view) {
        this._view.webview.postMessage({ type: 'addResponse', value: '...' })
      }

      let agent
      agent = this._llamaApi

      try {
        // Send the search prompt to the ChatGPTAPI instance and store the response
        // response = await agent.sendMessage(searchPrompt, {
        //   onProgress: (partialResponse) => {
        //     if (this._view && this._view.visible) {
        //       this._view.webview.postMessage({
        //         type: "addResponse",
        //         value: partialResponse,
        //       });
        //     }
        //   },
        //   timeoutMs: this.timeoutLength * 1000,
        // });

        const apiRes = await agent.chatConversation(
          this._conversation,
          searchPrompt,
        )
        response = apiRes?.choices[0].message?.content || 'no response'
        agent.updateConversation(this._conversation)
      } catch (e) {
        console.error(e)
        response = `[ERROR] ${e}`
      }
    }

    // Saves the response
    this._response = response

    // Show the view and send a message to the webview with the response
    if (this._view) {
      this._view.show?.(true)
      this._view.webview.postMessage({ type: 'addResponse', value: response })
    }
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'media', 'main.js'),
    )
    const tailwindUri = webview.asWebviewUri(
      vscode.Uri.joinPath(
        this._extensionUri,
        'media',
        'scripts',
        'showdown.min.js',
      ),
    )
    const showdownUri = webview.asWebviewUri(
      vscode.Uri.joinPath(
        this._extensionUri,
        'media',
        'scripts',
        'tailwind.min.js',
      ),
    )
    const prismUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'media', 'scripts', 'prism.js'),
    )
    const prismCssUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'media', 'css', 'prism.css'),
    )
    return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<link href="${prismCssUri}" rel="stylesheet" />
				<script src="${tailwindUri}"></script>
				<script src="${showdownUri}"></script>
				<style>
				.code {
					white-space : pre;
					</style>
					</head>
					<body>
					<input class="h-10 w-full text-white bg-stone-700 p-4 text-sm" type="text" id="prompt-input" />
					
					<div id="response" class="pt-6 text-sm">
					</div>
					
					<script src="${scriptUri}"></script>
					<script src="${prismUri}"></script>
			</body>
			</html>`
  }
}
