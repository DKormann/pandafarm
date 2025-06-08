
import { Identity } from "@clockworklabs/spacetimedb-sdk"
import { Readable, Stored, Writable } from "./store"
import { DbConnection, ErrorContext, Person, ReducerEventContext, SubscriptionEventContext } from "./module_bindings"


import { createGame } from "./online_game"
import { createLeaderboard } from "./leaderboard"
import { createHTMLElement } from "./html"
import { UserCard } from "./user_card"
import { Chat, ChatSessions } from "./chat"

export {}


const dbname = "pandadb2"
const servermode : 'local'|'remote' = (window.location.pathname.split("/").includes("local")) ? 'local' : 'remote';

const dbtoken = new Stored<string>(dbname + servermode + "-token", "")

const log = console.log



export type ServerSession = {
  conn: DbConnection,
  player: Readable<Person>,
  goto: (path:string) => void,
}

log(window.location.pathname)

function requestPlayer(conn: DbConnection | SubscriptionEventContext, identity: Identity, callback: (person: Person) => void, fail : () => void) {
  const query = `SELECT * FROM person WHERE id == '${identity.toHexString()}'`
  conn.subscriptionBuilder()
  .onApplied((ctx: SubscriptionEventContext) => {
    const mypersons = Array.from(ctx.db.person.iter()).filter((p:Person)=>p.id.toHexString() == identity.toHexString())
    if (mypersons.length == 0){
      fail();
    }else {
      callback(mypersons[0]);
    }
  })
  .onError((ctx: ErrorContext) => {
    log("Error in player subscription", ctx.event);
    fail();
  })
  .subscribe(query)
}


let competition = new Writable<Person[]>([]);


function onConnect(conn: DbConnection, identity: Identity,token: string,){

  dbtoken.set(token);
  // updateCompetition(conn);

  conn.subscriptionBuilder()
  .onApplied((ctx: SubscriptionEventContext) => {competition.set(Array.from(ctx.db.person.iter()))})
  .onError((ctx: ErrorContext) => { console.error("Error in competition subscription", ctx.event); })
  .subscribe(`SELECT * FROM person WHERE highscore > 0 `)


  const startSession = (player: Person) => {
    const writable = new Writable<Person>(player)

    const updatePlayer = (ctx: ReducerEventContext) => {
      log("update", ctx.event.reducer.name, ctx.event.callerIdentity.toHexString().slice(-6))
      if (ctx.event.status.tag !== "Committed") return
      let persons = Array.from(ctx.db.person.iter())
      if (ctx.event.callerIdentity.toHexString() != identity.toHexString()) return;
      competition.set(persons)
      persons.filter((p:Person)=>p.id.toHexString() == identity.toHexString()).forEach(p=>{
      writable.set(p, true);
      })
    }

    conn.reducers.onPlayGreen(updatePlayer)
    conn.reducers.onPlayRed( c=>{
      log("onred")
      updatePlayer(c)})
    conn.reducers.onSellGameWorth(updatePlayer)
    conn.reducers.onSetPersonName(c=>{
      if (c.event.status.tag == "Failed"){
        alert("Failed to set name: " + c.event.status.value);
      }
      updatePlayer(c);
    })
    conn.reducers.onResetBank(updatePlayer)

    const session: ServerSession = {
      conn: conn,
      player: writable,
      goto: goto,
    }
    waiter.remove();



    startGame(session)

  }
  
  requestPlayer(conn, identity,
    startSession,
    ()=>{
      conn.reducers.onCreatePerson((ctx: ReducerEventContext) => {
        requestPlayer(conn, identity, startSession, () => {
          log("Failed to create player, retrying...");
          setTimeout(() => ConnectServer(), 1000);
        });
      })
      conn.reducers.createPerson()
    }
  );

}

const head = createHTMLElement("h2", {
  parentElement:document.body,
  id:"head",
}, "🏠 Panda Farm")


const waiter = createHTMLElement("h1", {parentElement:document.body}, "Waiting for connection...");


const navbar = createHTMLElement("nav", {id:"navbar", parentElement:document.body});


const page = createHTMLElement("div", {id:"page", parentElement:document.body});

// @ts-ignore
const serverurl = (servermode == 'local') ? "ws://localhost:3000" : "wss://maincloud.spacetimedb.com";

function ConnectServer(){

  return DbConnection.builder()
  // @ts-ignore
  .withUri(serverurl)
  .withModuleName(dbname)
  .withToken(dbtoken.get())
  .onConnect(onConnect)
  .onConnectError((ctx: ErrorContext, error: Error) => log("onConnectError", error))
  .build()
  
}

ConnectServer()


const start_path = window.location.pathname.split("/").filter(p => ["pandafarm", "local"].includes(p)).join("/") + "/";

log("Start path:", start_path);

function goto(url:string){
  url = start_path + url;
  url = url.split("/").filter(p => p.length > 0).join("/");
  
  url = window.origin + "/" + url
  log("Goto", url);
  window.history.pushState({}, "", url);
}



function startGame(session: ServerSession){
  
  

  session.player.subscribe(p=>{
    if (p.highscore != session.player.get().highscore){
      log("Highscore updated", p.highscore);
    }
    if (p.bank == 0){
      let pr = window.prompt("You have no money left, say please to get more");
      if (pr && pr.length >0){
        session.conn.reducers.resetBank();
      }
    }
  })

  const board = createLeaderboard(session, competition);

  
  const game = createGame(
    session.player,
    ()=>session.conn.reducers.sellGameWorth(),
    ()=>session.conn.reducers.playRed(),
    ()=>session.conn.reducers.playGreen(),
  );
  
  
  function loadpath(url: string){
    let path = url.split("/").filter(p => p.length > 0);
    page.innerHTML = "";
    if (path[0] == "pandafarm") path = path.slice(1);
    if (path[0] == "local") path = path.slice(1);
    if (path.length == 0){
      page.appendChild(game);
      page.appendChild(board);
      return;
    }
    if (path[0] == "user"){
      if (path[1]!=undefined){
        page.appendChild(UserCard(session, path[1]));
        return
      }
    }else if (path[0] == "chat"){
      log(path)
      if (path[1] != undefined){
        page.appendChild(UserCard(session, path[1]));
        return
      }else{
        page.appendChild(ChatSessions(session));
        return
      }
    }
    page.appendChild(createHTMLElement("h1", {}, "Page not found"));
  }

  window.addEventListener("popstate", (event) => {
    log("Popstate event", event);
    loadpath(window.location.pathname);
  });

  loadpath(window.location.pathname);

  
  
  session.goto = (path: string) => {goto(path); loadpath(path)};
  head.onclick = () => session.goto("/")

  const homebutn = createHTMLElement("span", {parentElement:navbar, id:"homebutn"}, "home ")
  homebutn.onclick = () => {
    navbar.querySelectorAll(".active").forEach(el => el.classList.remove("active"));
    homebutn.classList.add("active");
    session.goto("/")
  }

  const msgbutn = createHTMLElement("span", {parentElement:navbar, id:"msgbutn"}, "messages")
  msgbutn.onclick = () => {
    navbar.querySelectorAll(".active").forEach(el => el.classList.remove("active"));
    msgbutn.classList.add("active");
    session.goto("/chat")
  }



}

