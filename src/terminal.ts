import {consts} from "./site"

export type TerminalInputHandler = (terminal: Terminal, commandString: string, name: string, args: string[]) => void

export const contactPrompt = (terminal: Terminal) => terminal.prompt("Type your name:", null, (name: string) => {
  terminal.prompt("Enter your email:", consts.emailRegex, (email) => {
    terminal.prompt("Message:", null, (message) => {
      terminal.prompt("Confirm send message? [y/n]", consts.confirmationRegex, (confirmation) => {
        if (confirmation !== "y") {
          terminal.addText("No worries! Let's start over.")
          contactPrompt(terminal)

          return
        }

        fetch("https://api.staticforms.xyz/submit", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            // Don't worry, this isn't secret :).
            accessKey: "bee85cdb-bd13-4bbe-896b-d159c35577d0",
            subject: "Contact form submission from website",
            replyTo: "@",
            name,
            email,
            message
          }),
        })
          .then((response) =>
            terminal.addText(response.ok ? "Your message was successfully sent. You will receive a response via e-mail soon. Thank you!" : `Message was sent but the service did not provide a success response: ${response.statusText} (${response.status})`)
          )
          .catch((error) => terminal.addText(`There was an error while sending your message: ${error}`))
          .finally(() => Terminal.defaultPrompt(terminal))
      })
    })
  })
})

export class Terminal {
  static defaultPrompt(terminal: Terminal) {
    terminal.prompt("⇢", null, (response) => {
      const parts = response.split(" ")
      const name = parts[0]
      const args = parts.slice(1)

      Terminal.defaultCommandHandler(terminal, response, name, args)
    })
  }

  static defaultCommandHandler(terminal: Terminal, _commandString: string, name: string, _args: string[]) {
    switch (name) {
      case "help": {
        for (const [name, helpMessage] of consts.terminalCommands) {
          terminal.addText(name, true, false)
          terminal.addText(`: ${helpMessage}`)
        }

        break
      }
      case "clear": {
        // TODO: Need to always have a meta child to keep the caret.

        terminal.clear()

        break
      }
      case "send-msg": {
        contactPrompt(terminal)

        return
      }
      case "view-resume": {
        window.location.href = "./resume.pdf"

        return
      }
      case "view-source": {
        window.open("https://github.com/yurixander/yurixander.dev", "_blank")

        return
      }
      default: terminal.addText(`No command matching name '${name}' is registered. Type 'help' for a list of available commands.`)
    }

    Terminal.defaultPrompt(terminal)
  }

  readonly $terminal: HTMLElement
  inputBuffer: string
  inputHandler: TerminalInputHandler
  isReadOnly = true

  private readonly $beep: HTMLAudioElement

  constructor($terminal: HTMLElement, $beep: HTMLAudioElement) {
    this.$terminal = $terminal
    this.inputBuffer = ""
    this.inputHandler = Terminal.defaultCommandHandler
    this.$beep = $beep
    this.$terminal.addEventListener("keyup", (e) => this.handleKey(e))
  }

  private handleKey(event: KeyboardEvent) {
    // Ignore input keystrokes when the terminal is marked as read-only.
    if (this.isReadOnly) {
      this.$beep.play()

      return
    }

    // REVIEW: Is this still required? It's blocking alt-tabs and so on when writing to a terminal.
    // Prevents from scrolling when space is pressed.
    event.preventDefault()

    // Erase.
    if (event.key === "Backspace") {
      // Using query selector fixes the fact that the last child is
      // the text content, and not an HTML node itself.
      let $lastChild = this.$terminal.lastElementChild

      if ($lastChild === null || $lastChild.hasAttribute("data-non-deletable")) {
        this.$beep.play()

        return
      }

      this.inputBuffer = this.inputBuffer.substring(0, this.inputBuffer.length - 1)

      $lastChild.remove()

      return
    }
    // Submit command.
    else if (event.key === "Enter") {
      const commandString = this.inputBuffer.trim()

      // Ignore empty input.
      if (commandString === "")
        return

      this.inputBuffer = ""

      const parts = commandString.split(" ")
      const name = parts[0]
      const args = parts.slice(1)

      this.appendNewline()

      if (this.inputHandler !== null) {
        const handler = this.inputHandler

        this.inputHandler = Terminal.defaultCommandHandler
        handler(this, commandString, name, args)
      }

      return
    }
    // Ignore other keys.
    else if (event.key.length > 1)
      return

    // At this point, we can register the key to the input buffer.
    this.inputBuffer += event.key

    let $character = document.createElement("span")

    // Edge case for space.
    if (event.key === " ") {
      this.appendSpace(true)

      return
    }
    else
      $character.textContent = event.key

    this.$terminal.appendChild($character)
    this.scroll()
  }

