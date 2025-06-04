
import { Identity } from "@clockworklabs/spacetimedb-sdk"
import { Stored } from "./store"
import { DbConnection,ErrorContext, EventContext, Person, ReducerEventContext, SubscriptionEventContext } from "./module_bindings"


// import {create_game} from "./game"
import { createGame } from "./online_game"

import { createHTMLElement } from "./html"
import { createLeaderboard } from "./leaderboard"

export {}

const dbname = "pandadb"
const servermode : 'local'|'remote'  = 'remote';
const dbtoken = new Stored<string>(dbname + servermode + "-token", "")
const userId = new Stored<string>(dbname + servermode + "-userId", "defaultUserId");

let bank = new Stored<number>("bank", 99);

let gameState = new Stored<number[]>("gameState", []);


const log = console.log


function updateGame(conn: DbConnection | SubscriptionEventContext){

  conn.subscriptionBuilder()
  .onApplied((ctx: SubscriptionEventContext) => {
    for (let person of ctx.db.person.iter()) {
      log("Person:", person.name, person.bank, person.gameState)
      bank.set(person.bank);
      gameState.set(person.gameState);
    }
  })
  .subscribe(`SELECT * FROM person WHERE id = '${userId.get()}'`)
}

function onConnect(conn: DbConnection, identity: Identity,token: string,){


  waiter.remove();  
  dbtoken.set(token)
  userId.set(identity.toHexString());

  updateGame(conn);
  
  conn.reducers.onCreatePerson((ctx: ReducerEventContext)=>{
    updateGame(ctx);
  })

  conn.reducers.onPlayRed((c=>{
    updateGame(c);
  }))
  conn.reducers.onPlayGreen(updateGame)

  conn.reducers.onSellGameWorth(updateGame)

  conn.reducers.onSetPersonName((ctx: ReducerEventContext)=>{
    console.log("onSetPersonName", ctx.event.status)
    if (ctx.event.status.tag == "Failed") {
      alert("Failed to set name:" + ctx.event.status.value)
    };
  })

  conn.reducers.createPerson()


}

function setPersonName( conn: DbConnection, name: string) {
  conn.reducers.setPersonName(name)
}

const waiter = createHTMLElement("h1", {}, "Waiting for connection...");
document.body.appendChild(waiter);



const conn =
DbConnection.builder()
    // @ts-ignore
    .withUri((servermode == 'local')?"ws://localhost:3000" : "wss://maincloud.spacetimedb.com")
    .withModuleName(dbname)
    .withToken(dbtoken.get())
    .onConnect(onConnect)
    .onConnectError((ctx: ErrorContext, error: Error) =>{
      log("onConnectError", error)
    })
    .build()


start_game(conn);



function start_game(conn:DbConnection){

  const leaderbutton = createHTMLElement("h3", {}, "Leaderboard");

  document.body.appendChild(leaderbutton);
  let username = new Stored <string> ("username", "myname");


  const competition = [
    { name: "Alice", score: "100" },
    { name: "Bob", score: "80" },
    { name: "Charlie", score: "60" }
  ]

  let board = createLeaderboard( username, competition);

  username.subscribeLater((name) => {
    setPersonName(conn,name);
  })


  board.classList.add("hidden");
  document.body.appendChild(board);



  const game = createGame(
    bank,
    gameState,
    ()=> conn.reducers.sellGameWorth(),
    ()=> conn.reducers.playRed(),
    ()=> conn.reducers.playGreen(),
  );

  document.body.appendChild(game);


  leaderbutton.addEventListener("click", () => {
    board.classList.toggle("hidden");
    game.classList.toggle("hidden");
  });
}

