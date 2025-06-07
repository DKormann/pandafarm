

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


export function Dialog(){
  const dialog = createHTMLElement("div", {class: "prompt_window"});
  const inner  = createHTMLElement("div", {class: "prompt_inner", parentElement: dialog});
  dialog.addEventListener("click", (e) => {
    dialog.remove();
  })
  document.body.appendChild(dialog);
  return inner
}