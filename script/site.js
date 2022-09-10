const consts = {
  cursorSize: 20,
  emailRegex: /^[^@]+@[^@]+\.[^@]+$/,
  confirmationRegex: /(y|n)/,
  terminalCommands: [
    ["help", "Shows this help list."],
    ["clear", "Clear the console."],
    ["send-msg", "Re-run the message prompt."],
    ["view-resume", "Opens the Resume."],
    ["play-music", "Plays some nice background music."]
  ],
  parallaxMaxDistance: 30
}

function calculateCenterPoint(position, size) {
  return {
    x: position.x - size / 2,
    y: position.y - size / 2
  }
}

function isInViewport($element) {
  const rect = $element.getBoundingClientRect();

  return (
    rect.x >= 0 &&
    rect.y >= 0 &&
    rect.x <= (window.innerWidth || document.documentElement.clientWidth) &&
    rect.y <= (window.innerHeight || document.documentElement.clientHeight)
  );
}

window.addEventListener("load", () => {
  let state = {
    $cursor: document.getElementById("cursor"),
    $clickAudio: document.querySelector("[data-asset='click']"),
    // NOTE: This will select the first element matching this selector.
    $lastActiveGuideDot: document.querySelector(".guide > .dot"),
    isHoldingClick: false,
    $snapTarget: null,
    $terminal: document.querySelector(".terminal > .content"),
    $contactSection: document.getElementById("contact"),
    terminalInputBuffer: "",
    terminalInputHandler: null,
    lastScrollHeight: 0
  }

  // Helper functions.
  const scrollTerminal = () => {
    state.$terminal.scrollTop = state.$terminal.scrollHeight
  }

  const addTerminalMessage = (message, isBold, includeNewline = true) => {
    let $message = document.createElement(isBold ? "strong" : "span")

    $message.toggleAttribute("data-non-deletable")
    $message.textContent = message
    state.$terminal.appendChild($message)
    scrollTerminal()

    if (includeNewline)
      appendTerminalNewline()
  }

  const appendTerminalSpecialCharacter = (tagName, classNameOrNull = null) => {
    let $specialCharacter = document.createElement(tagName)

    if (classNameOrNull !== null)
      $specialCharacter.classList.add(classNameOrNull)

    $specialCharacter.setAttribute("data-non-deletable", "")
    state.$terminal.appendChild($specialCharacter)
    scrollTerminal()
  }

  const appendTerminalNewline = () => appendTerminalSpecialCharacter("br")
  const appendTerminalSpace = () => appendTerminalSpecialCharacter("span", "space")

  const terminalPrompt = (text, formatOrNull, callback) => {
    const addPromptMessage = () => {
      addTerminalMessage(text, true, false)
      appendTerminalSpace()
    }

    addPromptMessage()

    const handler = (commandString, _name, _args) => {
      if (formatOrNull !== null && !formatOrNull.test(commandString)) {
        addTerminalMessage("Sorry, it appears that your input is not properly formatted. Please verify that there aren't any extra characters, and try again.")

        addPromptMessage()
        state.terminalInputHandler = handler
      }
      else
        callback(commandString)
    }

    state.terminalInputHandler = handler
  }

  const defaultPrompt = () => {
    terminalPrompt("->", null, (response) => {
      const parts = response.split(" ")
      const name = parts[0]
      const args = parts.slice(1)

      defaultCommandHandler(response, name, args)
    })
  }

  const defaultCommandHandler = (_commandString, name, args) => {
    switch (name) {
      case "help": {
        for (const [name, helpMessage] of consts.terminalCommands) {
          addTerminalMessage(name, true, false)
          addTerminalMessage(`: ${helpMessage}`)
        }

        break
      }
      case "clear": {
        // TODO: Need to always have a meta child to keep the caret.

        while (state.$terminal.lastChild)
          state.$terminal.removeChild(state.$terminal.lastChild)

        break
      }
      case "send-msg": {
        sendMessagePrompt()

        return
      }
      default: addTerminalMessage(`No command matching name '${name}' is registered. Type 'help' for a list of available commands.`)
    }

    defaultPrompt()
  }

  // Initialization.
  console.clear()

  console.log("👋 Hi! Interested in looking at the source code? Go ahead! If you have any questions or concerns about this site, feel free to reach me at yurixander.ricardo@outlook.com.")

  // Spawn stars.
  const starSpawnLocations = ["contact"]

  setInterval(() => {
    starSpawnLocations.forEach((spawnLocationId) => {
      const $targetLocation = document.getElementById(spawnLocationId)
      const $star = document.querySelector("[name='star']").cloneNode(true)
      const duration = (Math.random() * 10) + 2

      $star.addEventListener("mouseenter", (_e) => {
        // TODO: Apply velocity in random direction?
      })

      $star.style.animationDuration = `${duration}s`
      $star.style.left = `${Math.random() * window.innerWidth}px`
      $star.style.top = `${Math.random() * $targetLocation.offsetHeight}px`
      $targetLocation.prepend($star)
      setTimeout(() => $star.remove(), duration * 1000)
    })
  }, 500)

  const sendMessagePrompt = () => terminalPrompt("Type your name:", null, (name) => {
    terminalPrompt("Enter your email:", consts.emailRegex, (email) => {
      terminalPrompt("Message:", null, (message) => {
        terminalPrompt("Confirm send message? [y/n]", consts.confirmationRegex, (confirmation) => {
          if (confirmation !== "y") {
            addTerminalMessage("No worries! Let's start over.")
            sendMessagePrompt()

            return
          }

          // TODO: Send message.
          console.log(name, email, message)

          addTerminalMessage("Your message was successfully sent. You will receive a response via e-mail soon. Thank you!")

          defaultPrompt()
        })
      })
    })
  })

  sendMessagePrompt()

  document.querySelectorAll("button[data-href]").forEach(($btn) => {
    $btn.addEventListener("click", () => {
      window.location.href = $btn.getAttribute("data-href")
    })
  })

  document.querySelectorAll("a, button").forEach(($clickable) => {
    $clickable.addEventListener("click", () => {
      state.$clickAudio.play()
    })
  })

  document.querySelectorAll("[data-is-dark]").forEach(($dark) => {
    $dark.addEventListener("mouseenter", () => {
      state.$cursor.classList.add("invert")
    })

    $dark.addEventListener("mouseleave", () => {
      state.$cursor.classList.remove("invert")
    })
  })

  document.querySelectorAll(".guide > .dot").forEach(($guideDot) => {
    $guideDot.addEventListener("click", () => {
      if (state.$lastActiveGuideDot === $guideDot)
        return

      state.$lastActiveGuideDot.classList.remove("active")
      $guideDot.classList.add("active")
      state.$lastActiveGuideDot = $guideDot
    })
  })

  document.querySelectorAll("[data-snappable], nav a, p a").forEach(($snappable) => {
    $snappable.addEventListener("mouseenter", () => {
      // BUG: When you scroll a section, the pointer snap is misplaced.

      state.$snapTarget = $snappable
      state.$cursor.style.left = `${$snappable.offsetLeft}px`
      state.$cursor.style.top = `${$snappable.offsetTop}px`
      state.$cursor.style.width = `${$snappable.clientWidth || $snappable.offsetWidth}px`
      state.$cursor.style.height = `${$snappable.clientHeight || $snappable.offsetHeight}px`
      state.$cursor.classList.add("snapped")
    })

    $snappable.addEventListener("mouseleave", () => {
      if (state.$snapTarget === $snappable) {
        state.$snapTarget = null
        state.$cursor.style.width = `${consts.cursorSize}px`
        state.$cursor.style.height = `${consts.cursorSize}px`
        state.$cursor.classList.remove("snapped")
      }
    })
  })

  // TODO: Finish implementing.
  // document.querySelectorAll("[data-parallax]").forEach(($parallax) => {
  //   window.addEventListener("scroll", () => {
  //     // if (isInViewport($parallax)) {
  //     //   alert("In viewport")
  //     // }
  //     // else console.log("Out of view")
  //     const currentTopValue = parseInt($parallax.style.top) || 0
  //     const step = 1

  //     const direction = document.body.scrollTop - state.lastScrollHeight > 0 ? 1 : -1

  //     state.lastScrollHeight = document.body.scrollTop
  //     $parallax.style.top = (currentTopValue + step) * direction + "px"

  //     // console.log(window.pageYOffset)
  //   })
  // })

  // Event listeners.
  window.addEventListener("scroll", () => {
    if (isInViewport(state.$terminal))
      state.$terminal.focus()
    // TODO: Only need to call the `blur` action when it was focused.
    else
      state.$terminal.blur()
  })

  state.$terminal.addEventListener("keydown", (e) => {
    // Prevents from scrolling when space is pressed.
    e.preventDefault()

    // Erase.
    if (e.key === "Backspace") {
      // Using query selector fixes the fact that the last child is
      // the text content, and not an HTML node itself.
      let $lastChild = document.querySelector(".terminal > .content > *:last-child")

      if ($lastChild.hasAttribute("data-non-deletable")) {
        state.$clickAudio.play()

        return
      }

      state.terminalInputBuffer = state.terminalInputBuffer.substring(0, state.terminalInputBuffer.length - 1)

      $lastChild.remove()

      return
    }
    // Submit command.
    else if (e.key === "Enter") {
      let commandString = state.terminalInputBuffer.trim()

      // Ignore empty input.
      if (commandString === "")
        return

      state.terminalInputBuffer = ""

      let parts = commandString.split(" ")
      let name = parts[0]
      let args = parts.slice(1)

      appendTerminalNewline()

      if (state.terminalInputHandler !== null) {
        let handler = state.terminalInputHandler

        state.terminalInputHandler = defaultCommandHandler
        handler(commandString, name, args)
      }

      return
    }
    // Ignore other keys.
    else if (e.key.length > 1)
      return

    let $character = document.createElement("span")

    // Edge case for space.
    if (e.key === " ") {
      appendTerminalSpace()

      return
    }
    else
      $character.textContent = e.key

    state.terminalInputBuffer += e.key
    state.$terminal.appendChild($character)
    scrollTerminal()
  })

  window.addEventListener("mousemove", (e) => {
    if (state.$snapTarget !== null)
      return

    let nextPosition = calculateCenterPoint({
      x: e.x,
      y: e.y
    }, consts.cursorSize)

    state.$cursor.style.left = `${nextPosition.x}px`
    state.$cursor.style.top = `${nextPosition.y}px`
  })

  window.addEventListener("mousedown", () => {
    state.isHoldingClick = true
    state.$cursor.classList.add("click")
  })

  window.addEventListener("mouseup", () => {
    state.isHoldingClick = false
    state.$cursor.classList.remove("click")
  })

  window.addEventListener("mousein", () => {
    state.$cursor.classList.remove("hidden")
  })

  window.addEventListener("blur", () => {
    document.body.classList.add("blur")
  })

  window.addEventListener("focus", () => {
    document.body.classList.remove("blur")
  })
})
