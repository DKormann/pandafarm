
import { Identity } from "@clockworklabs/spacetimedb-sdk"
import { Readable, Stored, Writable } from "./store"
import { AnimalAction, DbConnection,ErrorContext, EventContext, Person, ReducerEventContext, SubscriptionEventContext } from "./module_bindings"


// import {create_game} from "./game"
import { createGame } from "./online_game"
import { createHTMLElement } from "./html"
import { createLeaderboard } from "./leaderboard"

export {}

const dbname = "pandadb"
const servermode : 'local'|'remote'  = 'local';
const dbtoken = new Stored<string>(dbname + servermode + "-token", "")
const userId = new Stored<string>(dbname + servermode + "-userId", "defaultUserId");
const lastActionResult = new Stored<AnimalAction[]>(dbname + servermode + "-lastActionResult", []);

const log = console.log

type ServerSession = {
  conn: DbConnection,
  player: Readable<Person>,
}


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

function updateCompetition(conn: DbConnection | SubscriptionEventContext) {
  conn.subscriptionBuilder()
  .onApplied((ctx: SubscriptionEventContext) => {

    competition.set(Array.from(ctx.db.person.iter()))
    log("Competition updated", competition.get());

  })
  .onError((ctx: ErrorContext) => {
    log("Error in competition subscription", ctx.event);
  })
  .subscribe(`SELECT * FROM person WHERE highscore > 0 `)
}



function onConnect(conn: DbConnection, identity: Identity,token: string,){

  log("Connected to server")
  
  const startSession = (player: Person) => {
    const writable = new Writable<Person>(player)

    const updatePlayer = (ctx: ReducerEventContext) => {
      requestPlayer(ctx, identity, p=>writable.set(p), ()=> {})
    }

    conn.reducers.onPlayGreen(updatePlayer)
    conn.reducers.onPlayRed(updatePlayer)
    conn.reducers.onSellGameWorth(updatePlayer)
    conn.reducers.onSetPersonName(updatePlayer)

    const session: ServerSession = {
      conn: conn,
      player: writable
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
    }
  );

}

const waiter = createHTMLElement("h1", {}, "Waiting for connection...");
document.body.appendChild(waiter);


const serverurl = (servermode == 'local') ? "ws://localhost:3000" : "wss://maincloud.spacetimedb.com";

function ConnectServer(){

  return DbConnection.builder()
  // @ts-ignore
  .withUri(serverurl)
  .withModuleName(dbname)
  .withToken(dbtoken.get())
  .onConnect(onConnect)
  .onConnectError((ctx: ErrorContext, error: Error) =>{
    log("onConnectError", error)
  })
  .build()
  
}

ConnectServer()

function startGame(session: ServerSession){
  log(session)

  let board = createLeaderboard(session.player, session.conn.reducers.setPersonName, competition);



  const game = createGame(
    session.player,
    ()=>session.conn.reducers.sellGameWorth(),
    ()=>session.conn.reducers.playRed(),
    ()=>session.conn.reducers.playGreen(),
  );

  document.body.appendChild(game);
  document.body.appendChild(board);


}

