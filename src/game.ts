

import { Writable, Readable } from "./store.js";
import { createHTMLElement } from "./html.js";
import { Person } from "./module_bindings/person_type.js";
import { AnimalAction } from "./module_bindings/animal_action_type.js";
import { ServerSession } from "./main.js";

const REQUEST_TIMEOUT = 100; // milliseconds



export const skins = [
  "🐭", // 1
  "🐹", // 2
  "🐱", // 4
  "🐶", // 8
  "🐻", // 16
  "🐯", // 32
  "🦁", // 64
  "🐼", // 128
  "🐸", // 256
  "🐲", // 512
]

export function createGame(session:ServerSession){

  function checkZero(){
    if (session.player.get().bank == 0){
      let pr = window.prompt("You have no money left, say please to get more");
      if (pr && pr.length > 0){
        session.conn.reducers.resetBank();
        session.updatePlayer(true);
      }
    }
  }

  checkZero();

  
  let game = createHTMLElement("div", { id: "game" });

  


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
      const bumb = (el = this.element) =>{
        el.classList.add("fresh");
        setTimeout(() => {
          el.classList.remove("fresh");
        }, 100);
      }
      if (action.action.tag == "Dead"){
        this.element.classList.add("animal","dead")
        setTimeout(() => {
          this.element.remove();
        }, 1000);
        return [];
      }else if (action.action.tag == "Dublicate"){
        const child = new Animal(this.type);
        bumb();
        bumb(child.element);

        this.element.insertAdjacentElement("afterend", child.element);
        return [this,child];
      }else if (action.action.tag == "Levelup") {
        this.type = this.type + 1;
        this.element.classList.remove("active");
        setTimeout(() => {
          this.element.textContent = skins[this.type];
          this.element.classList.add("active");
        },100);
        return [this];
      }else if (action.action.tag == "Stay"){
        bumb();
        return [this];
      }
      console.error("Unknown action type", action.action);
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

  session.player.subscribe(newplayer => {

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



  let triggered = false
  let nextRequest : (()=>void) | null = null

  const triggerRequest = (action: () => void) => {
    if (triggered){
      nextRequest = action 
      return
    }
    triggered = true

    action();

    session.updatePlayer(true);
    checkZero();
  
    setTimeout(() => {
      triggered = false
      if (nextRequest){
        triggerRequest(nextRequest)
        nextRequest=null
      }
    }, REQUEST_TIMEOUT);
  }



  redbutton.addEventListener("click", e => {
    e.preventDefault();
    triggerRequest(()=>session.conn.reducers.playRed());
  })

  greenbutton.addEventListener("click", e => {
    e.preventDefault();
    triggerRequest(() => session.conn.reducers.playGreen());
  })
  sellbutton.addEventListener("click", e => {
    e.preventDefault();
    triggerRequest(() => session.conn.reducers.sellGameWorth());
  })


  return game
}

