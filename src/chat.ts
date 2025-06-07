
import { createHTMLElement } from "./html";
import { ServerSession } from "./main";
import { Person, PlayGreen } from "./module_bindings";
import { getPersonByName } from "./server_helpers";
import { Writable } from "./store";
import { Message } from "./module_bindings";
import { Identity } from "@clockworklabs/spacetimedb-sdk";




export function ChatSessions(session: ServerSession): HTMLElement{
  const el = createHTMLElement("div", {id: "chat_sessions"});

  const self = session.player.get();

  session.conn.subscriptionBuilder()
  .onApplied((ctx) => {
    // const sessions: string[] = [];
    const lastmessages: Map<string, Message> = new Map();

    const addSession = (msg: Message) => {
      const otherId = msg.sender.data == self.id.data ? msg.receiver.toHexString() : msg.sender.toHexString();
      if (!lastmessages.has(otherId)) {
        // sessions.push(otherId);
        lastmessages.set(otherId, msg);
      }else if (lastmessages.get(otherId)!.timestamp < msg.timestamp) {
        lastmessages.set(otherId, msg);
      }
    }


    for (let m of ctx.db.messages.iter()){
      if (m.sender.data == self.id.data){
        addSession(m);
      }
      if (m.receiver.data == self.id.data){
        addSession(m);
      }
    }

    let entries = Array.from(lastmessages.entries());
    entries = entries.sort((a, b) => (b[1].timestamp > a[1].timestamp) ? 1 : -1);
    for(let [s, msg] of entries){
      const p = session.conn.db.person.id.find(Identity.fromString(s))  
      const sessbutn = createHTMLElement("p", {
        parentElement: el,
        class: "session",
      });
      sessbutn.addEventListener("click", () => {
        session.goto(`/chat/${p?.name ?? "Unknown"}`);
      });

      createHTMLElement("p", {
        parentElement: sessbutn,
        class: "session_tag",
      }, p? p.name : "Unknown");
      createHTMLElement("p", {
        parentElement: sessbutn,
        class: "session_msg",
      }, msg.content);

    }
  })
  .subscribe(`SELECT * FROM messages WHERE sender == '${self.id.toHexString()}' OR receiver == '${self.id.toHexString()}'`)
  return el

}


export function Chat(session: ServerSession, target:string): HTMLElement {

  const el = createHTMLElement("div", {id: "chat"});


  const self = session.player.get()

  getPersonByName(session, target)
    .then((person: Person) => {

      const messagesElement = createHTMLElement("div", {parentElement: el, id: "messages"});

      const message_input = createHTMLElement("textarea", {
        parentElement: el,
        id: "chat_input"
      }) as HTMLTextAreaElement;
      message_input.placeholder = "Type your message here...";

      message_input.addEventListener("keydown", (event: KeyboardEvent) => {
        if (event.key === "Enter" && !event.shiftKey) {
          event.preventDefault();
          const msg = message_input.value.trim();
          if (msg) {
            sendMessage(msg);
            message_input.value = "";
          }
        }
      });

      let messages: Writable<Message[]> = new Writable<Message[]>([]);

      messages.subscribeLater((msgs: Message[]) => {
        messagesElement.innerHTML = "";

        if (msgs.length === 0) {
          createHTMLElement("div", {
            parentElement: messagesElement,

          }, "No messages yet.");
        }

        msgs.forEach((msg: Message) => {
          const sender = msg.sender.data == self.id.data ? "me" : person.name

          createHTMLElement("p", {
            parentElement: createHTMLElement("p", {
              parentElement: messagesElement,
              class: sender == "me" ? "msg me" : "msg",
            })
          }, msg.content)
        });
        messagesElement.scrollTop = messagesElement.scrollHeight;
      });


      const getmessages = ()=>{
        session.conn.subscriptionBuilder()

        .onApplied(c=>{
          
          let newMessages:Message[] = Array.from(c.db.messages.iter()) as Message[]

          newMessages = newMessages.filter((msg: Message) => {
            if (msg.sender.data == self.id.data && msg.receiver.data == person.id.data) {
              return true;
            }
            if (msg.sender.data == person.id.data && msg.receiver.data == self.id.data) {
              return true;
            }
            return false;
          });


          console.log(newMessages);          
          messages.set(newMessages);

        })
        .subscribe(`SELECT * FROM messages WHERE
          ((sender == '${self.id.toHexString()}' AND receiver == '${person.id.toHexString()}')
        OR (sender == '${person.id.toHexString()}' AND receiver == '${self.id.toHexString()}'))`)

      }

      const sendMessage = (msg:string) => {
        messages.update((msgs) => {
          return [...msgs,
            {
              sender: self.id,
              content:"sndning " + msg,
              receiver: person.id,
            }as Message];
        })
        session.conn.reducers.sendMessage(person.id, msg)
      }

      session.conn.reducers.onSendMessage((ctx)=>{
        console.log("onSendMessage", ctx.event);
        const callerid = ctx.event.callerIdentity.data;        
        if ((callerid != self.id.data) && (callerid != person.id.data)){
          return;
        }
        if (ctx.event.status.tag !== "Committed") return;

        console.log("add message");
        getmessages()
      })

      getmessages()

    })
    .catch((err: Error) => {
      console.error("Error fetching person:", err);
      createHTMLElement("h2", {parentElement: el}, `Chat with ${target} (not found)`);
    });


  return el

}

