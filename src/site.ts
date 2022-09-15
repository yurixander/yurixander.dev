import {contactPrompt, Terminal} from "./terminal"

export const consts = {
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
  email: "eXVyaXhhbmRlci5yaWNhcmRvQG91dGxvb2suY29t",
  starSpawnInterval: 500,
  terminalKeystrokeInterval: 100
}

type Vector2 = {
  x: number,
  y: number
}

type Dimensions = {
  width: number,
  height: number
}

function calculateCenterPoint(position: Vector2, size: number): Vector2 {
  return {
    x: position.x - size / 2,
    y: position.y - size / 2
  }
}

function isInViewport($element: HTMLElement): boolean {
  const rect = $element.getBoundingClientRect()

  return (
    rect.x >= 0 &&
    rect.y >= 0 &&
    rect.x <= (window.innerWidth || document.documentElement.clientWidth) &&
    rect.y <= (window.innerHeight || document.documentElement.clientHeight)
  )
}

type State = {
  $cursor: HTMLElement,
  $clickAudio: HTMLAudioElement,
  $lastActiveGuideDot: HTMLElement,
  $snapTarget: HTMLElement | null,
  $contactSection: HTMLElement,
  $darkSensitives: NodeListOf<HTMLElement>,
  lastScrollHeight: number,
  contactTerminal: Terminal,
  isHoldingClick: boolean
}

window.addEventListener("load", () => {
  const $clickAudio = document.querySelector<HTMLAudioElement>("[data-asset='click']")!

  let state: State = {
    $cursor: document.getElementById("cursor")!,
    $clickAudio,
    // NOTE: This will select the first element matching this selector.
    $lastActiveGuideDot: document.querySelector<HTMLElement>(".guide > .dot")!,
    isHoldingClick: false,
    $snapTarget: null,
    $contactSection: document.getElementById("contact")!,
    $darkSensitives: document.querySelectorAll("[data-dark-sensitive]"),
    contactTerminal: new Terminal(document.getElementById("contact-terminal")!, $clickAudio),
    lastScrollHeight: 0,
  }

  // Initialization.
  console.clear()

  console.log(`👋 Hi! Interested in looking at the source code? Go ahead! If you have any questions or concerns about this site, feel free to reach me at ${atob(consts.email)}.`)

  contactPrompt(state.contactTerminal)
  state.contactTerminal.isReadonly = false

  // Spawn stars.
  const starSpawnLocations = ["contact"]

  setInterval(() => {
    starSpawnLocations.forEach((spawnLocationId) => {
      const $targetLocation = document.getElementById(spawnLocationId)!
      const $star = document.querySelector(".obj-star")!.cloneNode(true) as HTMLElement
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
  }, consts.starSpawnInterval)

  document.querySelectorAll("button[data-href]").forEach(($btn) => {
    $btn.addEventListener("click", () => window.open($btn.getAttribute("data-href")!, "_blank"))
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

  document.querySelectorAll<HTMLElement>(".guide > .dot").forEach(($guideDot) => {
    $guideDot.addEventListener("click", () => {
      if (state.$lastActiveGuideDot === $guideDot)
        return

      state.$lastActiveGuideDot.classList.remove("active")
      $guideDot.classList.add("active")
      state.$lastActiveGuideDot = $guideDot
    })
  })

  // CONSIDER: Default to all links, then use opt-out?
  document.querySelectorAll<HTMLElement>("[data-snappable], nav a, p a, button").forEach(($snappable) => {
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
  document.querySelectorAll<HTMLElement>("[data-parallax]").forEach(($parallax) => {
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
    if (isInViewport(state.contactTerminal.$terminal))
      state.contactTerminal.$terminal.focus()
    // TODO: Only need to call the `blur` action when it was focused.
    else
      state.contactTerminal.$terminal.blur()
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
