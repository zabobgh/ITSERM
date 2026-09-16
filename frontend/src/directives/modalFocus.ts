import { nextTick, type ObjectDirective } from 'vue'

const stack: HTMLElement[] = []
const cleanup = new WeakMap<HTMLElement, () => void>()
let nextId = 0

// Shared modal behavior: focus containment, topmost Escape and focus restoration.
export const modalFocus: ObjectDirective<HTMLElement, () => void> = {
  mounted(el, binding) {
    const previous = document.activeElement as HTMLElement | null
    stack.push(el)
    el.setAttribute('role', 'dialog')
    el.setAttribute('aria-modal', 'true')
    el.tabIndex = -1
    const heading = el.querySelector('h2, h3')
    if (heading && !el.hasAttribute('aria-labelledby')) {
      heading.id ||= `qa-dialog-${++nextId}`
      el.setAttribute('aria-labelledby', heading.id)
    }
    const focusable = () => Array.from(el.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex="0"]'
    )).filter(node => node.getClientRects().length > 0)
    const onKey = (event: KeyboardEvent) => {
      if (stack[stack.length - 1] !== el) return
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopImmediatePropagation()
        binding.value()
      } else if (event.key === 'Tab') {
        const nodes = focusable()
        const first = nodes[0] || el
        const last = nodes[nodes.length - 1] || el
        if (event.shiftKey && (document.activeElement === first || document.activeElement === el)) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === el)) {
          event.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey, true)
    nextTick(() => { if (el.isConnected) (focusable()[0] || el).focus() })
    cleanup.set(el, () => {
      document.removeEventListener('keydown', onKey, true)
      stack.splice(stack.indexOf(el), 1)
      if (previous?.isConnected) previous.focus()
    })
  },
  unmounted(el) { cleanup.get(el)?.(); cleanup.delete(el) }
}
