

// import { Dialog, createHTMLElement } from "./html";
// import { ServerSession } from "./main";
// import { Gift, Person, PlayGreen } from "./module_bindings";
// import { Writable } from "./store";
// import { Message , ReducerEventContext} from "./module_bindings";
// import { Identity } from "@clockworklabs/spacetimedb-sdk";
// import { skins } from "./game";
// import { requestPerson, requestPlayerId, requestPlayerName } from "./server_helpers";

import { Message } from "@clockworklabs/spacetimedb-sdk";
import { Unread } from "../module_bindings";
import { Readable } from "../store";
import { createHTMLElement } from "../html";
import { Sendable } from "./Chat";


// export function ChatSessions(session: ServerSession): HTMLElement{

//   const el = createHTMLElement("div", {id: "chat_sessions"});
//   const self = session.player.get();
//   session.conn.subscriptionBuilder()

//   .onApplied((ctx) => {
//     const lastmessages: Map<string, Message> = new Map();
//     const addSession = (msg: Message) => {
//       const otherId = msg.sender.data == self.id.data ? msg.receiver.toHexString() : msg.sender.toHexString();
//       if (!lastmessages.has(otherId)) {
//         lastmessages.set(otherId, msg);
//       }else if (lastmessages.get(otherId)!.timestamp < msg.timestamp) {
//         lastmessages.set(otherId, msg);
//       }
//     }

//     for (let m of ctx.db.messages.iter()){
//       if (m.sender.data == self.id.data){
//         addSession(m);
//       }
//       if (m.receiver.data == self.id.data){
//         addSession(m);
//       }
//     }

//     let entries = Array.from(lastmessages.entries());
//     entries = entries.sort((a, b) => (b[1].timestamp > a[1].timestamp) ? 1 : -1);
//     for(let [s, msg] of entries){
//       const p = session.conn.db.person.id.find(Identity.fromString(s))  
//       const sessbutn = createHTMLElement("p", {
//         parentElement: el,
//         class: "session",
//       });
//       sessbutn.addEventListener("click", () => {
//         session.goto(`/user/${p?.name ?? "Unknown"}`);
//       });

//       createHTMLElement("p", {
//         parentElement: sessbutn,
//         class: "session_tag",
//       }, p? p.name : "Unknown");
//       createHTMLElement("p", {
//         parentElement: sessbutn,
//         class: "session_msg",
//       }, msg.content);
//     }
//   })
//   .subscribe(`SELECT * FROM messages WHERE sender == '${self.id.toHexString()}' OR receiver == '${self.id.toHexString()}'`)
//   return el
// }


// export function Chat(session: ServerSession, target: string): HTMLElement {  

//   const el = createHTMLElement("div", {id: "chat"});
//   const card = createHTMLElement("div", {id: "user_card", parentElement: el});

//   createHTMLElement("h2", {parentElement: card}, `Chat with ${target}`);

//   const self = session.player.get()
//   const messagesElement = createHTMLElement("div", {id: "messages", parentElement: el});
//   console.log(target);
  

//   requestPlayerName(session.conn, target)
//     .then((person) => {
//       console.log("Chat with person:", person.name, "id:", person.id.toHexString());

//       const info = card.appendChild(createHTMLElement("p", {}, ""));
//       session.competition.subscribe((competition) => {
//         competition.filter((p) => p.id.data === person.id.data)
//           .forEach((p) => {
//             info.textContent = `bank: ${p.bank}$ highscore: ${p.highscore}$ ${p.highscoreState.reduce((a, b) => a+skins[b], "")} Game: ${p.gameState.reduce((a, b) => a+skins[b], "")}`;
//           });
//       })


//       const giftbutton = createHTMLElement("button", {
//         parentElement: el,
//         id: "gift_button"
//       }, "🎁");
//       const sendbutton = createHTMLElement("button", {
//         parentElement: el,
//         id: "send_button"
//       }, "");

//       giftbutton.addEventListener("click", () => {
//         const dialog = Dialog();
//         createHTMLElement("h2", {parentElement: dialog}, `Send a gift to ${person.name}`);

//         for (let i = 0; i <= 9; i++) {
//           const button = createHTMLElement("p", {
//             parentElement: dialog,
//             classList: "gift_button",
//           }, `${skins[i]} ${2**(i)}$`);

//           button.addEventListener("click", () => {
//             session.conn.reducers.sendGift(person.id, i);
//             dialog.remove();
//           });
//         }
//       });

//       sendbutton.addEventListener("click", () => {
//         const msg = message_input.value.trim();
//         if (msg) {
//           session.conn.reducers.sendMessage(person.id, msg);
//           message_input.value = "";
//         }
//       });
      
//       const message_input = createHTMLElement("textarea", {
//         parentElement: el,
//         id: "chat_input"
//       }) as HTMLTextAreaElement;
//       message_input.placeholder = "Type your message here...";

//       message_input.addEventListener("keydown", (event: KeyboardEvent) => {
//         if (event.key === "Enter" && !event.shiftKey) {
//           event.preventDefault();
//           const msg = message_input.value.trim();
//           if (msg) {

