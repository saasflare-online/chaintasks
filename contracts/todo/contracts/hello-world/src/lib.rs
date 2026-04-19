#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Env, String, Vec, Address};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Task {
    pub id: u32,
    pub content: String,
    pub completed: bool,
}

#[contracttype]
pub enum DataKey {
    Tasks(Address),
    Counter(Address),
}

#[contract]
pub struct TaskManager;

#[contractimpl]
impl TaskManager {
    /// Adds a new task for the caller.
    pub fn add_task(env: Env, owner: Address, content: String) -> u32 {
        owner.require_auth();

        let mut tasks: Vec<Task> = env.storage().persistent().get(&DataKey::Tasks(owner.clone())).unwrap_or(Vec::new(&env));
        let mut counter: u32 = env.storage().persistent().get(&DataKey::Counter(owner.clone())).unwrap_or(0);

        let id = counter;
        counter += 1;

        let new_task = Task {
            id,
            content,
            completed: false,
        };

        tasks.push_back(new_task);

        env.storage().persistent().set(&DataKey::Tasks(owner.clone()), &tasks);
        env.storage().persistent().set(&DataKey::Counter(owner.clone()), &counter);

        id
    }

    /// Toggles task completion.
    pub fn toggle_task(env: Env, owner: Address, id: u32) {
        owner.require_auth();

        let mut tasks: Vec<Task> = env.storage().persistent().get(&DataKey::Tasks(owner.clone())).unwrap_or(Vec::new(&env));
        
        for i in 0..tasks.len() {
            let mut task = tasks.get(i).unwrap();
            if task.id == id {
                task.completed = !task.completed;
                tasks.set(i, task);
                break;
            }
        }

        env.storage().persistent().set(&DataKey::Tasks(owner.clone()), &tasks);
    }

    /// Deletes a task.
    pub fn delete_task(env: Env, owner: Address, id: u32) {
        owner.require_auth();

        let tasks: Vec<Task> = env.storage().persistent().get(&DataKey::Tasks(owner.clone())).unwrap_or(Vec::new(&env));
        let mut new_tasks: Vec<Task> = Vec::new(&env);

        for task in tasks.iter() {
            if task.id != id {
                new_tasks.push_back(task);
            }
        }

        env.storage().persistent().set(&DataKey::Tasks(owner.clone()), &new_tasks);
    }

    /// Returns all tasks for an address.
    pub fn get_tasks(env: Env, owner: Address) -> Vec<Task> {
        env.storage().persistent().get(&DataKey::Tasks(owner)).unwrap_or(Vec::new(&env))
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::testutils::Address as _;
    use soroban_sdk::{Env, String};

    #[test]
    fn test_add_and_get_tasks() {
        let env = Env::default();
        let contract_id = env.register(TaskManager, ());
        let client = TaskManagerClient::new(&env, &contract_id);

        let owner = Address::generate(&env);
        env.mock_all_auths();

        let content = String::from_str(&env, "Test task");
        client.add_task(&owner, &content);

        let tasks = client.get_tasks(&owner);
        assert_eq!(tasks.len(), 1);
        assert_eq!(tasks.get(0).unwrap().content, content);
    }

    #[test]
    fn test_toggle_task() {
        let env = Env::default();
        let contract_id = env.register(TaskManager, ());
        let client = TaskManagerClient::new(&env, &contract_id);

        let owner = Address::generate(&env);
        env.mock_all_auths();

        client.add_task(&owner, &String::from_str(&env, "Task to toggle"));
        client.toggle_task(&owner, &0);

        let tasks = client.get_tasks(&owner);
        assert_eq!(tasks.get(0).unwrap().completed, true);

        client.toggle_task(&owner, &0);
        assert_eq!(client.get_tasks(&owner).get(0).unwrap().completed, false);
    }

    #[test]
    fn test_delete_task() {
        let env = Env::default();
        let contract_id = env.register(TaskManager, ());
        let client = TaskManagerClient::new(&env, &contract_id);

        let owner = Address::generate(&env);
        env.mock_all_auths();

        client.add_task(&owner, &String::from_str(&env, "Task 1"));
        client.add_task(&owner, &String::from_str(&env, "Task 2"));
        
        assert_eq!(client.get_tasks(&owner).len(), 2);

        client.delete_task(&owner, &0);
        let tasks = client.get_tasks(&owner);
        assert_eq!(tasks.len(), 1);
        assert_eq!(tasks.get(0).unwrap().id, 1);
    }
}
