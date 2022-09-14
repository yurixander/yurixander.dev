const consts = {
  cursorSize: 20,
  emailRegex: /^[^@]+@[^@]+\.[^@]+$/,
  confirmationRegex: /^(y|n)$/,
  terminalCommands: [
    ["help", "Shows this help list."],
    ["clear", "Clear the console."],
    ["send-msg", "Re-run the message prompt."],
    ["view-resume", "Opens the Resume."],
    ["view-source", "Open the GitHub repository for this website."]
  ],
  parallaxMaxDistance: 30,
  // This helps prevent crawler bots, and thus possible spam.
  email: "eXVyaXhhbmRlci5yaWNhcmRvQG91dGxvb2suY29t"
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
    lastScrollHeight: 0,
    $darkSensitives: document.querySelectorAll("[data-dark-sensitive]")
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

  const appendTerminalSpecialCharacter = (tagName, classNameOrNull = null, isDeletable = false) => {
    let $specialCharacter = document.createElement(tagName)

    if (classNameOrNull !== null)
      $specialCharacter.classList.add(classNameOrNull)

    if (!isDeletable)
      $specialCharacter.setAttribute("data-non-deletable", "")

    state.$terminal.appendChild($specialCharacter)
    scrollTerminal()
  }

  const appendTerminalNewline = () => appendTerminalSpecialCharacter("br")
  const appendTerminalSpace = (isDeletable = false) => appendTerminalSpecialCharacter("span", "space", isDeletable)

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

  const defaultCommandHandler = (_commandString, name, _args) => {
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
      case "view-resume": {
        window.location.href = "./resume.pdf"

        return
      }
      case "view-source": {
        window.open("https://github.com/yurixander/yurixander.dev", "_blank")

        return
      }
      default: addTerminalMessage(`No command matching name '${name}' is registered. Type 'help' for a list of available commands.`)
    }

    defaultPrompt()
  }

  // Initialization.
  console.clear()

  console.log(`👋 Hi! Interested in looking at the source code? Go ahead! If you have any questions or concerns about this site, feel free to reach me at ${atob(consts.email)}.`)

  // Spawn stars.
  const starSpawnLocations = ["contact"]

  setInterval(() => {
    starSpawnLocations.forEach((spawnLocationId) => {
      const $targetLocation = document.getElementById(spawnLocationId)
      const $star = document.querySelector(".obj-star").cloneNode(true)
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
  }, 500_000)

  const sendMessagePrompt = () => terminalPrompt("Type your name:", null, (name) => {
    terminalPrompt("Enter your email:", consts.emailRegex, (email) => {
      terminalPrompt("Message:", null, (message) => {
        terminalPrompt("Confirm send message? [y/n]", consts.confirmationRegex, (confirmation) => {
          if (confirmation !== "y") {
            addTerminalMessage("No worries! Let's start over.")
            sendMessagePrompt()

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
            .then((response) => {
              if (response.ok)
                addTerminalMessage("Your message was successfully sent. You will receive a response via e-mail soon. Thank you!")
              else
                addTerminalMessage(`Message was sent but the service did not provide a success response: ${response.statusText} (${response.status})`)
            })
            .catch((error) => {
              addTerminalMessage(`There was an error while sending your message: ${error}`)
            })
            .finally(defaultPrompt)
        })
      })
    })
  })

  sendMessagePrompt()

  document.querySelectorAll("button[data-href]").forEach(($btn) => {
    $btn.addEventListener("click", () => window.open($btn.getAttribute("data-href"), "_blank"))
  })

  document.querySelectorAll("a, button").forEach(($clickable) => {
    $clickable.addEventListener("click", () => {
      state.$clickAudio.play()
    })
  })

  // FIXME: This follows cursor so it doesn't work perfectly well.
  document.querySelectorAll("[data-is-dark]").forEach(($dark) => {
    $dark.addEventListener("mouseenter", () => state.$darkSensitives.forEach(($darkSensitive) => $darkSensitive.classList.add("meta-dark")))
    $dark.addEventListener("mouseleave", () => state.$darkSensitives.forEach(($darkSensitive) => $darkSensitive.classList.remove("meta-dark")))
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

  // CONSIDER: Default to all links, then use opt-out?
  document.querySelectorAll("[data-snappable], nav a, p a, button").forEach(($snappable) => {
    $snappable.addEventListener("mouseenter", () => {
      // BUG: When you scroll a section, the pointer snap is misplaced.
      const snappablePosition = $snappable.getBoundingClientRect()

      state.$snapTarget = $snappable
      state.$cursor.style.left = `${snappablePosition.x}px`
      state.$cursor.style.top = `${snappablePosition.y}px`
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

  // Obfuscate email & personal information from crawlers.
  document.querySelectorAll("[data-href-email]").forEach(($email) => {
    $email.addEventListener("click", () => window.open(`mailto:${atob(consts.email)}`, "_self"))
  })

  // Parallax effect.
  document.querySelectorAll("[data-parallax]").forEach(($parallax) => {
    window.addEventListener("scroll", () => {
      const scrollDistance = window.scrollY

      $parallax.style.transform = `translateY(${scrollDistance}px)`
      console.log($parallax)
    })
  })

  // Scroll effect.
  const scrollObserver = new IntersectionObserver((entries) => entries.forEach((entry) => {
    const scrollAnimation = entry.target.getAttribute("data-scroll-animation")
    const hasScrollAnimation = scrollAnimation !== null

    if (entry.isIntersecting) {
      entry.target.classList.remove("meta-hidden")
      entry.target.classList.add("meta-visible")

      if (hasScrollAnimation)
        entry.target.setAttribute("data-animation", scrollAnimation)
    }
    else {
      entry.target.classList.remove("meta-visible")
      entry.target.classList.add("meta-hidden")

      if (hasScrollAnimation)
        entry.target.removeAttribute("data-animation")
    }
  }), {
    // rootMargin: "500px",
    // threshold: 1.0
  })

  document.querySelectorAll("p").forEach(($p) => {
    $p.setAttribute("data-scroll-animation", "text-appear")
  })

  document.querySelectorAll("[data-has-scroll-effect], [data-scroll-animation]").forEach(($scrollEffectEl) => scrollObserver.observe($scrollEffectEl))

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
      const commandString = state.terminalInputBuffer.trim()

      // Ignore empty input.
      if (commandString === "")
        return

      state.terminalInputBuffer = ""

      const parts = commandString.split(" ")
      const name = parts[0]
      const args = parts.slice(1)

      appendTerminalNewline()

      if (state.terminalInputHandler !== null) {
        const handler = state.terminalInputHandler

        state.terminalInputHandler = defaultCommandHandler
        handler(commandString, name, args)
      }

      return
    }
    // Ignore other keys.
    else if (e.key.length > 1)
      return

    // At this point, we can register the key to the input buffer.
    state.terminalInputBuffer += e.key

    let $character = document.createElement("span")

    // Edge case for space.
    if (e.key === " ") {
      appendTerminalSpace(true)

      return
    }
    else
      $character.textContent = e.key

    state.$terminal.appendChild($character)
    scrollTerminal()
  })

  window.addEventListener("mousemove", (e) => {
    if (state.$snapTarget !== null)
      return

    const nextPosition = calculateCenterPoint({
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
