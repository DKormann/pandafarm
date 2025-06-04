
import { Identity } from "@clockworklabs/spacetimedb-sdk"
import { Stored, Writable } from "./store"
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
const highscore = new Stored<number[]>(dbname + servermode + "-highscore", [0,0,0,0,0,0,0,0,0,0]);

let username = new Stored <string> ("username", "Unknown2");


const log = console.log

function updateGame(conn: DbConnection | SubscriptionEventContext){

  conn.subscriptionBuilder()
  .onApplied((ctx: SubscriptionEventContext) => {
    for (let person of ctx.db.person.iter()) {
      log("Person:", person.name, person.bank, person.gameState)
      bank.set(person.bank);
      gameState.set(person.gameState);
      highscore.set(person.highscoreState);
    }
  })
  .subscribe(`SELECT * FROM person WHERE id = '${userId.get()}'`)
}
let competition = new Writable<Person[]>([]);

function updateCompetition(conn: DbConnection | SubscriptionEventContext) {
  conn.subscriptionBuilder()
  .onApplied((ctx: SubscriptionEventContext) => {

    competition.set(Array.from(ctx.db.person.iter()))
    log(competition.get())
    log("Competition updated", competition.get());

  })
  .subscribe(`SELECT * FROM person WHERE highscore > 0 `)
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
    // console.log("onSetPersonName", ctx.event.status)
    // if (ctx.event.status.tag == "Failed") {
    //   alert("Failed to set name:" + ctx.event.status.value)
    // };
  })

  updateCompetition(conn);

  conn.reducers.createPerson()


}

function setPersonName( conn: DbConnection, name: string) {
  let res = new Promise<void>((resolve, reject) => {
    conn.reducers.onSetPersonName((ctx: ReducerEventContext) => {
      if (ctx.event.status.tag == "Failed") {
        alert("Failed to set name: " + ctx.event.status.value);
        reject(ctx.event.status.value);
      }else if (ctx.event.status.tag == "Committed"){
        username.set(name);
        resolve();
      }
    })
  })
  conn.reducers.setPersonName(name)
  return res
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



  let board = createLeaderboard(username, name=>setPersonName(conn, name), competition);

  const game = createGame(
    bank,
    gameState,
    highscore,
    
    ()=> conn.reducers.sellGameWorth(),
    ()=> conn.reducers.playRed(),
    ()=> conn.reducers.playGreen(),
  );

  document.body.appendChild(game);
  document.body.appendChild(board);


}

