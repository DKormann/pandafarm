



import { createHTMLElement } from "./html";
import { Person } from "./module_bindings";
import { Writable, Readable } from "./store";
import { skins } from "./online_game";

export function createLeaderboard(myname:Writable<string> , entries: Readable<Person[]>) {
  
  const leaderboard = createHTMLElement("div", {class: "leaderboard"});

  const nametag = createHTMLElement("h3", {}, 'Your name: ')
  const nameelement = createHTMLElement("span", {}, myname.get());
  nameelement.style.textDecoration = "underline";
  nametag.appendChild(nameelement);

  leaderboard.appendChild(nametag)
  nametag.addEventListener("click", () => {
    const result = window.prompt("Change your name", myname.get())?.trim()
    if (result && result.length > 0) {
      myname.set(result);
    }
  });

  myname.subscribe((name) => {
    nameelement.textContent = `${name}`;
  });


  const list = createHTMLElement("div", {});
  entries.subscribe((entries) => {
    list.innerHTML = "";
    entries.sort((a, b) => b.highscore - a.highscore).slice(0, 100);;
    for (const [index, entry] of entries.entries()) {
      const listItem = createHTMLElement("p", {class:"leaderitem"}, `${index+1}. ${entry.name.slice(0,20)}: ${entry.highscoreState.reduce((acc:string, curr:number) => acc + skins[curr], "")}`);

      list.appendChild(listItem);
    }
  });

  leaderboard.appendChild(list);
  return leaderboard;
}


