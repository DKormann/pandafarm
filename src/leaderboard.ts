import { createHTMLElement } from "./html";
import { Person } from "./module_bindings";
import { Writable, Readable } from "./store";
import { skins } from "./online_game";
import { ServerSession } from "./main";

export function createLeaderboard(session:ServerSession , entries: Readable<Person[]>) {
  
  const leaderboard = createHTMLElement("div", {class: "leaderboard"});

  createHTMLElement("h2", {parentElement:leaderboard}, "Leaderboard")

  const nametag = createHTMLElement("h3", {}, 'Change your name, currently: ')
  const nameelement = createHTMLElement("span", {}, session.player.get().name);
  nameelement.style.textDecoration = "underline";
  nametag.appendChild(nameelement);

  leaderboard.appendChild(nametag)
  nametag.addEventListener("click", () => {
    const result = window.prompt("Your name:", session.player.get().name)?.trim()
    if (result && result.length > 0) {
      session.conn.reducers.setPersonName(result)
    }
  });

  session.player.subscribe(newval => {
    nameelement.textContent = `${newval.name.slice(0,20)}`;
  });


  const list = createHTMLElement("div", {});
  entries.subscribe((entries) => {
    list.innerHTML = "";
    entries.sort((a, b) => b.highscore - a.highscore).slice(0, 100);;
    for (const [index, entry] of entries.entries()) {
      const listItem = createHTMLElement("p", {class:"leaderitem"})
      listItem.innerHTML = `<span class=nametag>${index+1}. ${entry.name.slice(0,20)}</span>: ${entry.highscore}$ : ${entry.highscoreState.reduce((acc:string, curr:number) => acc + skins[curr], "")}`
      listItem.addEventListener("click", () => {
        session.goto(`/user/${entry.name}`);
      })

      list.appendChild(listItem);
    }
  });

  leaderboard.appendChild(list);
  return leaderboard;
}


