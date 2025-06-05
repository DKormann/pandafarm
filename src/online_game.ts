

import { Writable, Readable } from "./store.js";
import { createHTMLElement } from "./html.js";
import { Person } from "./module_bindings2/person_type.js";
import { AnimalAction } from "./module_bindings2/animal_action_type.js";


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
  
  
  class Animal{
    element: HTMLElement;
    type:number;
    constructor(type: number) {
      this.element = createHTMLElement("div", {
      }, skins[type]);
      this.element.classList.add("animal");
      setTimeout(() => {
        this.element.classList.add("active");
      }, 10);
      this.type = type;
    }

    settype(type:number){
      this.element.textContent = skins[type];
      this.type = type;
    }

    update(action:AnimalAction): Animal[] {
      if (action.action.tag == "Dead"){
        this.element.classList.remove("active");
        setTimeout(() => {
          this.element.remove();
        }, 1000);
        return [];
      }else if (action.action.tag == "Dublicate"){
        const child = new Animal(this.type);
        child.element.classList.add("fresh");
        this.element.classList.add("fresh");
        setTimeout(() => {
          this.element.classList.remove("fresh");
          child.element.classList.remove("fresh");
        }, 10);
        this.element.insertAdjacentElement("afterend", child.element);
        return [this,child];
      }else if (action.action.tag == "Levelup") {
        this.settype(this.type + 1);
      }
      return [this];
    }
  }

  let animals: Animal[] = [];

  const createAnimals = (gameState: number[]) => {
    animalsElement.innerHTML = "";
    animals = gameState.map((animalType) => {
      const animalInstance = new Animal(animalType);
      animalsElement.appendChild(animalInstance.element);
      return animalInstance;
    })
  }

  player.subscribe(newplayer => {
    balanceElement.textContent = `bank: ${newplayer.bank}$`;
    
    if (
      newplayer.lastActionResult.length == animals.length &&
      newplayer.lastActionResult.every((action, index) => action.animal === animals[index].type)
    ){
      console.log("merging actions");
      const newanimals: Animal[] =
        newplayer.lastActionResult.flatMap((action, index) => {
          const animal = animals[index];
          return animal.update(action);
        });
      animals = newanimals;
      if (animals.length == 0){
        animals.push(new Animal(0));
        animalsElement.appendChild(animals[0].element);
      }

    }else{
      createAnimals(newplayer.gameState);
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

