import { Chat } from "./chat";
import { createHTMLElement } from "./html";
import { ServerSession } from "./main";
import { skins } from "./online_game";


function UserCard(session:ServerSession, userName: string) {
  const card = createHTMLElement("div", {id: "user_card"});
  

  session.conn.subscriptionBuilder()
  .onApplied(c=>{
    for (let person of c.db.person.iter()){
      if (person.name === userName) {

        const head = createHTMLElement("div", { parentElement:card});
        createHTMLElement("span", {style: "font-size: 1.5em;", parentElement:head}, `@${person.name} `);

        createHTMLElement("p", {parentElement:head}, `bank: ${person.bank}$, highscore: ${person.highscore}$ ${person.highscoreState.reduce((acc:string, curr:number) => acc + skins[curr], "")}`);

        card.appendChild(Chat(session, person.name))

      }
    }
  })
  .subscribe(`SELECT * FROM person WHERE name == '${userName}'`);

  
  
  
  
  return card;


}


