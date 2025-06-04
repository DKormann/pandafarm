
import { Writable, Readable } from "./store";
import { createHTMLElement } from "./html";
// const skins = ["🐭","🐹","🐱","🐶","🐻","🐯","🦁","🐼","🐸","🐲",]
const skins = ["1","2","4","8","16","32","64","128","256","512","1024",]


export function create_game(balance: Readable<number>, gameWorth:Writable<number>, sell : () => void) {

  let body = document.createElement("div");
  body.id = "game";

  const createHtmlElement = (tag: string, append = false)  => {
    const element = createHTMLElement(tag, {});
    if (append) {
      body.appendChild(element);
    }
    return element;
  }

  const h = createHTMLElement("h1", {});
  body.appendChild(h);

  const balanceElement = createHtmlElement("p", true);
  balance.subscribe(value => {
    balanceElement.textContent = `bank: ${value}$`;
  });

  const animals = new Writable<Animal[]>([]);
  const animalsElement = createHtmlElement("div", true);
  animalsElement.id= "animals";

  const highscore = new Writable(0);
  const highscoreElement = createHtmlElement("p", true);
  highscore.subscribe(value => {
    highscoreElement.textContent = `highscore: ${animals.get().reduce((sum, animal) => sum + animal.face(), "")}`;
  });


  class Animal{
    type: number;
    element: HTMLElement;
    alive = true;

    constructor(type:number){
      this.type = type;
      this.element = createHtmlElement("div", true);
      this.element.textContent = this.face();
      this.element.className = "animal";
      setTimeout(() => this.element.classList.add("active"), 1);
    }

    remove(){
      this.alive = false;
      this.element.classList.add("dead");
      setTimeout(() => {
        this.element.remove();
      },1000);
    }

    face(): string{
      return skins[this.type];
    }

    worth(): number {
      if (!this.alive) return 0;
      return Math.pow(2, this.type);
    }

    update(grow :Boolean): Animal[] {

      const random = Math.random();
      const p = 0.3;

      this.element.classList.toggle("wiggle")
      this.element.classList.toggle("wiggle2")

      if (random < p ){
        this.remove();
        return [];
      }  

      if (random < p*2){
        if (grow && this.type + 1 < skins.length) {
          // navigator?.vibrate?.(20);
          this.type += 1;
          this.element.textContent = this.face();
        }else{
          const newone = new Animal(this.type);
          
          newone.element.classList.add("wiggle");
          this.element.insertAdjacentElement("afterend", newone.element);
          return [this,newone];
        }
      }

      return [this];
    }
  }



  const button1 = createHtmlElement("button", true);
  const button2 = createHtmlElement("button", true);
  button1.className = "bigbutton";
  button2.className = "bigbutton";

  button1.id = "button1";
  button2.id = "button2";

  button1.textContent = "Beef 🍖";
  button2.textContent = "Broc 🥦";

  function startGame(){
    if (animals.get().length > 0) return
    const fst = new Animal(0);
    animalsElement.appendChild(fst.element);
    animals.set([fst]);
    button2.style.display = "inline-block";
  }

  startGame();

  body.addEventListener("click", (e) => startGame())

  button1.onclick = ()=>updateAnimals(true);
  button2.onclick = ()=>updateAnimals(false);

  function updateAnimals(grow = false) {
    animals.update(currentAnimals => {
      let res: Animal[] = [];
      currentAnimals.forEach(animal => {
        if (animal.alive) res.push(...animal.update(grow));
      })
      return res.filter(animal => animal.alive);
    })
    gameWorth.set(animals.get().reduce((sum, animal) => sum + animal.worth(), 0));
  }

  createHtmlElement("p", true)
  const sellbutton = createHtmlElement("button", true);
  sellbutton.className = "bigbutton";
  sellbutton.textContent = "Sell";
  sellbutton.style.backgroundColor = "grey";

  sellbutton.onclick = () => {
    const value = animals.get().reduce((sum, animal) => sum + animal.worth(),0);
    sell();
    animals.get().forEach(animal => animal.remove());
    if (value > highscore.get()) highscore.set(value);
    animals.set([]);
  };

  gameWorth.subscribe(value => {
    sellbutton.textContent = `Sell for ${value}$`;
  });

  return body
}