//             session.conn.reducers.sendMessage(person.id, msg);
//             message_input.value = "";
//           }
//         }
//       });

//       type Sendable = {
//         type: "gift",
//         sender: Identity,
//         receiver: Identity,
//         animal: number,
//         timestamp: BigInt,
//       } | {
//         type: "message",
//         sender: Identity,
//         receiver: Identity,
//         content: string,
//         timestamp: BigInt,
//       }

//       let messages: Writable<Sendable[]> = new Writable<Sendable[]>([]);
//       messages.subscribeLater((msgs: Sendable[] ) => {
//         messagesElement.innerHTML = "";

//         if (msgs.length === 0) {
//           createHTMLElement("div", {
//             parentElement: messagesElement,

//           }, "No messages yet.");
//         }

//         msgs.forEach((msg: Sendable) => {
//           const sender = msg.sender.data == self.id.data ? "me" : person.name

//           createHTMLElement("p", {
//             parentElement: createHTMLElement("p", {
//               parentElement: messagesElement,
//               class: (sender == "me" ? "msg me" : "msg") + (msg.type === "gift" ? " gift" : "")
//               ,
//             })
//           },

//             (msg.type === "message") ?
//               msg.content
//             :
//               skins[msg.animal]
//           )
//         });
//         messagesElement.scrollTop = messagesElement.scrollHeight;
//       });

//       const requestSendables = (type: "gifts" | "messages") =>
//        new Promise((resolve, reject) => {
//         session.conn.subscriptionBuilder()
//           .onApplied((ctx)=>resolve(ctx))
//           .onError(e=>reject(e))
//           .subscribe(`SELECT * FROM ${type} WHERE
//             ((sender == '${self.id.toHexString()}' AND receiver == '${person.id.toHexString()}')
//           OR (sender == '${person.id.toHexString()}' AND receiver == '${self.id.toHexString()}'))`)
//       })

//       const checkCtx = (ctx: ReducerEventContext) =>
//         ctx.event.status.tag === "Committed" && 
//         (ctx.event.callerIdentity.data === self.id.data || ctx.event.callerIdentity.data === person.id.data);
      
//       const updateMessages = () =>{
//         console.log("Updating messages for chat with", person.name);
//         console.log(Array.from(session.conn.db.messages.iter()));
        
//         let newMessages = Array.from(session.conn.db.messages.iter()).map((msg: Message) => ({...msg, type: "message"} as Sendable));
//         newMessages = newMessages.concat(Array.from(session.conn.db.gifts.iter()).map((gift: Gift) => ({...gift, type: "gift"} as Sendable)));
//         const [sid, oid] = [self.id.data, person.id.data];


//         newMessages = newMessages.filter((msg: Sendable) => 
//         {
//           if (msg.type === "gift") {
//             // console.log("Gift message:", msg);
//           } else {
//             console.log("Chat message:", msg.content,
//               msg.sender.data == oid
//             );

//           }

          
//           return (msg.sender.data === sid && msg.receiver.data === oid) 
//           ||
//           (msg.receiver.data === sid && msg.sender.data === oid)
//         }
//         );


//         newMessages = newMessages.sort((a, b) => (a.timestamp > b.timestamp) ? 1 : -1);
//         messages.set(newMessages);
//       }

//       session.conn.subscriptionBuilder()
//       .onApplied((ctx: ReducerEventContext) => {
//         console.log("Chat subscription applied:", 
//           Array.from(ctx.db.messages.iter())
//         );
//         updateMessages();
//       })
//       .onError((error) => {
//         console.error("Error in chat subscription:", error);
//       })
//       .subscribe(`SELECT * FROM messages`)
//       // WHERE
//       //   ((sender == '${self.id.toHexString()}' AND receiver == '${person.id.toHexString()}')
//       //   OR (sender == '${person.id.toHexString()}' AND receiver == '${self.id.toHexString()}'))`)

//       session.conn.reducers.onSendMessage(c=>{
//         if (checkCtx(c)) {
//           updateMessages();
//         }
//       })

//       session.conn.reducers.onSendGift((ctx) => {
//         if (checkCtx(ctx)) {
//           updateMessages();
//         }
//       });

//       session.conn.reducers.onSendMessage((ctx) => {
//         if (checkCtx(ctx)) {
//           updateMessages();
//         }
//       });

//       (async()=>{
//         await requestSendables("messages")
//         await requestSendables("gifts") 
//         updateMessages()
        
//       })()

//     })
//     .catch((err: Error) => {
//       console.error("Error fetching person:", err);
//       createHTMLElement("h2", {parentElement: el}, `Chat with ${target} (not found)`);
//     })

//   return el

// }

export type ChatPreview ={
  unread:boolean,
  item: Sendable,
  sender: string,
}

export function SessionsView(chats: Readable<ChatPreview[]>){

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

      createHTMLElement("p", {
        parentElement: session,
        class: "session_tag",
      }, chat.sender);

      createHTMLElement("p", {
        parentElement: session,
        class: "session_msg",
      }, chat.item.type === "message" ? chat.item.content : `🎁 ${chat.item.animal}`);
    })
  })
  return el;
}
