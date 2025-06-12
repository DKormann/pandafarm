
import { Identity, Message } from "@clockworklabs/spacetimedb-sdk";
import { Unread } from "../module_bindings";
import { Readable } from "../store";
import { createHTMLElement } from "../html";
import { Sendable } from "./chat";
import { skins } from "../game";


export type ChatPreview ={
  unread: boolean,
  item: Sendable,
  senderId: bigint,
  sender: string,
}

export function SessionsView(chats: Readable<ChatPreview[]>, unread: Readable<Map<bigint, number>>, goto: (p:string)=>void){

  const el = createHTMLElement("div", {id: "sessions_view"});

  const sessions = createHTMLElement("div", {id: "sessions", parentElement: el});

  const build = (chats:ChatPreview[], unreads: Map<bigint, number>)=>{

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

      createHTMLElement("p", {
        parentElement: session,
        class: "session_tag",
      },  chat.sender.slice(0,20) );

      if  (unreads.get(chat.senderId)){
        createHTMLElement("span",{
          parentElement: session,
          class:"unread"
        }, `${unreads.get(chat.senderId)} `)
      }

      createHTMLElement("span", {
        parentElement: session,
        class: "session_msg",
      }, (chat.item.type === "message" ? chat.item.content : `🎁 ${skins[chat.item.animal]}`))
    })
  }

  chats.subscribe(chats=>{
    build(chats, unread.get())
  })

  unread.subscribe(unread =>{
    build(chats.get(), unread)
  })

  return el;
}
