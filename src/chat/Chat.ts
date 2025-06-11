
import { Identity } from "@clockworklabs/spacetimedb-sdk";
import { ServerSession } from "../main";
import { ChatView } from "./chatView";
import { Writable } from "../store";
import { ChatPreview, SessionsView } from "./sessionsView";
import { Gift, Message, Person, Unread } from "../module_bindings";
import { createHTMLElement } from "../html";
import { requestPlayerId, requestPlayerName } from "../server_helpers";


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
  const sessionsView = SessionsView(previews, session.goto)
  const partner = new Writable<Person>(session.player.get());
  const allMessages = new Writable<Map<bigint, Sendable[]>>(new Map<bigint, Sendable[]>());
  const partnerMessages = new Writable<Sendable[]>([]);

  const playerid = session.player.get().id;
  const playeridhex = playerid.toHexString();


  allMessages.subscribeLater(async rmsgs=>{
    partnerMessages.set(rmsgs.get(partner.get().id.data) ?? [])
    
    const names = await Promise.all(
      rmsgs.entries().map(async ([id, msgs]) => {
        let name = await requestPlayerId(session.conn, new Identity(id))
        .then(p => p.name)
        .catch(() => 
          {
            console.log("Could not find player with id", id, "falling back to unknown");
            "unkown"
          })
        return { unread: false,
          item: msgs[0],
          sender: name,
        } as ChatPreview;
      })
    )
    previews.set(names);
  })

  partner.subscribeLater(p =>{
    partnerMessages.set(allMessages.get().get(p.id.data) ?? []);
  })

  const addSend = (msg : Sendable) =>{
    if (msg.sender.data!== playerid.data  && msg.receiver.data != playerid.data) return console.log("Ignoring message not for this player:", msg);
    const otherParty = msg.sender.data == playerid.data ? msg.receiver : msg.sender;
    allMessages.update(rmsg => {
      rmsg.set(otherParty.data, (rmsg.get(otherParty.data) ?? []).concat (msg))
      console.log(rmsg.get(otherParty.data)?.length)
      return rmsg;
    }, true)
  }

  const getname = (id:Identity) => session.conn.db.person.id.find(id)?.name ;

  const addMessage = (msg: Message) => {
    console.log("Adding message:", msg.content, getname(msg.sender), "to", getname(msg.receiver));
    addSend({...msg, type: "message"});
  }
  const addGift = (msg: Gift) =>  addSend({...msg, type: "gift"});

  


  session.conn.subscriptionBuilder()
  .onApplied(ctx=>{
    ctx.db.messages.onInsert((_, msg)=>{addMessage(msg)})
    ctx.db.gifts.onInsert((_, gift)=>{addGift(gift)})
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


  const chatView = ChatView(session.player, partner, partnerMessages,
    m => {session.conn.reducers.sendMessage(partner.get().id, m)},
    g => {session.conn.reducers.sendGift(partner.get().id, g)},
  )

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

