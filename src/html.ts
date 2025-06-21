

export function createHTMLElement(tag: string,
  attributes: Partial<Record<keyof HTMLElement | "class", string|HTMLElement|HTMLElement[]>> = {},
  content: string = ''): HTMLElement {
const element = document.createElement(tag);
  element.textContent = content;
  
  for (const [key, value] of Object.entries(attributes)) {
    if (value instanceof HTMLElement) {
      if (key === 'parentElement') {
        value.appendChild(element);
      }
    } else if (key == "children"){
      console.log("Children", value);
      
      (value as HTMLElement[]).forEach(child => {
        element.appendChild(child);
        console.log(element.childElementCount);
        
      })
    }else {
      element.setAttribute(key, value as string);
    } 
  }
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