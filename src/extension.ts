import * as vscode from 'vscode'
import { LlamaPilotViewProvider } from './LlamaPilotViewProvider'
import { LlamaPilotCompletionProvider } from './LlamaPilotCompletionProvider'

const configuration = vscode.workspace.getConfiguration()
const target = vscode.ConfigurationTarget.Global

function setExtensionStatus(enabled: boolean) {
  console.debug('Setting llamaPilot Completion', enabled)
  configuration
    .update('llamaPilot.completionEnabled', enabled, target, false)
    .then(console.error)
}

export function activate(context: vscode.ExtensionContext) {
  // Get the API session token from the extension's configuration
  const config = vscode.workspace.getConfiguration('llamaPilot')

  // Create a new ChatGPTViewProvider instance and register it with the extension's context
  const provider = new LlamaPilotViewProvider(context.extensionUri)

  // Put configuration settings into the provider
  provider.selectedInsideCodeblock =
    config.get('selectedInsideCodeblock') || false
  provider.pasteOnClick = config.get('pasteOnClick') || false
  provider.keepConversation = config.get('keepConversation') || false
  provider.timeoutLength = config.get('timeoutLength') || 60
  provider.llamaUrl = config.get('url') || ''
  updateApiParams()

  const statusBar = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
  )
  statusBar.text = '$(light-bulb)'
  statusBar.tooltip = `llamaPilot - Ready`

  const statusUpdateCallback =
    (callback: any, showIcon: boolean) => async () => {
      await callback(showIcon)
      if (showIcon) {
        statusBar.show()
      } else {
        statusBar.hide()
      }
    }

  // code completion
  context.subscriptions.push(
    vscode.languages.registerInlineCompletionItemProvider(
      { pattern: '**' },
      new LlamaPilotCompletionProvider(statusBar),
    ),
    vscode.commands.registerCommand('llamaPilot.Completion.On', () =>
      statusUpdateCallback(setExtensionStatus, true),
    ),
    vscode.commands.registerCommand('llamaPilot.Completion.Off', () =>
      statusUpdateCallback(setExtensionStatus, false),
    ),
    statusBar,
  )

  if (config.get('completionEnabled')) {
    statusBar.show()
  }

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      LlamaPilotViewProvider.viewType,
      provider,
      {
        webviewOptions: { retainContextWhenHidden: true },
      },
    ),
  )

  // Register the commands that can be called from the extension's package.json
  const commandHandler = (command: string) => {
    const config = vscode.workspace.getConfiguration('llamaPilot')
    const prompt = config.get(command) as string
    provider.search(prompt)
  }

  const commandAsk = vscode.commands.registerCommand('llamaPilot.ask', () => {
    vscode.window
      .showInputBox({ prompt: 'What do you want to do?' })
      .then((value) => {
        provider.search(value)
      })
  })

  const commandConversationId = vscode.commands.registerCommand(
    'llamaPilot.conversationId',
    () => {
      vscode.window
        .showInputBox({
          prompt: 'Set Conversation ID or delete it to reset the conversation',
          placeHolder: 'conversationId (leave empty to reset)',
          value: '' + provider.getConversationId(),
        })
        .then((conversationId) => {
          if (!conversationId) {
            provider.setConversationId()
          } else {
            vscode.window
              .showInputBox({
                prompt: 'Set Parent Message ID',
                placeHolder: 'messageId (leave empty to reset)',
                value: provider.getParentMessageId(),
              })
              .then((messageId) => {
                provider.setConversationId(conversationId, messageId)
              })
          }
        })
    },
  )
  const commandExplain = vscode.commands.registerCommand(
    'llamaPilot.explain',
    () => {
      commandHandler('promptPrefix.explain')
    },
  )
  const commandRefactor = vscode.commands.registerCommand(
    'llamaPilot.refactor',
    () => {
      commandHandler('promptPrefix.refactor')
    },
  )
  const commandOptimize = vscode.commands.registerCommand(
    'llamaPilot.optimize',
    () => {
      commandHandler('promptPrefix.optimize')
    },
  )
  const commandProblems = vscode.commands.registerCommand(
    'llamaPilot.findProblems',
    () => {
      commandHandler('promptPrefix.findProblems')
    },
  )

  let commandResetConversation = vscode.commands.registerCommand(
    'llamaPilot.resetConversation',
    () => {
      provider.setConversationId()
    },
  )

  context.subscriptions.push(
    commandAsk,
    commandConversationId,
    commandExplain,
    commandRefactor,
    commandOptimize,
    commandProblems,
    commandResetConversation,
  )

  // Change the extension's session token when configuration is changed
  vscode.workspace.onDidChangeConfiguration(
    (event: vscode.ConfigurationChangeEvent) => {
      const config = vscode.workspace.getConfiguration('llamaPilot')
      if (event.affectsConfiguration('llamaPilot.selectedInsideCodeblock')) {
        provider.selectedInsideCodeblock =
          config.get('selectedInsideCodeblock') || false
      } else if (event.affectsConfiguration('llamaPilot.pasteOnClick')) {
        provider.pasteOnClick = config.get('pasteOnClick') || false
      } else if (event.affectsConfiguration('llamaPilot.keepConversation')) {
        provider.keepConversation = config.get('keepConversation') || false
      } else if (event.affectsConfiguration('llamaPilot.timeoutLength')) {
        provider.timeoutLength = config.get('timeoutLength') || 60
      }
      updateApiParams()
    },
  )

  function updateApiParams() {
    provider.llamaApiParams = {
      temperature: config.get('temperature'),
      // eslint-disable-next-line @typescript-eslint/naming-convention
      max_tokens: config.get('max_tokens'),
      // eslint-disable-next-line @typescript-eslint/naming-convention
      top_k: config.get('top_k'),
      // eslint-disable-next-line @typescript-eslint/naming-convention
      top_p: config.get('top_p'),
      // eslint-disable-next-line @typescript-eslint/naming-convention
      max_new_tokens: config.get('max_new_tokens'),
      // eslint-disable-next-line @typescript-eslint/naming-convention
      presence_penalty: config.get('presence_penalty'),
      // eslint-disable-next-line @typescript-eslint/naming-convention
      frequency_penalty: config.get('frequency_penalty'),
    }
  }
}

// This method is called when your extension is deactivated
export function deactivate() {}
