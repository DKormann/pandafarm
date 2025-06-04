
use spacetimedb::{Identity, ReducerContext, Table};

#[spacetimedb::table(name = person, public)]
pub struct Person {
    #[primary_key]
    id:Identity,

    #[unique]
    name: String,
    highscore: u32,
    highscore_state: Vec<u32>,
    bank: u32,
    game_state: Vec<u32>,
}

const MAXLEVEL: u32 = 9;

// secure game plan :
// server   ---   client
//   <- game request
//   -> game hash
//   loop [
//   <- move
//   -> game secret + result + next game hash
//   ]


#[spacetimedb::table(name = game_state, private)]
pub struct GameState{
    #[primary_key]
    id: Identity,
    secret_seed: u128,
}


#[spacetimedb::reducer(init)]
pub fn init(_ctx: &ReducerContext) {
    // Called when the module is initially published
}

#[spacetimedb::reducer(client_connected)]
pub fn identity_connected(_ctx: &ReducerContext) {
    // Called everytime a new client connects
}

#[spacetimedb::reducer(client_disconnected)]
pub fn identity_disconnected(_ctx: &ReducerContext) {
    // Called everytime a client disconnects
}


#[spacetimedb::reducer]
pub fn create_person(ctx: &ReducerContext) -> Result<(), String> {

    log::info!("Creating person for identity: {}", ctx.sender.to_string());

    let mut random_id: String = ctx.sender.clone().to_string();
    random_id = "Unknown".to_string() + &random_id;


    let person = Person {
        id: ctx.sender,
        name: random_id,
        highscore: 0,
        highscore_state: vec![],
        bank: 99,
        game_state: vec![0],
    };

    let res = ctx.db.person().try_insert(person);
    match res{
        Ok(p)=>{
            log::info!("Person created with id: {}", p.id);
            Ok(())
        }
        Err(e)=>{
            log::error!("Error creating person: {}", e);
            Err(e.to_string())
        }
    }
}   


fn try_update_person(ctx: &ReducerContext, person: Person) -> Result<(), String> {
    ctx.db.person().id().delete(ctx.sender);
    ctx.db.person().try_insert(person)
        .map_err(|e| e.to_string())
        .map(|_| ())
}

fn get_person(ctx: &ReducerContext) -> Result<Person, String> {
    ctx.db.person().id().find(ctx.sender)
        .ok_or("Person not found".to_string())
}

#[spacetimedb::reducer]
pub fn set_person_name(ctx: &ReducerContext, name: String) -> Result<(), String> {
    
    let mut person = ctx.db.person().id().find(ctx.sender)
        .ok_or("Person not found".to_string())?;

    if person.name == name {return Ok(());}

    person.name = name;
    try_update_person(ctx, person)
}


impl Person{
    pub fn game_worth(&self) -> u32 {
        let mut res = 0;
        for i in self.game_state.iter() {
            res += 2u32.pow(*i);
        }
        res
    }
}

#[spacetimedb::reducer]
pub fn sell_game_worth(ctx: &ReducerContext) -> Result<(), String> {
    let mut person = get_person(ctx)?;
    let game_worth = person.game_worth();

    if game_worth == 0 && person.bank == 0 {
        return Err("No balance to play".to_string());
    }

    if game_worth > person.highscore{
        person.highscore = game_worth;
        person.highscore_state = person.game_state.clone();
    }

    person.bank += game_worth - 1;
    person.game_state = vec![0];

    try_update_person(ctx, person)
}

#[spacetimedb::reducer]
pub fn play_red(ctx: &ReducerContext) -> Result<(), String> {
    let mut person = get_person(ctx)?;

    let mut newstate = vec![];
    for x in person.game_state.iter() {
        if ctx.random() {
            if *x < MAXLEVEL{
                newstate.push(x+1);
            }else{
                newstate.push(*x);
                newstate.push(*x);
            }
        }
    };

    if newstate.is_empty() {
        if person.bank > 0{
            person.bank -= 1;
            newstate.push(0);
        }
    };
    person.game_state = newstate;

    try_update_person(ctx, person)
    
}


#[spacetimedb::reducer]
pub fn play_green(ctx: &ReducerContext) -> Result<(), String> {
    let mut person = get_person(ctx)?;
    let mut newstate = vec![];
    for x in person.game_state.iter() {
        if ctx.random() {
            newstate.push(*x);
            newstate.push(*x);
        }
    };
    if newstate.is_empty() {
        if person.bank > 0{
            person.bank -= 1;
            newstate.push(0);
        }
    };

    person.game_state = newstate;
    try_update_person(ctx, person)
}
        
