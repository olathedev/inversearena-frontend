#![no_std]
use soroban_sdk::{contract, contractimpl, Env};

#[contract]
pub struct FactoryContract;

#[contractimpl]
impl FactoryContract {
    pub fn hello(env: Env) -> u32 {
        456
    }
}

#[cfg(test)]
mod test;
