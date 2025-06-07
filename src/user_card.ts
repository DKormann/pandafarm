import { Chat } from "./chat";
import { createHTMLElement } from "./html";
import { ServerSession } from "./main";
import { skins } from "./online_game";


export function UserCard(session:ServerSession, userName: string) {
  const card = createHTMLElement("div", {});

  // createHTMLElement("h2", {parentElement:card}, userName);

  session.conn.subscriptionBuilder()
  .onApplied(c=>{
    for (let person of c.db.person.iter()){
      if (person.name === userName) {
        // createHTMLElement("h2", {parentElement:card}, `${person.gameState.reduce((acc:string, curr:number) => acc + skins[curr], "")}`);
        // createHTMLElement("p", {parentElement:card}, `bank: ${person.bank}$`);
        // createHTMLElement("p", {parentElement:card}, `Highscore: ${person.highscore}$ ${person.highscoreState.reduce((acc:string, curr:number) => acc + skins[curr], "")}`);
        createHTMLElement("p", {parentElement:card}, `bank: ${person.bank}$, highscore: ${person.highscore}$ ${person.highscoreState.reduce((acc:string, curr:number) => acc + skins[curr], "")}`);
        

        card.appendChild(Chat(session, person.name))


      }
    }
  })
  .subscribe(`SELECT * FROM person WHERE name == '${userName}'`);

  
  
  
  
  return card;


}


