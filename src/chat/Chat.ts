
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
  const partner = new Writable<Person>(session.player.get());
  const allMessages = new Writable<Map<bigint, Sendable[]>>(new Map<bigint, Sendable[]>());
  const partnerMessages = new Writable<Sendable[]>([]);
  const unread = new Writable<Map<bigint, number>>(new Map<bigint, number>)
  const sessionsView = SessionsView(previews, unread, session.goto)

  const playerid = session.player.get().id;
  const playeridhex = playerid.toHexString();


  allMessages.subscribeLater(async rmsgs=>{
    partnerMessages.set(rmsgs.get(partner.get().id.data) ?? [])
    
    previews.set(
      (await Promise.all(
      rmsgs.entries().map(async ([id, msgs]) => {
        let name = await requestPlayerId(session.conn, new Identity(id))
        .then(p => p.name)
        .catch(() => 
          {
            console.log("Could not find player with id", id, "falling back to unknown");
            "unkown"
          })
        return {
          unread: false,
          item: msgs[msgs.length - 1],
          sender: name,
          senderId: id,
        } as ChatPreview;
      })
    )).sort((a, b) => {
      return b.item.timestamp < a.item.timestamp ? -1 : 1;
    })
  )
  })

  partner.subscribeLater(p =>{
    console.log("mark read ",p.name);
    session.conn.reducers.markRead(p.id)
    partnerMessages.set(allMessages.get().get(p.id.data) ?? []);
  })

  const addSend = (msg : Sendable) =>{
    if (msg.sender.data!== playerid.data  && msg.receiver.data != playerid.data) return console.log("Ignoring message not for this player:", msg);
    const otherParty = msg.sender.data == playerid.data ? msg.receiver : msg.sender;
    allMessages.update(rmsg => {
      rmsg.set(otherParty.data, (rmsg.get(otherParty.data) ?? []).concat (msg))
      return rmsg;
    }, true)
  }

  const getname = (id:Identity) => session.conn.db.person.id.find(id)?.name ;

  const addMessage = (msg: Message) => {
    addSend({...msg, type: "message"});
  }
  const addGift = (msg: Gift) =>  addSend({...msg, type: "gift"});

  const setUnread = (unreadMsg:Unread) =>{
    if (unreadMsg.receiver.data != playerid.data) return
    let unreads = new Map()
    unreadMsg.senders.forEach(m=>unreads.set(m.data, (unreads.get(m.data) ?? 0) + 1))
    unread.set(unreads)
  }

  session.conn.subscriptionBuilder()
  .onApplied(ctx=>{
    ctx.db.messages.onInsert((_, msg)=>{addMessage(msg)})
    ctx.db.gifts.onInsert((_, gift)=>{addGift(gift)})
    ctx.db.unread.onInsert((_, unreadMsg:Unread) => {
      setUnread(unreadMsg)
    })
    ctx.db.unread.onUpdate((_x,_y,unreadMsg:Unread) => {
      console.log("unread update");
      setUnread(unreadMsg)
    })
  })
  .onError(error => console.error("Error in chat subscription:", error))
  
  .subscribe([
    `SELECT * FROM messages WHERE receiver == '${playeridhex}' OR sender == '${playeridhex}'`,
    `SELECT * FROM gifts WHERE receiver == '${playeridhex}' OR sender == '${playeridhex}'`,
    `SELECT * FROM unread WHERE receiver == '${playeridhex}'`,
  ])

  const PartnerSubscriptionBuilder = session.conn.subscriptionBuilder()
  .onApplied((ctx) => {
    ctx.db.person.onUpdate((_, old, person) =>{
      console.log("partner update");
      partner.set(person);
    })
    ctx.db.person.onInsert((_, person) => {
      console.log("partner insert", person.name);
      if (person.id.data === playerid.data) {
        partner.set(person);
      }
    })
  })
  .onError((error) => {
    console.error("Error in partner subscription:", error);
  })
  
  let PartnerSubscription :any = null;

  const setPartner = (name: string) =>{
    let newsub = PartnerSubscriptionBuilder.subscribe(`SELECT * FROM person WHERE name == '${name}'`);
    if (PartnerSubscription) PartnerSubscription.unsubscribe();
    PartnerSubscription = newsub;
    partner.set(session.conn.db.person.name.find(name) )
  }

  const chatView = ChatView(session.player, partner, partnerMessages,
    m => {session.conn.reducers.sendMessage(partner.get().id, m)},
    g => {session.conn.reducers.sendGift(partner.get().id, g)},
  )

  return {
    sessionsView: sessionsView as HTMLElement,
    chatView: (name: string) =>{
      setPartner(name);
      return chatView as HTMLElement;
    }
  }

}

