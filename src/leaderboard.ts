


import { createHTMLElement } from "./html";
import { Writable } from "./store";

export function createLeaderboard(myname:Writable<string> , entries: { name: string, score: String }[]) {
  
  const leaderboard = createHTMLElement("div", {classList: "leaderboard"});


  const nametag = createHTMLElement("h3", {}, `Your name: ${myname.get()}`)
  leaderboard.appendChild(nametag)
  nametag.addEventListener("click", () => {
    const result = window.prompt("Change your name", myname.get())?.trim()
    if (result && result.length > 0) {
      myname.set(result);
    }
  });

  myname.subscribe((name) => {
    nametag.textContent = `Your name: ${name}`;
  });

  const list = createHTMLElement("ul");
  entries.forEach(entry => {
    const listItem = createHTMLElement("li", {}, `${entry.name}: ${entry.score}`);
    list.appendChild(listItem);
  });
  leaderboard.appendChild(list);
  return leaderboard;
}


