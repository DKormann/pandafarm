
import { Identity } from "@clockworklabs/spacetimedb-sdk"
import { Readable, Stored, Writable } from "./store"
import {  DbConnection,ErrorContext, EventContext, Person , ReducerEventContext, SubscriptionEventContext } from "./module_bindings"

import {
  DbConnection as DbConnection2,
  ErrorContext as ErrorContext2,
  EventContext as EventContext2,
  ReducerEventContext as ReducerEventContext2,
  SubscriptionEventContext as SubscriptionEventContext2,
  Person as Person2,
} from "./module_bindings2/"


// import {create_game} from "./game"
import { createGame } from "./online_game"
import { createHTMLElement } from "./html"
import { createLeaderboard } from "./leaderboard"

export {}


const servermode = "remote"
const dbname = "pandadb"



const dbname2 = "pandadb2"

// @ts-ignore
const serverurl = (servermode == 'local') ? "ws://localhost:3000" : "wss://maincloud.spacetimedb.com";




function ConnectServer(dbname:string){

  return DbConnection.builder()
  // @ts-ignore
  .withUri(serverurl)
  .withModuleName(dbname)
  .withToken("")
  .onConnect(ctx=>{

    DbConnection2.builder()
    .withUri(serverurl)
    .withModuleName(dbname2)
    .withToken("")
    .onConnect((ctx2, id2) => {

      ctx2.reducers.onMigrate(c=>{
        console.log(c.event.status.tag)
      })

      ctx.subscriptionBuilder()
      .onApplied(ctx=>{
        for (let p of ctx.db.person.iter()){
          console.log(`Person: ${p.name}`);

          const newperson:Person2 = {
            ... p,
            lastActionResult: []
          }


          ctx2.reducers.migrate(newperson)
          
        }
      })
      .subscribe("SELECT * FROM person",)

    })
    .onConnectError((ctx2: ErrorContext2, error: Error) => {})
    .build()

  })
  .onConnectError((ctx: ErrorContext, error: Error) =>{

  })
  .build()
  
}


ConnectServer(dbname)
