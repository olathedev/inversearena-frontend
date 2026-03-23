#![no_std]
use soroban_sdk::{contract, contractimpl, Env};

#[contract]
pub struct PayoutContract;

#[contractimpl]
impl PayoutContract {
    pub fn hello(env: Env) -> u32 {
        789
    }
}

#[cfg(test)]
mod test;
