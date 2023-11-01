import {
  CancellationToken,
  InlineCompletionContext,
  InlineCompletionItem,
  InlineCompletionItemProvider,
  InlineCompletionList,
  Position,
  ProviderResult,
  Range,
  TextDocument,
  workspace,
  StatusBarItem,
} from 'vscode'
import { LlamaApi, LlamaResponse } from './LlamaApi'
import { nextId } from './Uuid'
import { SlowBuffer } from 'buffer'

const LEADING_LINES_PROP = 0.15
const config = workspace.getConfiguration('llamaPilot')

export class LlamaPilotCompletionProvider
  implements InlineCompletionItemProvider
{
  cachedPrompts: Map<string, number> = new Map<string, number>()

  private llamaApi: LlamaApi = new LlamaApi(config.get('url'), {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    max_tokens: 1500,
    temperature: 0,
    n: 3,
  })

  private requestStatus: string = 'done'
  private statusBar: StatusBarItem

  constructor(statusBar: StatusBarItem) {
    this.statusBar = statusBar
    console.debug('llamaPilot completion ready')
  }

  //@ts-ignore
  // because ASYNC and PROMISE
  public async provideInlineCompletionItems(
    document: TextDocument,
    position: Position,
    context: InlineCompletionContext,
    token: CancellationToken,
  ): Promise<InlineCompletionItem[] | InlineCompletionList | null | undefined> {
    if (!config.get('completionEnabled')) {
      console.debug('llamaPilot completion disabled, skipping.')
      return Promise.resolve([] as InlineCompletionItem[])
    }

    let prompt = this.getPrompt(document, position)

    if (this.isNil(prompt)) {
      console.debug('Prompt is empty, skipping')
      return Promise.resolve([] as InlineCompletionItem[])
    }

    const currentTimestamp = Date.now()
    const currentId = nextId()
    this.cachedPrompts.set(currentId, currentTimestamp)

    // check there is no newer request util this.request_status is done
    while (this.requestStatus === 'pending') {
      await this.sleep(200)
      console.debug(
        'current id = ',
        currentId,
        ' request status = ',
        this.requestStatus,
      )
      if (this.newestTimestamp() > currentTimestamp) {
        // console.debug(
        //   'newest timestamp=',
        //   this.newestTimestamp(),
        //   'current timestamp=',
        //   currentTimestamp,
        // )
        console.debug('Newer request is pending, skipping')
        this.cachedPrompts.delete(currentId)
        return Promise.resolve([] as InlineCompletionItem[])
      }
    }

    console.debug('current id = ', currentId, 'set request status to pending')
    this.requestStatus = 'pending'
    this.statusBar.tooltip = 'llamaPilot - Working'
    this.statusBar.text = '$(loading~spin)'

    //prompt = `### Instructions: you are working in ${document.languageId} continue this piece of text:\n${prompt} ...\n\n### Response:\n`
    //console.debug('final prompt = ', prompt)

    let promptCompletion = this.getPromptForCompletion(document, position)

    prompt = `### Instructions: think in ${document.languageId}, continue coding to fill between PREFIX and SUFFIX.\n\nPREFIX:\n${promptCompletion.prefix}\n\nSUFFIX:\n${promptCompletion.suffix}\n\n### Response:\n`

    //const system = `You are coding in ${document.languageId}, continue coding to fill between PREFIX and SUFFIX.`
    //prompt = `PREFIX:\n${promptCompletion.prefix}\n\nSUFFIX:\n${promptCompletion.suffix}`

    console.debug('final prompt = ', prompt)

    const response = this.llamaApi
      .send(prompt as string)
      .then((response) => {
        this.statusBar.text = '$(light-bulb)'
        console.debug('Response = ', response)
        const completions = this.toInlineCompletions(position, response)
        // console.debug('completions = ', completions)
        return completions
      })
      .catch((error) => {
        console.error(error)
        this.statusBar.text = '$(alert)'
        return [] as InlineCompletionItem[]
      })
      .finally(() => {
        console.debug('current id = ', currentId, 'set request status to done')
        this.requestStatus = 'done'
        this.cachedPrompts.delete(currentId)
      })

    return response
  }

  private getPrompt(
    document: TextDocument,
    position: Position,
  ): String | undefined {
    const promptLinesCount = config.get('contextLines') as number

    /* 
        Put entire file in prompt if it's small enough, otherwise only
        take lines above the cursor and from the beginning of the file.
    */
    if (document.lineCount <= promptLinesCount) {
      const range = new Range(0, 0, position.line, position.character)
      return document.getText(range)
    } else {
      const leadingLinesCount = Math.floor(
        LEADING_LINES_PROP * promptLinesCount,
      )
      const prefixLinesCount = promptLinesCount - leadingLinesCount
      const firstPrefixLine = position.line - prefixLinesCount
      const prefix = document.getText(
        new Range(firstPrefixLine, 0, position.line, position.character),
      )
      const leading = document.getText(new Range(0, 0, leadingLinesCount, 0))
      return leading + prefix
    }
  }

  private getPromptForCompletion(
    document: TextDocument,
    position: Position,
  ): { prefix: string; suffix: string } {
    const promptLinesCount = config.get('contextLines') as number
    let rangePre, rangeSuf
    const ps = {
      prefix: '',
      suffix: '',
    }
    /* 
        Put entire file in prompt if it's small enough, otherwise only
        take lines above the cursor and from the beginning of the file.
    */
    if (document.lineCount <= promptLinesCount) {
      rangePre = new Range(0, 0, position.line, position.character)
      rangeSuf = new Range(
        position.line,
        position.character,
        position.line + 5,
        0,
      )
      return {
        prefix: document.getText(rangePre),
        suffix: document.getText(rangeSuf),
      }
    } else {
      const leadingLinesCount = Math.floor(
        LEADING_LINES_PROP * promptLinesCount,
      )
      const prefixLinesCount = promptLinesCount - leadingLinesCount
      const firstPrefixLine = position.line - prefixLinesCount
      rangePre = new Range(
        firstPrefixLine,
        0,
        position.line,
        position.character,
      )
      rangeSuf = new Range(0, 0, leadingLinesCount, 0)
      return {
        prefix: document.getText(rangePre),
        suffix: document.getText(rangeSuf),
      }
    }
  }

  private isNil(value: String | undefined | null): boolean {
    return value === undefined || value === null || value.length === 0
  }

  private newestTimestamp() {
    return Array.from(this.cachedPrompts.values()).reduce((a, b) =>
      Math.max(a, b),
    )
  }

  private sleep(milliseconds: number) {
    return new Promise((r) => setTimeout(r, milliseconds))
  }

  private toInlineCompletions(
    position: Position,
    value: LlamaResponse | null,
  ): InlineCompletionItem[] {
    const completions = value?.choices
      ?.map((choice) => choice.text)
      ?.map((choiceText) =>
        this.removeMDlang(choiceText).map(
          (block) =>
            new InlineCompletionItem(block.code, new Range(position, position)),
        ),
      )
      .flat()
    return completions || []
  }

  removeMDlang(text = ''): Array<{ code: string }> {
    const regex = /```([\w-]+)[\n\s]*([^`]*)/gm

    let codeBlocks = []
    let match = null

    while ((match = regex.exec(text))) {
      const language = match[1]
      const code = match[2].trim()
      codeBlocks.push({ language, code })
    }
    return codeBlocks.length > 0 ? codeBlocks : [{ code: text }]
  }
}
