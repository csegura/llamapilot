# Llama Pilot - Extension for VS Code

This is a redux of ChatGPT extension created by Tim Kmecl (timkmecl) designed to work with your llama.cpp

![LlamaPilot](resources/icon_big.png)

## LlamaPilot

**Still working** This tool lets you use your own llama.cpp server to do the work

## Sponsors

Welcome !!!

### [Marketplace](https://marketplace.visualstudio.com/items?itemName=csegura.llamapilot)

<br>

<img src="examples/main.png" alt="Refactoring selected code using chatGPT"/>

## Features

- **Ask general questions** or use code snippets from the editor to query LlamaPilot via an input box in the sidebar
- Right click on a code selection and run one of the context menu **shortcuts**
- View LlamaPilot's responses in a panel next to the editor
- Ask **follow-up questions** to the response (conversation context is maintained)
- **Insert code snippets** from the AI's response into the active editor by clicking on them
- (new) Syntax hilight in llama panel view
- (new) Settings: You can adjust model parameters, temperature, max_tokens, top_k, top_p and penalities

## Installation

To use this extension, install it from the VSCode marketplace or download and install `.vsix` file from Releases.

1. After the installation is complete, you will need to add your llama.cpp url to the extension settings in VSCode. To do this, open the `Settings` panel by going to the `Code` menu and selecting `Preferences`, then `Settings`.
2. In the search bar, type `LlamaPilot` to filter the settings list.

After completing these steps, the extension should be ready to use.

## Using the Extension

To use the extension, open a text editor in Visual Studio Code and open the ChatGPT panel by clicking on the ChatGPT icon in the sidebar. This will open a panel with an input field where you can enter your prompt or question. By clicking enter, it will be sent to ChatGPT. Its response will be displayed below the input field in the sidebar (note that it may take some time for it to be calculated).

<img src="examples/create.png" alt="Writing new code using chatGPT" width="500"/>

You can also select a code snippet in the editor and then enter a prompt in the side panel, or right-click and select "Ask ChatGPT". The selected code will be automatically appended to your query when it is sent to the AI. This can be useful for generating code snippets or getting explanations for specific pieces of code.

<img src="examples/explain.png" alt="Refactoring selected code using chatGPT"/>

To insert a code snippet from the AI's response into the editor, simply click on the code block in the panel. The code will be automatically inserted at the cursor position in the active editor.

<img src="examples/refactor.png" alt="chatGPT explaining selected code"/>

You can select some code in the editor, right click on it and choose one of the following from the context menu:

#### Commands:

- `Ask llamaPilot`: will provide a prompt for you to enter any query
- `llamaPilot: Explain selection`: will explain what the selected code does
- `llamaPilot: Refactor selection`: will try to refactor the selected code
- `llamaPilot: Find problems`: looks for problems/errors in the selected code, fixes and explains them
- `llamaPilot: Optimize selection`: tries to optimize the selected code

`Ask llamaPilot` is also available when nothing is selected. For the other four commands, you can customize the exact prompt that will be sent to the AI by editing the extension settings in VSCode Preferences.

Because llamaPilot is a conversational AI, you can ask follow-up questions to the response. The conversation context is maintained between queries, so you can ask multiple questions in a row.
To **reset the conversation context**, click `ctrl+shift+p` and select `llamaPilot: Reset Conversation`.

---

Please note that this extension is currently a proof of concept and may have some limitations or bugs. We welcome feedback and contributions to improve the extension.

## Credits

- Original version (https://github.com/timkmecl/chatgpt-vscode) - Tim Kmecl
- This wouldn't be possible without OpenAI's [ChatGPT](https://chat.openai.com/chat)
- The extension makes use of [chatgpt-api](https://github.com/transitive-bullshit/chatgpt-api) (by [Travis Fischer](https://github.com/transitive-bullshit)), which uses ChatGPT unofficial API in order to login and communicate with it.
- It is built on top of [mpociot/chatgpt-vscode](https://github.com/mpociot/chatgpt-vscode), which started this project
- `v0.3` inspired and based on [barnesoir/chatgpt-vscode-plugin](https://github.com/barnesoir/chatgpt-vscode-plugin) and [gencay/vscode-chatgpt](https://github.com/gencay/vscode-chatgpt)

## See

- Huggingface Mistral Orca (https://huggingface.co/TheBloke/Mistral-7B-OpenOrca-GGUF)
- Try (https://huggingface.co/spaces/cedpsam/mistral_openorca_lamacpp)
- Check Api Online (https://huggingface.co/spaces/marekk/Mistral-7B-OpenOrca-GGUF)