  clear() {
    while (this.$terminal.lastChild)
      this.$terminal.removeChild(this.$terminal.lastChild)
  }

  scroll() {
    this.$terminal.scrollTop = this.$terminal.scrollHeight
  }

  addText(text: string, isBold: boolean = false, includeNewline: boolean = true): void {
    // TODO: Must special case spaces.

    let $text = document.createElement(isBold ? "strong" : "span")

    $text.toggleAttribute("data-non-deletable")
    $text.textContent = text
    this.$terminal.appendChild($text)
    this.scroll()

    if (includeNewline)
      this.appendNewline()
  }

  appendSpecialCharacter(tagName: string, classNameOrNull: string | null = null, isDeletable: boolean = false): void {
    let $specialCharacter = document.createElement(tagName)

    if (classNameOrNull !== null)
      $specialCharacter.classList.add(classNameOrNull)

    if (!isDeletable)
      $specialCharacter.setAttribute("data-non-deletable", "")

    this.$terminal.appendChild($specialCharacter)
    this.scroll()
  }

  appendNewline(): void {
    this.appendSpecialCharacter("br")
  }

  appendSpace(isDeletable: boolean = false): void {
    this.appendSpecialCharacter("span", "space", isDeletable)
  }

  prompt(text: string, formatOrNull: RegExp | null, callback: (response: string) => void): void {
    const addPromptMessage = () => {
      this.addText(text, true, false)
      this.appendSpace()
    }

    addPromptMessage()

    const handler: TerminalInputHandler = (_, commandString, _name, _args) => {
      if (formatOrNull !== null && !formatOrNull.test(commandString)) {
        this.addText("Sorry, it appears that your input is not properly formatted. Please verify that there aren't any extra characters, and try again.")

        addPromptMessage()
        this.inputHandler = handler
      }
      else
        callback(commandString)
    }

    this.inputHandler = handler
  }
}

export class Timeline {
  terminal: Terminal
  actions: Promise<void>[]
  isRepeating: boolean

  constructor(terminal: Terminal) {
    this.terminal = terminal
    this.actions = []
    this.isRepeating = false
  }

  prompt(): Timeline {
    this.actions.push(new Promise<void>((resolve: () => void) => {
      this.terminal.addText("->", true, false)
      this.terminal.appendSpace()
      resolve()
    }))

    return this
  }

  write(text: string): Timeline {
    this.actions.push(new Promise<void>((resolve: () => void) => {
      this.terminal.addText(text, false, true)
      this.terminal.appendSpace()
      resolve()
    }))

    return this
  }

  type(text: string): Timeline {
    if (text.trim() === "")
      return

    this.actions.push(new Promise<void>((resolve: () => void) => {
      let characterIndex = -1

      const nextTimeoutTime = () =>
        Math.random() * consts.terminalKeystrokeIntervalMax + consts.terminalKeystrokeIntervalMin

      const nextKeystrokeTimeout = () => setTimeout(() => {
        characterIndex += 1

        if (characterIndex >= text.length) {
          // if (this.isRepeating) {
          //   setTimeout(() => {
          //     this.terminal.clear()
          //     characterIndex = -1
          //     nextKeystrokeTimeout()
          //   }, 4000)

          //   return
          // }

          return resolve()
        }

        this.terminal.addText(text[characterIndex], false, false)
        nextKeystrokeTimeout()
      }, nextTimeoutTime())

      nextKeystrokeTimeout()
    }))

    return this
  }

  repeat(): Timeline {
    this.isRepeating = true

    return this
  }

  run() {
    Promise.all(this.actions)
  }
}
