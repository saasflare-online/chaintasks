// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title TaskManager
 * @dev A personal on-chain todo list where tasks are stored immutably.
 */
contract TaskManager {
    struct Task {
        uint256 id;
        string content;
        bool completed;
        address owner;
    }

    uint256 private _taskIdCounter;
    mapping(uint256 => Task) private _tasks;
    mapping(address => uint256[]) private _userTaskIds;

    event TaskAdded(uint256 indexed taskId, address indexed owner, string content);
    event TaskToggled(uint256 indexed taskId, bool completed);
    event TaskDeleted(uint256 indexed taskId);

    modifier onlyTaskOwner(uint256 taskId) {
        require(_tasks[taskId].owner == msg.sender, "Not the task owner");
        _;
    }

    /**
     * @dev Adds a new task for the sender.
     * @param content The task description.
     */
    function addTask(string calldata content) external {
        uint256 newTaskId = _taskIdCounter++;
        _tasks[newTaskId] = Task(newTaskId, content, false, msg.sender);
        _userTaskIds[msg.sender].push(newTaskId);
        emit TaskAdded(newTaskId, msg.sender, content);
    }

    /**
     * @dev Toggles the completion status of a task.
     * @param taskId The ID of the task.
     */
    function toggleTaskComplete(uint256 taskId) external onlyTaskOwner(taskId) {
        _tasks[taskId].completed = !_tasks[taskId].completed;
        emit TaskToggled(taskId, _tasks[taskId].completed);
    }

    /**
     * @dev Deletes a task.
     * @param taskId The ID of the task.
     */
    function deleteTask(uint256 taskId) external onlyTaskOwner(taskId) {
        uint256[] storage ids = _userTaskIds[msg.sender];
        bool found = false;
        for (uint256 i = 0; i < ids.length; i++) {
            if (ids[i] == taskId) {
                ids[i] = ids[ids.length - 1];
                ids.pop();
                found = true;
                break;
            }
        }
        require(found, "Task ID not found in user list");
        
        delete _tasks[taskId];
        emit TaskDeleted(taskId);
    }

    /**
     * @dev Returns all tasks for the connected wallet.
     */
    function getMyTasks() external view returns (Task[] memory) {
        uint256[] memory ids = _userTaskIds[msg.sender];
        Task[] memory tasks = new Task[](ids.length);
        for (uint256 i = 0; i < ids.length; i++) {
            tasks[i] = _tasks[ids[i]];
        }
        return tasks;
    }
}
