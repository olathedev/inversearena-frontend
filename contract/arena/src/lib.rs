#![no_std]
use soroban_sdk::{contract, contractimpl, Env};

#[contract]
pub struct ArenaContract;

#[contractimpl]
impl ArenaContract {
    pub fn hello(env: Env) -> u32 {
        123
    }
}

#[cfg(test)]
mod test;
