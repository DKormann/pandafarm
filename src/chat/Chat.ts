
import { Identity } from "@clockworklabs/spacetimedb-sdk";
import { ServerSession } from "../main";
import { ChatView } from "./chatView";
import { Writable } from "../store";
import { ChatPreview, SessionsView } from "./sessionsView";
import { Gift, Message, Person, Unread } from "../module_bindings";
import { EventContext } from "../module_bindings";
import { createHTMLElement } from "../html";


export type Sendable = 
{sender: Identity, receiver: Identity, timestamp: BigInt} &
({
  type: "gift",
  animal: number,
} | {
  type: "message",
  content: string,
})

export function Chat (session: ServerSession) {

  const previews = new Writable<ChatPreview[]>([]);
  const sessionsView = new SessionsView(previews)
  const partner = new Writable<Person>(session.player.get());
  const allMessages = new Writable<Map<Identity, Sendable[]>>(new Map<Identity, Sendable[]>());
  const partnerMessages = new Writable<Sendable[]>([]);

  const playerid = session.player.get().id;
  const playeridhex = playerid.toHexString();


  allMessages.subscribeLater(rmsgs=>{
    partnerMessages.set(rmsgs.get(partner.get().id) ?? [])
  })

  partner.subscribeLater(p =>{
    partnerMessages.set(allMessages.get().get(p.id) ?? []);
  })

  const chatView = new ChatView(session.player, partner, partnerMessages, m => {
    if (m.type === "gift") {
      session.conn.reducers.sendGift(m.receiver, m.animal);
    }else{
      session.conn.reducers.sendMessage(m.receiver, m.content);
    }
  })

  const addSend = (msg : Sendable) =>{
    if (msg.sender!== playerid && msg.receiver != playerid) return
    const otherParty = msg.sender.data == playerid.data ? msg.receiver : msg.sender;
    allMessages.update(rmsg => {
      rmsg.set(otherParty, (rmsg.get(otherParty) ?? []).concat (msg))
      return rmsg;
    }, true)
  }

  const addMessage = (msg: Message) =>  addSend({...msg, type: "message"});
  const addGift = (msg: Gift) =>  addSend({...msg, type: "gift"});

  const addPreview = (u: Unread)=>{
    previews.set(u.senders.map(s=>
    ({
      unread:s.data != partner.get().id.data,
      item: allMessages.get().get(s)![0],
      sender: session.conn.db.person.id.find(s).name ?? "unknown"
    })
    ))
  }

  session.conn.subscriptionBuilder()
  .onApplied(ctx=>{
    for (let m of ctx.db.messages.iter() ){addMessage(m);}
    ctx.db.messages.onInsert((_, msg)=>{addMessage(msg)})
    ctx.db.gifts.onInsert((_, gift)=>{addGift(gift)})
    ctx.db.unread.onInsert((_, p)=>{addPreview(p)})
    ctx.db.unread.onUpdate((_,o, p)=>{addPreview(p)})
  })
  .onError(error => console.error("Error in chat subscription:", error))
  .subscribe([
    `SELECT * FROM messages WHERE receiver == '${playeridhex}' OR sender == '${playeridhex}'`,
    `SELECT * FROM gifts WHERE receiver == '${playeridhex}' OR sender == '${playeridhex}'`,
    `SELECT * FROM unread WHERE receiver == '${playeridhex}'`,
  ])

  const PartnerSubscription = session.conn.subscriptionBuilder()
  .onApplied((ctx) => {
  })
  .onError((error) => {
    console.error("Error in partner subscription:", error);
  })

  PartnerSubscription.subscribe(`SELECT * FROM person WHERE id != '${playeridhex}'`);

  return {
    sessionsView: sessionsView as HTMLElement,
    chatView: (name: string) =>{
      const person = session.conn.db.person.name.find(name);
      if (!person) {
        createHTMLElement("div", {class: "chat-error"}, `Person with name ${name} not found`);
      }
      partner.set(person); 
      return chatView as HTMLElement;
    }
  }

  // }
}

