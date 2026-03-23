#[cfg(test)]
use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env};

#[test]
fn test() {
    let env = Env::default();
    let contract_id = env.register_contract(None, FactoryContract);
    let client = FactoryContractClient::new(&env, &contract_id);

    assert_eq!(client.hello(), 456);
}
