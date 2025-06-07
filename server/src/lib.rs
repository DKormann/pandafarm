
use std::vec;

use spacetimedb::{rand::{seq::index, Rng}, reducer, table, Identity, ReducerContext, Table};


#[derive(spacetimedb::SpacetimeType, Clone, Copy)]
pub enum AnimalActionType{
  Dublicate,
  Levelup,
  Dead,
  Stay,
}

#[derive(spacetimedb::SpacetimeType, Clone, Copy)]
pub struct AnimalAction{
  animal: u32,
  action: AnimalActionType,
}

#[table (name = lastaction, public)]
pub struct LastActionTime{
  #[primary_key]
  id: Identity,
  timestamp: u64,
  rolling_average: u32,
}

#[table(name = person, public)]
pub struct Person {
  #[primary_key]
  id:Identity,

  #[unique]
  name: String,
  highscore: u32,
  highscore_state: Vec<u32>,
  bank: u32,
  game_state: Vec<u32>,
  last_action_result: Vec<AnimalAction>,
}


// #[table(name = payment, public)]
// pub struct Payment {
  

#[table(name = messages, public)]
pub struct Message{
  sender: Identity,
  receiver: Identity,
  content: String,
  timestamp: u64,
}

#[table(name = payments, public)]
pub struct Payment {
  sender: Identity,
  receiver: Identity,
  amount: u32,
  timestamp: u64,
}

#[table(name = gifts, public)]
pub struct Gift {
  sender: Identity,
  receiver: Identity,
  animal: u32,
  timestamp: u64,
}

#[table(name = followers, public)]
pub struct Follower{
  #[primary_key]
  id: Identity,

  #[index(btree)]
  target: Identity,
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


#[table(name = game_state, private)]
pub struct GameState{
  #[primary_key]
  id: Identity,
  secret_seed: u128,
}


#[reducer(init)]
pub fn init(_ctx: &ReducerContext) {
  // Called when the module is initially published
}

#[reducer(client_connected)]
pub fn identity_connected(_ctx: &ReducerContext) {
  // Called everytime a new client connects
}

#[reducer(client_disconnected)]
pub fn identity_disconnected(_ctx: &ReducerContext) {
  // Called everytime a client disconnects
}


fn check_spam(ctx: &ReducerContext) -> Result<(), String> {
  let now : u64 = ctx.timestamp.to_micros_since_unix_epoch() as u64;

  let last = ctx.db.lastaction().id().find(ctx.sender);
    
  match last {
    None => {
      let new_action = LastActionTime {
        id: ctx.sender,
        timestamp: now,
        rolling_average: 1e6 as u32,
      };
      ctx.db.lastaction().insert(new_action);
      Ok(())
    }
    Some(last_action)=>{

      let delta = now - last_action.timestamp ;
      // average micros between requests
      let new_avg = (last_action.rolling_average * 9 + (delta as u32) * 1) / 10;
      
      // rate limit at 10 reqs / s
      if new_avg < 1e6 as u32 {
        log::info!("spam prevented");
        Err("rate limit".to_string())
      }else{
        ctx.db.lastaction().id().update(LastActionTime{
          id: ctx.sender,
          timestamp: now,
          rolling_average: new_avg,
        });
        Ok(())
      }
      
    }
  }



}


#[reducer]
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
    last_action_result: vec![],
  };

  ctx.db.person().insert(person);
  Ok(())
}   


fn get_person(ctx: &ReducerContext) -> Result<Person, String> {
  ctx.db.person().id().find(ctx.sender)
    .ok_or("Person not found".to_string())
}

