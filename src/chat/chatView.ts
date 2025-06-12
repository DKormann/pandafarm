
import { createHTMLElement, Dialog } from "../html";
import { Message, Person } from "../module_bindings";
import { Readable } from "../store";
import { Sendable } from "./Chat";
import { skins } from "../game";

export function ChatView(self:Readable<Person>, partner: Readable<Person>, msgs: Readable<Sendable[]>, sendMessage: (msg: string) => void, sendGift: (animal: number) => void): HTMLElement {
  const el = createHTMLElement("div", {id: "chat"} );
  const card = createHTMLElement("div", {id: "user_card", parentElement: el});

  const title = createHTMLElement("h2", {parentElement: card});
  
  const info = card.appendChild(createHTMLElement("p", {}, ""));
  
  partner.subscribe((p) => {
    title.innerText = `Chat with ${p.name}`;
    info.textContent = `bank: ${p.bank}$ highscore: ${p.highscore}$ ${p.highscoreState.reduce((a, b) => a + skins[b], "")} Game: ${p.gameState.reduce((a, b) => a + skins[b], "")}`;
  });

  const messagesElement = createHTMLElement("div", {id: "messages", parentElement: el});
  msgs.subscribe((messages: Sendable[]) => {

    messagesElement.innerHTML = "";

    messages.forEach((msg: Sendable) => {
      const sender = msg.sender.data === self.get().id.data ? "me" : partner.get()?.name || "Unknown";

      createHTMLElement("p", {
        parentElement: createHTMLElement("p", {
          parentElement: messagesElement,
          class: (sender === "me" ? "msg me" : "msg") + (msg.type === "gift" ? " gift" : "")
        })
      }, 
        (msg.type === "message") ? msg.content : skins[msg.animal]
      );
    })
  })

  const giftbutton = createHTMLElement("button", {
    parentElement: el,
    id: "gift_button"
  }, "🎁");

  const sendbutton = createHTMLElement("button", {
    parentElement: el,
    id: "send_button"
  }, "");

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

  sendbutton.addEventListener("click", () => {
    const msg = message_input.value.trim();
    if (msg) {
      sendMessage(msg);
      message_input.value = "";
    }
  });

  giftbutton.addEventListener("click", () => {
    const dialog = Dialog();
    dialog.appendChild(createHTMLElement("h2", {}, "Choose a gift:"));
    for (let i = 0; i < skins.length; i++) {
      const option = createHTMLElement("p", {class:"option"}, `${skins[i]} ${2**i}$`)
      dialog.appendChild(option);
      option.addEventListener("click", () => {
        sendGift(i);
      })
    }
 
  })

  return el
    
  
}