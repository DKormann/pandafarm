
import { Identity } from "@clockworklabs/spacetimedb-sdk"
import { Readable, Stored, Writable } from "./store"
import { DbConnection, ErrorContext, Person, ReducerEventContext, SubscriptionEventContext } from "./module_bindings"


import { createGame } from "./game"
import { createLeaderboard } from "./leaderboard"
import { createHTMLElement } from "./html"
import { Chat } from "./chat/Chat"
import { requestCompetition, requestPlayerId } from "./server_helpers"
import { Reducer } from "."
import { createDuell } from "./duell"

export {}


const dbname = "pandadb2"
const servermode : 'local'|'remote' = (window.location.pathname.split("/").includes("local")) ? 'local' : 'remote';

const dbtoken = new Stored<string>(dbname + servermode + "-token", "")


const log = console.log
const panic = (msg: string) => {
  console.error("Panic:", msg);
  alert("ERROR: " + msg);
}

export type ServerSession = {
  conn: DbConnection,
  player: Readable<Person>,
  goto: (path:string) => void,
  updatePlayer: (force?: boolean) => void,
  competition: Readable<Person[]>
}


const head = createHTMLElement("div", {parentElement:document.body, id:"head"})
const title = createHTMLElement("h2", {parentElement:head, id:"title", }, "Panda Farm")
const navbar = createHTMLElement("nav", {parentElement:head, id:"navbar"});

const page = createHTMLElement("div", {id:"page", parentElement:document.body});
const waiter = createHTMLElement("h1", {parentElement:page}, "Waiting for connection...");

const pageReload = () => ConnectServer();

// @ts-ignore
const serverurl = (servermode == 'local') ? "ws://localhost:3000" : "wss://maincloud.spacetimedb.com";

function ConnectServer(){

  return DbConnection.builder()
  .withUri(serverurl)
  .withModuleName(dbname)
  .withToken(dbtoken.get())
  .onConnect(async (conn: DbConnection, identity: Identity, token: string) => {


    await requestCompetition(conn)

    const player = await requestPlayerId(conn, identity)
    .catch(async e => {
      log("No player found, creating new player", e);
      conn.reducers.createPerson();
      return await requestPlayerId(conn, identity)
      .catch(e => {
        panic("Error: Player not created: " + e.message);
        throw e;
      });
    })

    log("Connected as", player.name, "with id", player.id.toHexString());

    const playerWriter = new Writable<Person>(player);
    const competitionWriter = new Writable<Person[]>([]);
    await requestCompetition(conn)
    const updateCompetition = ()=>{
      competitionWriter.set(Array.from(conn.db.person.iter()).filter(p => p.highscore > 0).sort((a, b) => b.highscore - a.highscore))
    }

    const updatePlayer = (force: boolean = false) => 
      requestPlayerId(conn, player.id).then(() => {
        playerWriter.set(conn.db.person.id.find(player.id)!, force)
      })

    dbtoken.set(token);



    updateCompetition();

    conn.reducers.onSellGameWorth((ctx: ReducerEventContext) => {updateCompetition();})

    const session: ServerSession = {
      conn: conn,
      player: playerWriter,
      goto: (path: string) => {goto(path)},
      updatePlayer,
      competition: competitionWriter,
    }

    
    conn.reducers.onSendGift((ctx: ReducerEventContext) => {
      session.updatePlayer()
      updateCompetition();
    })
    conn.reducers.onSetPersonName((ctx: ReducerEventContext) => {
      session.updatePlayer();
      updateCompetition();
    })
    
    
    waiter.remove();
    
    document.body.removeEventListener("click", pageReload);
    
    loadPage(session);
    

  })
  .onConnectError((ctx: ErrorContext, error: Error) =>{  
    log("onConnectError", error)
    document.body.addEventListener("click", pageReload);
  }
  )
  .build()
  
}

ConnectServer()



const start_path = window.location.pathname.split("/").filter(p => ["pandafarm", "local"].includes(p)).join("/") + "/";

function goto(url:string){
  url = start_path + url;
  url = url.split("/").filter(p => p.length > 0).join("/");
  
  url = window.origin + "/" + url
  log("Goto", url);
  window.history.pushState({}, "", url);
}

function loadPage(session: ServerSession){

  const board = createLeaderboard(session);
  const game = createGame(session);
  const home = createHTMLElement("div", {children: [game, board]})

  const duell = createDuell(session);

  session.goto = (path: string) => {goto(path); loadpath(path)};
  const {sessionsView, chatView, unread} = Chat(session);


  type navoption = {
    name: string,
    onclick: (path:string[]) => HTMLElement,
    button?: HTMLElement,
  }

  let navoptions: navoption[] = [{
      name: "home",
      onclick: ()=> home,
    },{
      name: "duell",
      onclick: (path:string[])=> duell,
    },{
      name: "chat",
      onclick: (path:string[])=> {
        if (path.length == 0) return sessionsView
        let {element, scrollToBottom} = chatView(path[0])
        setTimeout(() => {
          scrollToBottom()
        }, 100);
        return element
      },
    }
  ]

  navoptions.forEach(op=>{
    op.button = createHTMLElement("span", {parentElement:navbar, class:"navbutn"}, op.name)
    op.button.onclick = () => {
      session.goto(op.name)
    }
  })

  unread.subscribe(newunread=>{
    const msgbutn = navoptions.find(op=>op.name=="chat")!.button!
    msgbutn.innerHTML = "chat"
    const len = Array.from(newunread).length
    if (len> 0) msgbutn.appendChild(createHTMLElement("span", {class:"unread", style: "color:white"}, `${len}`))
  })


  const loadpath = (url: string) => {
    let path = url.split("/").filter(p => p.length > 0);
    navbar.querySelectorAll(".active").forEach(el => el.classList.remove("active"));
    page.innerHTML = "";
    if (path[0] == "pandafarm") path = path.slice(1);
    if (path[0] == "local") path = path.slice(1);
    if (path.length == 0) path = ["home"];
    let found = false
    navoptions.forEach(op=>{
      if (op.name == path[0]){
        op.button?.classList.add("active")
        page.appendChild(op.onclick(path.slice(1)))
        found = true
      }else{
        op.button?.classList.remove("active")
      }
    })
    if (!found){
      page.appendChild(createHTMLElement("h1", {}, "Page not found"))
    }

  }


  window.addEventListener("popstate", (event) => {
    log("Popstate event", event);
    loadpath(window.location.pathname);
  });

  loadpath(window.location.pathname);
  
  title.onclick = () => session.goto("/")

}

