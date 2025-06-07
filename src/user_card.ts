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

        const head = createHTMLElement("div", {parentElement:card});
        createHTMLElement("span", {style: "font-size: 1.5em;", parentElement:head}, `@${person.name} `);

        // const followbutton = createHTMLElement("span", {
        //   style: "cursor: pointer; font-weight: bold; text-decoration: underline;",
        //   parentElement:head}, "follow")

        // followbutton.addEventListener("click", () => {
        //   session.conn.reducers.follow(person.id);
        //   followbutton.innerText = "following";
        // })

        createHTMLElement("p", {parentElement:card}, `bank: ${person.bank}$, highscore: ${person.highscore}$ ${person.highscoreState.reduce((acc:string, curr:number) => acc + skins[curr], "")}`);


        

        card.appendChild(Chat(session, person.name))


      }
    }
  })
  .subscribe(`SELECT * FROM person WHERE name == '${userName}'`);

  
  
  
  
  return card;


}


