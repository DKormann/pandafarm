import { Identity } from "@clockworklabs/spacetimedb-sdk";
import { ServerSession } from "./main";
import { DbConnection, Person, SubscriptionEventContext } from "./module_bindings";


export function requestPerson(conn: DbConnection, query: string){
  
  return new Promise<Person[]>((resolve, reject) => {


    conn.subscriptionBuilder()
    .onApplied((ctx: SubscriptionEventContext) => {
      const persons = Array.from(ctx.db.person.iter());
      resolve(persons);
    })
    .onError((error) => {
      console.error("Error in requestPerson:", error);
      reject(error)
    }
  )
  .subscribe(query);

  });
}

export function requestPlayerName(conn: DbConnection, name: string) {
  return new Promise<Person>((resolve, reject) => {
    requestPerson(conn, `SELECT * FROM person WHERE name == '${name}'`)
      .then((persons) => {
        persons = persons.filter(p => p.name === name);
        if (persons.length > 0) {
          resolve(persons[0]);
        } else {
          reject(new Error(`Player with name ${name} not found`));
        }
    })


  })
}

export function requestPlayerId(conn: DbConnection, id:Identity) {
  return new Promise<Person>((resolve, reject) => {
    requestPerson(conn, `SELECT * FROM person WHERE id == '${id.toHexString()}'`)
    .then((persons) => {
      persons = persons.filter(p => p.id.data === id.data);
      if (persons.length > 0) {
        resolve(persons[0]);
      } else {
        reject(new Error(`Player with id ${id.toHexString()} not found`));
      }
    })
    .catch(reject);
  });
}


export function requestSql(conn: DbConnection, query: string) {
  return new Promise((resolve, reject) => {
    conn.subscriptionBuilder()
    .onApplied((ctx: SubscriptionEventContext) => {
      resolve(null);
    })
    .onError((error) => {
      console.error("Error in requestSql:", error);
      reject(error);
    })
  })
}

export function requestCompetition(conn: DbConnection) {
  return requestPerson(conn, `SELECT * FROM person WHERE highscore > 0`);
}



