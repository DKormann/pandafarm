

export function createHTMLElement(tag: string,
  attributes: Partial<Record<keyof HTMLElement | "class", string|HTMLElement>> = {},
  content: string = ''): HTMLElement {
const element = document.createElement(tag);
  
  for (const [key, value] of Object.entries(attributes)) {
    if (value instanceof HTMLElement) {
      if (key === 'parentElement') {
        value.appendChild(element);
      } 
    }else {
      element.setAttribute(key, value as string);
    } 
  }
  element.textContent = content;
  return element;
}