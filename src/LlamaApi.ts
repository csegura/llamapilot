/* eslint-disable @typescript-eslint/naming-convention */
import fetch from 'node-fetch'

type LlamaMessages = {
  role: string
  content: string
}

export type LlamaApiParams = {
  temperature?: number
  max_tokens?: number
  top_k?: number
  top_p?: number
  max_new_tokens?: number
  presence_penalty?: number
  frequency_penalty?: number
  stop?: Array<string>
  prompt?: string
  messages?: Array<LlamaMessages>
}

enum LlamaMode {
  Chat,
  Completion,
}

type LlamaConversation = {
  id: number
  messages: Array<LlamaMessages>
}

type LlamaResponseChoices = {
  index: number
  message: { content: string }
  finish_reason: string
}

type LlamaResponseUsage = {
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
}

type LlamaResponse = {
  id: string
  object: string
  created: number
  model: string
  choices: Array<LlamaResponseChoices>
  usage: LlamaResponseUsage
}

export class LlamaApi {
  url: string
  params: LlamaApiParams
  conversations: Array<LlamaConversation>
  lastResponse?: LlamaResponse

  constructor(url?: string, params?: LlamaApiParams) {
    this.url = url || 'http://192.168.11.211:8000/v1'
    this.params = {
      ...{
        temperature: 0.2,
        max_tokens: 2000,
        top_k: 50,
      },
      ...params,
    }
    this.conversations = []
  }

  async call(mode: LlamaMode, params: LlamaApiParams) {
    const url =
      this.url +
      (mode === LlamaMode.Chat ? '/chat/completions' : '/completions')
    try {
      const response = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        method: 'POST',
        body: JSON.stringify({ ...this.params, ...params }),
      })

      this.lastResponse = (await response.json()) as LlamaResponse

      return this.lastResponse
    } catch (err) {
      throw err
    }
  }

  async send(prompt: string) {
    const params = {
      prompt,
    }

    return this.call(LlamaMode.Completion, params)
  }

  async chat(prompt: string) {
    const params = {
      messages: [
        {
          role: 'assistant',
          content:
            'You are a helpful assistant that generate great quality code',
        },
        { role: 'user', content: prompt },
      ],
    }

    return this.call(LlamaMode.Chat, params)
  }

  newConversationId() {
    return this.conversations.length + 1
  }

  getDefaultMessage() {
    return {
      role: 'system',
      content: 'You are a helpful assistant that generate great quality code',
    }
  }

  getConversation(id?: number) {
    return this.getConversationId(id || this.conversations.length)
  }

  getConversationId(id: number) {
    const conversation = this.conversations.find(
      (conversation) => conversation.id === id,
    )
    if (conversation) {
      return conversation
    } else {
      const newConversation = {
        id: this.newConversationId(),
        messages: [this.getDefaultMessage()],
      }
      this.conversations.push(newConversation)
      return newConversation
    }
  }

  /* init or continues a conversation with prompt */
  async chatConversation(id: number, prompt: string) {
    const conversation = this.getConversationId(id)
    conversation.messages.push({ role: 'user', content: prompt })

    const params = {
      messages: conversation.messages,
    }
    console.debug('messages', params.messages)
    return this.call(LlamaMode.Chat, params)
  }

  /* Update conversation with last response */
  updateConversation(id: number) {
    const conversation = this.getConversationId(id)
    const lastMessage = this.lastResponse?.choices[0].message.content
    if (lastMessage) {
      conversation.messages.push({ role: 'assistant', content: lastMessage })
    }
  }

  /* Reset conversation to default */
  resetConversation(id: number) {
    const conversation = this.getConversationId(id)
    conversation.messages = [this.getDefaultMessage()]
  }
}
