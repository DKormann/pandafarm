

import { Writable, Readable } from "./store.js";
import { createHTMLElement } from "./html.js";
import { Person } from "./module_bindings/person_type.js";


// const skins = ["1","2","4","8","16","32","64","128","256","512","1024",];
export const skins = ["🐭","🐹","🐱","🐶","🐻","🐯","🦁","🐼","🐸","🐲",]

export function createGame(
  player: Readable<Person>,
  sell: () => void,
  red: () => void,
  green: ()=> void,
){

  
  let game = createHTMLElement("div", { id: "game" });


  createHTMLElement("h2", {parentElement:game}, "Panda Farm");

  const balanceElement = createHTMLElement("p", {parentElement: game});
  const animalsElement = createHTMLElement("div", {id: "animals", parentElement: game});
  animalsElement.className = "animals";
  const highscoreElement = createHTMLElement("p", {parentElement: game}, "Highscore: 0$");

  
    const redbutton = createHTMLElement("button", {
      id:"button1",
      parentElement: game
    }, "Beef 🍖")
  
    
    const greenbutton = createHTMLElement("button", {
      id:"button2",
      parentElement: game
    }, "Broc 🥦");
  
  
    createHTMLElement("p", {parentElement: game});
  
    const sellbutton = createHTMLElement("button", {
      id:"sellbutton",
      parentElement: game
    }, "Sell");

  player.subscribe(newplayer => {
    balanceElement.textContent = `bank: ${newplayer.bank}$`;
    
    animalsElement.innerHTML = "";
    for (let animalType of newplayer.gameState) {
      const animal = createHTMLElement("div", {
        className: "animal",
        parentElement: animalsElement,
      }, skins[animalType]
      )
      animal.classList.add("animal");
      animal.classList.add("active");
    }
    highscoreElement.textContent = `Highscore: ${
      newplayer.highscoreState.reduce((acc, curr) => acc + skins[curr], "")
    }`

    sellbutton.textContent = `Collect ${newplayer.gameState.reduce((acc, curr) => acc + 2 ** curr, 0)}$`;
  })


  
  redbutton.classList.add("bigbutton");
  greenbutton.classList.add("bigbutton");
  sellbutton.classList.add("bigbutton");

  redbutton.onclick = red;
  greenbutton.onclick = green;
  sellbutton.onclick = sell;


  return game
}

