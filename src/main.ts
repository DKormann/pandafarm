
import { Identity } from "@clockworklabs/spacetimedb-sdk"
import { Readable, Stored, Writable } from "./store"
import { DbConnection, ErrorContext, Person, ReducerEventContext, SubscriptionEventContext } from "./module_bindings"


import { createGame } from "./online_game"
import { createLeaderboard } from "./leaderboard"
import { createHTMLElement } from "./html"
// import { UserCard } from "./user_card"
import { Chat, ChatSessions } from "./chat"
import { getPersonByName } from "./server_helpers"

export {}


const dbname = "pandadb2"
const servermode : 'local'|'remote' = (window.location.pathname.split("/").includes("local")) ? 'local' : 'remote';

const dbtoken = new Stored<string>(dbname + servermode + "-token", "")

const log = console.log



export type ServerSession = {
  conn: DbConnection,
  player: Readable<Person>,
  goto: (path:string) => void,
  updatePlayer: (force?: boolean) => void,
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


function findplayername(conn: DbConnection, identity: Identity){
  return conn.db.person.id.find(identity)?.name ?? "Unknown Player";
}

function onConnect(conn: DbConnection, identity: Identity, token: string,){

  dbtoken.set(token);
  // updateCompetition(conn);

  conn.subscriptionBuilder()
  .onApplied((ctx: SubscriptionEventContext) => {competition.set(Array.from(ctx.db.person.iter()))})
  .onError((ctx: ErrorContext) => { console.error("Error in competition subscription", ctx.event); })
  .subscribe(`SELECT * FROM person WHERE highscore > 0 `)


  const startSession = (player: Person) => {
    const writable = new Writable<Person>(player)

    const updatePlayer = (ctx: ReducerEventContext) => {
      log("update", ctx.event.reducer.name, findplayername(conn, ctx.event.callerIdentity));

      if (ctx.event.status.tag !== "Committed") return
      let persons = Array.from(ctx.db.person.iter())
      if (ctx.event.callerIdentity.toHexString() != identity.toHexString()) return;
      competition.set(persons)
      persons.filter((p:Person)=>p.id.toHexString() == identity.toHexString()).forEach(p=>{
      writable.set(p, true);
      })
    }

    const getPlayerUpdate = (session: ServerSession, force = false) => {
      requestPlayer(session.conn, identity, (player: Person) => {
        writable.set(player, force);
      }, () => {
        log("Failed to get player update", session.player.get().id.toHexString());
      });
    }

    conn.reducers.onSetPersonName(c=>{
      updatePlayer(c);
    })

    conn.reducers.onSendGift(c=>{
      log("Gift sent by player", findplayername(conn, c.event.callerIdentity));
      log(c.event.reducer.args)
      getPlayerUpdate(session, false);
    })

    const session: ServerSession = {
      conn: conn,
      player: writable,
      goto: goto,
      updatePlayer: (force = false) => getPlayerUpdate(session, force),
    }
    getPersonByName(session, session.player.get().name).then(x=>
      writable.set(x)
    )
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







const waiter = createHTMLElement("h1", {parentElement:document.body}, "Waiting for connection...");

const head = createHTMLElement("div", {parentElement:document.body, id:"head"})
const title = createHTMLElement("h2", {parentElement:head, id:"title", }, "🏠 Panda Farm")
const navbar = createHTMLElement("nav", {parentElement:head, id:"navbar"});

const page = createHTMLElement("div", {id:"page", parentElement:document.body});

// @ts-ignore
const serverurl = (servermode == 'local') ? "ws://localhost:3000" : "wss://maincloud.spacetimedb.com";

function ConnectServer(){

  return DbConnection.builder()
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

  const board = createLeaderboard(session, competition);

  const game = createGame(
    session.player,
    ()=>{
      session.conn.reducers.sellGameWorth()
      session.updatePlayer(true)
    },
    ()=>{
      session.conn.reducers.playRed()
      session.updatePlayer(true)
      checkZero();
    },
    ()=>{
      session.conn.reducers.playGreen()
      session.updatePlayer(true)
      checkZero();
    },
  );

  


  const homebutn = createHTMLElement("span", {parentElement:navbar, id:"homebutn"}, "home ")
  homebutn.onclick = () => {
    session.goto("/")
  }

  const msgbutn = createHTMLElement("span", {parentElement:navbar, id:"msgbutn"}, "messages")
  msgbutn.onclick = () => {
    session.goto("/chat")
  }

  
  
  function loadpath(url: string){
    let path = url.split("/").filter(p => p.length > 0);
    navbar.querySelectorAll(".active").forEach(el => el.classList.remove("active"));

    page.innerHTML = "";
    if (path[0] == "pandafarm") path = path.slice(1);
    if (path[0] == "local") path = path.slice(1);
    if (path.length == 0){
      homebutn.classList.add("active");
      page.appendChild(game);
      page.appendChild(board);
      return;
    }
    if (path[0] == "user"){
      if (path[1]!=undefined){
        page.appendChild(Chat(session, path[1]));
        return
      }
    }else if (path[0] == "chat"){
      msgbutn.classList.add("active");
      if (path[1] != undefined){
        page.appendChild(Chat(session, path[1]));
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
  title.onclick = () => session.goto("/")


}

