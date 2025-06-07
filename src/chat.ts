
import { createHTMLElement } from "./html";
import { ServerSession } from "./main";
import { Person, PlayGreen } from "./module_bindings";
import { getPersonByName } from "./server_helpers";
import { Writable } from "./store";
import { Message } from "./module_bindings";





export function Chat(session: ServerSession, target:string): HTMLElement {

  const el = createHTMLElement("div", {id: "chat"});


  const self = session.player.get()

  getPersonByName(session, target)
    .then((person: Person) => {

      // createHTMLElement("h2", {parentElement: el}, `Chat with ${person.name}`);

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

      messages.subscribe((msgs: Message[]) => {
        messagesElement.innerHTML = "";

        if (msgs.length === 0) {
          createHTMLElement("div", {
            parentElement: messagesElement,

          }, "No messages yet.");
        }

        msgs.forEach((msg: Message) => {
          const sender = msg.sender.data == self.id.data ? "me" : person.name
          createHTMLElement("p", {parentElement: messagesElement}, `${sender}: ${msg.content}`);
        });
        messagesElement.scrollTop = messagesElement.scrollHeight;
      });

      let bothids = [person.id.data, self.id.data];

      const getmessages = ()=>{
        session.conn.subscriptionBuilder()

        .onApplied(c=>{
          console.log("applie");
          
          let newMessages:Message[] = Array.from(c.db.messages.iter()) as Message[]

          console.log(person.id.data);
          console.log(bothids);
          
          
          
          newMessages = newMessages.filter((m:Message) => {            

            console.log(m.receiver.data);
            console.log(m.sender.data);
            console.log(m.receiver.data==self.id.data);

            if (m.receiver.data == self.id.data){
              return m.sender.data == person.id.data
            }else if(m.sender.data == self.id.data){
              return m.receiver.data == person.id.data
            }
            return false
            
            

          });

          console.log(newMessages);
          
          messages.set(newMessages);

        })
        .subscribe("SELECT * FROM messages")

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
;
        
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

