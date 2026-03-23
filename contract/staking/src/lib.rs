#![no_std]
use soroban_sdk::{contract, contractimpl, Env};

#[contract]
pub struct StakingContract;

#[contractimpl]
impl StakingContract {
    pub fn hello(env: Env) -> u32 {
        101112
    }
}

#[cfg(test)]
mod test;
