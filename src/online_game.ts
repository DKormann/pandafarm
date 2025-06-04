
import { Writable, Readable } from "./store.js";
import { createHTMLElement } from "./html.js";


// const skins = ["1","2","4","8","16","32","64","128","256","512","1024",];
const skins = ["🐭","🐹","🐱","🐶","🐻","🐯","🦁","🐼","🐸","🐲",]

export function createGame(
  balance: Readable<number>,
  // gameWorth: Readable<number>,
  gameState: Readable<number[]>,
  sell: () => void,
  red: () => void,
  green: ()=> void,
){

  
  let game = createHTMLElement("div", { id: "game" });


  createHTMLElement("h2", {parentElement:game}, "Panda Farm");

  const balanceElement = createHTMLElement("p", {parentElement: game});
  balance.subscribe(value => {
    balanceElement.textContent = `bank: ${value}$`;
  })

  const animalsElement = createHTMLElement("div", {id: "animals", parentElement: game});
  
  animalsElement.className = "animals";
  
  gameState.subscribe(value => {
    animalsElement.innerHTML = "";
    for (let animalType of value) {
      const animal = createHTMLElement("div", {
        className: "animal",
        parentElement: animalsElement,
      }, skins[animalType]
      )
      animal.classList.add("animal");
      animal.classList.add("active");
    }
  })


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


  
  redbutton.classList.add("bigbutton");
  greenbutton.classList.add("bigbutton");
  sellbutton.classList.add("bigbutton");

  redbutton.onclick = red;
  greenbutton.onclick = green;
  sellbutton.onclick = sell;


  return game
}