#[reducer]
pub fn set_person_name(ctx: &ReducerContext, name: String) -> Result<(), String> {
  
  let mut person = ctx.db.person().id().find(ctx.sender)
    .ok_or("Person not found".to_string())?;

  if person.name == name {return Ok(());}

  person.name = name;
  ctx.db.person().id().update(person);
  Ok(())
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

#[reducer]
pub fn reset_bank(ctx: &ReducerContext) -> Result<(), String> {
  let mut person = get_person(ctx)?;
  if person.bank > 0 {return Ok(());}
  person.bank = (ctx.random::<f32>().fract() * 100.).floor() as u32 + 1;
  person.game_state = vec![0];

  ctx.db.person().id().update(person);
  Ok(())
}




#[reducer]
pub fn sell_game_worth(ctx: &ReducerContext) -> Result<(), String> {
  check_spam(ctx)?;
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
  person.last_action_result = vec![];

  ctx.db.person().id().update(person);
  Ok(())
}


fn apply_animal_actions(ctx: &ReducerContext, mut player: Person, actions: Vec<AnimalAction>)-> Result<(), String> {
  log::info!("Applying animal actions for person: {}", player.name);
  let mut newstate = vec![];
  for AnimalAction{animal, action} in &actions{
    match action{
      AnimalActionType::Dublicate => {
        newstate.push(*animal);
        newstate.push(*animal);
      }
      AnimalActionType::Levelup => {
        if *animal < MAXLEVEL{
          newstate.push(*animal + 1);
        }else{
          newstate.push(*animal);
          newstate.push(*animal);
        }
      }
      AnimalActionType::Stay => {
        newstate.push(*animal);
      }
      _ => {}
    }
  }
  
  if newstate.len() == 0{
    if player.bank>0 {
      player.bank -= 1;
      newstate.push(0);
    }
  }
  player.game_state = newstate;
  
  player.last_action_result = actions;

  ctx.db.person().id().update(player);
  Ok(())
}

// use rand::{prelude::*, Rng};



#[reducer]
pub fn play_red(ctx: &ReducerContext) -> Result<(), String> {
  check_spam(ctx)?;
  let person = get_person(ctx)?;
  
  let mut seed = ctx.rng();

  let actions: Vec<AnimalAction> = person.game_state.iter().map(|x| {
    let rng = seed.gen_range(0..3);
    AnimalAction{
      animal: *x,
      action: if rng == 0 {
        AnimalActionType::Levelup
      }else if rng == 1{
        AnimalActionType::Stay
      }else{
        AnimalActionType::Dead
      }
    }
  }).collect();
  apply_animal_actions(ctx, person, actions)
}

#[reducer]
pub fn play_green(ctx: &ReducerContext) -> Result<(), String> {
  check_spam(ctx)?;
  let person = get_person(ctx)?;
  let mut seed = ctx.rng();
  let actions: Vec<AnimalAction> = person.game_state.iter().map(|x| {
    let rng : u8 = seed.gen_range(0..3);
    AnimalAction{
      animal: *x,
      action: if rng == 0 {
        AnimalActionType::Dublicate
      }else if rng == 1{
        AnimalActionType::Stay
      }else{
        AnimalActionType::Dead
      }
    
    }
  }).collect();
  apply_animal_actions(ctx, person, actions)
}
      

#[reducer]
pub fn send_message(ctx: &ReducerContext, receiver: Identity, content: String) -> Result<(), String> {
  check_spam(ctx)?;
  
  let message = Message {
    sender: ctx.sender,
    receiver,
    content,
    timestamp: ctx.timestamp.to_micros_since_unix_epoch() as u64,
  };

  ctx.db.messages().insert(message);
  Ok(())
}



#[reducer]
pub fn send_gift(ctx: &ReducerContext, receiver: Identity, animal: u32) -> Result<(), String> {
  check_spam(ctx).unwrap();

  let price = (2 as u32).pow(animal);

  let mut sender = ctx.db.person().id().find(ctx.sender).unwrap();
    

  if sender.bank < price {
    return Err("Not enough bank balance".to_string());
  }

  sender.bank -= price;
  ctx.db.person().id().update(sender);
  let mut receiver = ctx.db.person().id().find(receiver).unwrap();
  receiver.bank += price;


  let gift = Gift {
    sender: ctx.sender,
    receiver: receiver.id,
    animal,
    timestamp: ctx.timestamp.to_micros_since_unix_epoch() as u64,
  };

  ctx.db.gifts().insert(gift);
  Ok(())
}
