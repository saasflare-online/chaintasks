import { expect } from "chai";
import { ethers } from "hardhat";
import { TaskManager } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("TaskManager", function () {
  let taskManager: TaskManager;
  let owner: SignerWithAddress;
  let otherAccount: SignerWithAddress;

  beforeEach(async function () {
    [owner, otherAccount] = await ethers.getSigners();
    const TaskManagerFactory = await ethers.getContractFactory("TaskManager");
    taskManager = await TaskManagerFactory.deploy();
  });

  describe("Task Operations", function () {
    it("1. Should add a task correctly", async function () {
      const content = "Learn Solidity";
      await expect(taskManager.addTask(content))
        .to.emit(taskManager, "TaskAdded")
        .withArgs(0, owner.address, content);

      const tasks = await taskManager.getMyTasks();
      expect(tasks.length).to.equal(1);
      expect(tasks[0].content).to.equal(content);
      expect(tasks[0].completed).to.equal(false);
    });

    it("2. Should toggle task completion status", async function () {
      await taskManager.addTask("Task 1");
      await taskManager.toggleTaskComplete(0);

      const tasks = await taskManager.getMyTasks();
      expect(tasks[0].completed).to.equal(true);

      await taskManager.toggleTaskComplete(0);
      const tasksAfter = await taskManager.getMyTasks();
      expect(tasksAfter[0].completed).to.equal(false);
    });

    it("3. Should delete a task", async function () {
      await taskManager.addTask("Task to delete");
      await expect(taskManager.deleteTask(0))
        .to.emit(taskManager, "TaskDeleted")
        .withArgs(0);

      const tasks = await taskManager.getMyTasks();
      expect(tasks.length).to.equal(0);
    });

    it("4. Should only return tasks belonging to the caller (privacy test)", async function () {
      await taskManager.connect(owner).addTask("Owner Task");
      await taskManager.connect(otherAccount).addTask("Other Task");

      const ownerTasks = await taskManager.connect(owner).getMyTasks();
      expect(ownerTasks.length).to.equal(1);
      expect(ownerTasks[0].content).to.equal("Owner Task");

      const otherTasks = await taskManager.connect(otherAccount).getMyTasks();
      expect(otherTasks.length).to.equal(1);
      expect(otherTasks[0].content).to.equal("Other Task");

      // Verify owner cannot toggle otherAccount's task
      await expect(taskManager.connect(owner).toggleTaskComplete(1))
        .to.be.revertedWith("Not the task owner");
    });
  });
});
