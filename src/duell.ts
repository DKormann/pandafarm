import { createHTMLElement } from "./html";
import { ServerSession } from "./main";

export type navcomponent = (session: ServerSession) => {
  onclick: (path:string[]) => {
    element: HTMLElement,
    start?: () => void,
  }
}

export const createDuell : navcomponent = (session: ServerSession) => {

  const el = createHTMLElement("div", {}, "Duell")

  return{
    onclick: (path:string[]) => ({
      element: el,
    }),
  }
}



  


