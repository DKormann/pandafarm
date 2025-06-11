
import { Identity, Message } from "@clockworklabs/spacetimedb-sdk";
import { Unread } from "../module_bindings";
import { Readable } from "../store";
import { createHTMLElement } from "../html";
import { Sendable } from "./Chat";


export type ChatPreview ={
  unread: boolean,
  item: Sendable,
  sender: string,
}

export function SessionsView(chats: Readable<ChatPreview[]>, goto: (p:string)=>void){

  const el = createHTMLElement("div", {id: "sessions_view"});

  const sessions = createHTMLElement("div", {id: "sessions", parentElement: el});


  chats.subscribe(chats=>{

    sessions.innerHTML = "";
    if (chats.length === 0) {
      createHTMLElement("p", {parentElement: sessions}, "No chats yet.");
    }

    chats.forEach((chat: ChatPreview) => {
      const session = createHTMLElement("div", {
        parentElement: sessions,
        class: "session",
      });

      session.addEventListener("click", () => {
        goto(`/user/${chat.sender}`);
      });

      const nametag = createHTMLElement("p", {
        parentElement: session,
        class: "session_tag",
      }, chat.sender.slice(0,20));

      createHTMLElement("p", {
        parentElement: session,
        class: "session_msg",
      }, chat.item.type === "message" ? chat.item.content : `🎁 ${chat.item.animal}`);
    })
  })
  return el;
}
