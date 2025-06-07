import { ServerSession } from "./main";
import { Person, SubscriptionEventContext } from "./module_bindings";


export function getPersonByName(session: ServerSession, name: string): Promise<Person> {
  return new Promise((resolve, reject) => {
    session.conn.subscriptionBuilder()
      .onApplied((ctx: SubscriptionEventContext) => 
        {
          const persons = Array.from(ctx.db.person.iter()).filter((p: Person) => p.name === name);
          if (persons.length > 0) {
            resolve(persons[0]);
          } else {
            reject(new Error(`Person with name ${name} not found`));
          }
        }
      )
      .subscribe(`SELECT * FROM person WHERE name == '${name}'`)
    })
  }
  

