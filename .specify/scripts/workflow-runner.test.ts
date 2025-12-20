/*
 * This file is a test file for the workflow-runner.ts file.
 * Use npx vitest run .specify/scripts/workflow-runner.test.ts to run the tests.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import {
  setConfig,
  resetConfig,
  flattenWorkflow,
  generateTasks,
  executeNextTask,
  completeTask,
} from './workflow-runner.js';

const TEST_DIR = '/tmp/workflow-runner-test';
const TASKS_FILE = join(TEST_DIR, 'workflow-tasks.json');
const TEST_WORKFLOWS_DIR = join(TEST_DIR, 'workflows');

// Use real workflows directory
const REAL_WORKFLOWS_DIR = '.windsurf/workflows';

// Inline test workflow content for circular call detection
const CIRCULAR_WORKFLOW_A = `---
description: Test workflow A for circular call detection
---

## Steps

### Step 1: Task A1

This is task A1.

### Step 2: Call Workflow B

<!-- runner:workflow:test-circular-b -->

### Step 3: Task A2

This is task A2.
`;

const CIRCULAR_WORKFLOW_B = `---
description: Test workflow B for circular call detection
---

## Steps

### Step 1: Task B1

This is task B1.

### Step 2: Call Workflow A (Circular!)

<!-- runner:workflow:test-circular-a -->

### Step 3: Task B2

This is task B2.
`;

let logs: string[] = [];
const mockLog = (...args: unknown[]) => {
  logs.push(args.map(a => String(a)).join(' '));
};

// Helper to extract task names from JSON
function extractTaskNamesFromJson(content: string): string[] {
  try {
    const data = JSON.parse(content);
    return data.tasks.map((t: { name: string }) => t.name);
  } catch {
    return [];
  }
}

// Helper to extract task statuses from JSON
function extractTaskStatuses(content: string): { id: string; name: string; completed: boolean }[] {
  try {
    const data = JSON.parse(content);
    return data.tasks.map((t: { id: string; name: string; completed: boolean }) => ({
      id: t.id,
      name: t.name,
      completed: t.completed,
    }));
  } catch {
    return [];
  }
}

describe('Workflow Runner - Real Workflow Tests', () => {
  beforeEach(() => {
    if (!existsSync(TEST_DIR)) mkdirSync(TEST_DIR, { recursive: true });
    logs = [];
    setConfig({ 
      tasksFile: TASKS_FILE, 
      workflowsDir: REAL_WORKFLOWS_DIR, 
      log: mockLog,
      // Mock loop command to return fixed items for testing
      runLoopCommand: () => ['file1.ts', 'file2.ts'],
    });
  });

  afterEach(() => {
    resetConfig();
    if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true, force: true });
  });

  // Test simple workflow without nested workflows first
  describe('Simple workflow: theplant.e2e-testing', () => {
    const WORKFLOW_NAME = 'theplant.e2e-testing';

    it('should flatten workflow into AI tasks', { timeout: 5000 }, () => {
      const tasks = flattenWorkflow(WORKFLOW_NAME);
      
      expect(tasks.length).toBeGreaterThan(0);
      
      // All tasks should be ai-task type
      for (const task of tasks) {
        expect(task.type).toBe('ai-task');
      }
    });

    it('should generate tasks file with matching task names', { timeout: 5000 }, () => {
      const expectedTasks = flattenWorkflow(WORKFLOW_NAME);
      const expectedTaskNames = expectedTasks.map(t => t.name);
      
      generateTasks(WORKFLOW_NAME);
      
      expect(existsSync(TASKS_FILE)).toBe(true);
      const content = readFileSync(TASKS_FILE, 'utf-8');
      const generatedTaskNames = extractTaskNamesFromJson(content);
      
      expect(generatedTaskNames).toEqual(expectedTaskNames);
    });

    it('should execute and complete tasks step by step', { timeout: 5000 }, () => {
      generateTasks(WORKFLOW_NAME);
      
      const tasks = flattenWorkflow(WORKFLOW_NAME);
      
      // Execute and complete each task
      for (let i = 0; i < tasks.length; i++) {
        logs = [];
        executeNextTask();
        
        const taskId = `T${String(i + 1).padStart(3, '0')}`;
        expect(logs.some(l => l.includes(taskId))).toBe(true);
        expect(logs.some(l => l.includes('AI TASK'))).toBe(true);
        
        // Complete the task
        completeTask(taskId);
      }
      
      // Verify all completed
      const content = readFileSync(TASKS_FILE, 'utf-8');
      const finalTasks = extractTaskStatuses(content);
      expect(finalTasks.every(t => t.completed)).toBe(true);
      
      // Should show all completed message
      logs = [];
      executeNextTask();
      expect(logs.some(l => l.includes('All tasks completed'))).toBe(true);
    });
  });

  // Test workflow with nested workflows
  describe('Nested workflow: theplant.e2e-testing', () => {
    const WORKFLOW_NAME = 'theplant.e2e-testing';

    it('should flatten nested workflows into AI tasks', { timeout: 5000 }, () => {
      const tasks = flattenWorkflow(WORKFLOW_NAME);
      
      expect(tasks.length).toBeGreaterThan(0);
      
      // All tasks should be ai-task type
      for (const task of tasks) {
        expect(task.type).toBe('ai-task');
      }
      
      // Should have tasks from multiple source workflows
      const sourceWorkflows = new Set(tasks.map(t => t.sourceWorkflow));
      expect(sourceWorkflows.size).toBeGreaterThan(1);
    });

    it('should generate tasks with correct source tracking', { timeout: 5000 }, () => {
      generateTasks(WORKFLOW_NAME);
      
      const content = readFileSync(TASKS_FILE, 'utf-8');
      
      // Verify nested workflow sources are included
      expect(content).toContain('theplant.e2e-testing');
      expect(content).toContain('theplant.openapi-first');
      expect(content).toContain('theplant.msw-mock-backend');
    });

    it('should have matching task names between flatten and generate', { timeout: 5000 }, () => {
      const expectedTasks = flattenWorkflow(WORKFLOW_NAME);
      const expectedTaskNames = expectedTasks.map(t => t.name);
      
      generateTasks(WORKFLOW_NAME);
      
      const content = readFileSync(TASKS_FILE, 'utf-8');
      const generatedTaskNames = extractTaskNamesFromJson(content);
      
      expect(generatedTaskNames).toEqual(expectedTaskNames);
    });

    it('should generate sequential task IDs', { timeout: 5000 }, () => {
      generateTasks(WORKFLOW_NAME);
      
      const content = readFileSync(TASKS_FILE, 'utf-8');
      const tasks = extractTaskStatuses(content);
      
      for (let i = 0; i < tasks.length; i++) {
        const expectedId = `T${String(i + 1).padStart(3, '0')}`;
        expect(tasks[i].id).toBe(expectedId);
      }
    });
  });

  // Test circular workflow detection (uses inline test workflows)
  describe('Circular workflow detection', () => {
    beforeEach(() => {
      // Create test workflows directory and write inline workflow files
      if (!existsSync(TEST_WORKFLOWS_DIR)) mkdirSync(TEST_WORKFLOWS_DIR, { recursive: true });
      writeFileSync(join(TEST_WORKFLOWS_DIR, 'test-circular-a.md'), CIRCULAR_WORKFLOW_A);
      writeFileSync(join(TEST_WORKFLOWS_DIR, 'test-circular-b.md'), CIRCULAR_WORKFLOW_B);
      
      // Update config to use test workflows directory
      setConfig({ 
        tasksFile: TASKS_FILE, 
        workflowsDir: TEST_WORKFLOWS_DIR, 
        log: mockLog,
        runLoopCommand: () => ['file1.ts', 'file2.ts'],
      });
    });

    it('should detect and skip circular workflow calls', { timeout: 5000 }, () => {
      // test-circular-a calls test-circular-b which calls test-circular-a
      const tasks = flattenWorkflow('test-circular-a');
      
      // Should have tasks from both workflows but not infinite loop
      expect(tasks.length).toBeGreaterThan(0);
      expect(tasks.length).toBeLessThan(10); // Should not explode
      
      // Should log warning about circular call
      expect(logs.some(l => l.includes('Circular workflow call detected'))).toBe(true);
      
      // Should have tasks from test-circular-a
      expect(tasks.some(t => t.name === 'Task A1')).toBe(true);
      expect(tasks.some(t => t.name === 'Task A2')).toBe(true);
      
      // Should have tasks from test-circular-b (first call)
      expect(tasks.some(t => t.name === 'Task B1')).toBe(true);
      expect(tasks.some(t => t.name === 'Task B2')).toBe(true);
    });

    it('should not include tasks from circular call', { timeout: 5000 }, () => {
      const tasks = flattenWorkflow('test-circular-a');
      
      // Count how many times each task appears
      const taskA1Count = tasks.filter(t => t.name === 'Task A1').length;
      const taskB1Count = tasks.filter(t => t.name === 'Task B1').length;
      
      // Each task should only appear once (no duplication from circular call)
      expect(taskA1Count).toBe(1);
      expect(taskB1Count).toBe(1);
    });
  });

  // Test task reading and display (prevents truncation when code blocks contain --- or ###)
  describe('Task reading and display', () => {
    it('should read task description completely including code blocks', { timeout: 5000 }, () => {
      // Generate tasks from theplant.system-exploration which has large code blocks
      generateTasks('theplant.system-exploration');
      
      // Execute first task to verify it displays correctly
      logs = [];
      executeNextTask();
      
      // The first task should be displayed
      expect(logs.some(l => l.includes('T001'))).toBe(true);
      expect(logs.some(l => l.includes('AI TASK'))).toBe(true);
    });

    it('should preserve full task content when reading from tasks file', { timeout: 5000 }, () => {
      // Generate tasks from theplant.system-exploration
      generateTasks('theplant.system-exploration');
      
      // Read the tasks file content directly
      const content = readFileSync(TASKS_FILE, 'utf-8');
      
      // Find Step 3 task which has the large markdown code block
      expect(content).toContain('Generate `.system_exploration.md`');
      expect(content).toContain('# System Exploration Document');
      expect(content).toContain('## Routes Overview');
      expect(content).toContain('## Data Entities');
      expect(content).toContain('## API Endpoints');
      expect(content).toContain('## localStorage Structure');
    });

    it('should complete task and show next task with full content', { timeout: 5000 }, () => {
      generateTasks('theplant.system-exploration');
      
      // Complete first task
      logs = [];
      completeTask('T001');
      
      // Should show next task (T002) with its full content
      expect(logs.some(l => l.includes('Next Task'))).toBe(true);
      expect(logs.some(l => l.includes('T002'))).toBe(true);
      
      // The next task description should be complete
      const nextTaskLog = logs.find(l => l.includes('List Route Files') || l.includes('find src/routes'));
      expect(nextTaskLog).toBeDefined();
    });

    it('should not truncate task description at --- inside code blocks', { timeout: 5000 }, () => {
      generateTasks('theplant.system-exploration');
      
      // Execute to get to task 3 (Generate .system_exploration.md)
      completeTask('T001');
      completeTask('T002');
      
      logs = [];
      executeNextTask();
      
      // Task 3 has a large markdown code block - verify it's not truncated
      const allLogs = logs.join('\n');
      expect(allLogs).toContain('# System Exploration Document');
      expect(allLogs).toContain('## Notes');
    });
  });

  // Test step content completeness (prevents truncation when ### appears inside code blocks)
  describe('Step content completeness', () => {
    it('should not truncate step content when ### appears inside code blocks', { timeout: 5000 }, () => {
      // theplant.system-exploration.md has Step 3 with a large markdown code block
      // that contains ### headers inside it (e.g., ### Entity: User, ### GET /api/v1/users)
      const tasks = flattenWorkflow('theplant.system-exploration');
      
      // Find Step 3: Generate `.system_exploration.md`
      const step3Task = tasks.find(t => t.name.includes('Generate `.system_exploration.md`'));
      expect(step3Task).toBeDefined();
      
      // The step content should include the full markdown template
      // These are markers that should be present if content is not truncated
      expect(step3Task!.description).toContain('# System Exploration Document');
      expect(step3Task!.description).toContain('## Routes Overview');
      expect(step3Task!.description).toContain('## Data Entities');
      expect(step3Task!.description).toContain('## API Endpoints');
      expect(step3Task!.description).toContain('## Forms and Input Fields');
      expect(step3Task!.description).toContain('## localStorage Structure');
      expect(step3Task!.description).toContain('## Test Data Requirements');
      expect(step3Task!.description).toContain('## Notes');
      
      // The closing ``` should be present (end of the markdown code block)
      // This proves the entire code block was captured
      const codeBlockCount = (step3Task!.description.match(/```/g) || []).length;
      expect(codeBlockCount).toBeGreaterThanOrEqual(2); // At least opening and closing
    });

    it('should only match step headers with "Step N:" prefix', { timeout: 5000 }, () => {
      const tasks = flattenWorkflow('theplant.system-exploration');
      
      // Should have exactly 4 steps (Step 1, 2, 3, 4)
      expect(tasks.length).toBe(4);
      
      // Verify step names
      expect(tasks[0].name).toContain('Check Existing Exploration Document');
      expect(tasks[1].name).toContain('List Route Files');
      expect(tasks[2].name).toContain('Generate `.system_exploration.md`');
      expect(tasks[3].name).toContain('Verify Document Completeness');
    });
  });

  // Test JSON storage format
  describe('JSON storage format', () => {
    it('should generate valid JSON file', { timeout: 5000 }, () => {
      generateTasks('theplant.system-exploration');
      
      const content = readFileSync(TASKS_FILE, 'utf-8');
      
      // Should be valid JSON
      expect(() => JSON.parse(content)).not.toThrow();
      
      const data = JSON.parse(content);
      expect(data.workflowName).toBe('theplant.system-exploration');
      expect(data.generatedAt).toBeDefined();
      expect(Array.isArray(data.tasks)).toBe(true);
      expect(data.tasks.length).toBeGreaterThan(0);
    });

    it('should store complete task data in JSON', { timeout: 5000 }, () => {
      generateTasks('theplant.system-exploration');
      
      const content = readFileSync(TASKS_FILE, 'utf-8');
      const data = JSON.parse(content);
      
      // Each task should have all required fields
      for (const task of data.tasks) {
        expect(task.id).toMatch(/^T\d{3}$/);
        expect(task.name).toBeDefined();
        expect(task.type).toBe('ai-task');
        expect(task.description).toBeDefined();
        expect(task.sourceWorkflow).toBeDefined();
        expect(typeof task.completed).toBe('boolean');
      }
    });

    it('should preserve full description with code blocks in JSON', { timeout: 5000 }, () => {
      generateTasks('theplant.system-exploration');
      
      const content = readFileSync(TASKS_FILE, 'utf-8');
      const data = JSON.parse(content);
      
      // Find Step 3 which has large markdown code block
      const step3 = data.tasks.find((t: { name: string }) => t.name.includes('Generate `.system_exploration.md`'));
      expect(step3).toBeDefined();
      
      // Description should contain full content
      expect(step3.description).toContain('# System Exploration Document');
      expect(step3.description).toContain('## Routes Overview');
      expect(step3.description).toContain('## Notes');
    });

    it('should update task status correctly in JSON', { timeout: 5000 }, () => {
      generateTasks('theplant.system-exploration');
      
      // Initially all tasks should be incomplete
      let content = readFileSync(TASKS_FILE, 'utf-8');
      let data = JSON.parse(content);
      expect(data.tasks.every((t: { completed: boolean }) => !t.completed)).toBe(true);
      
      // Complete first task
      completeTask('T001');
      
      // Read again and verify
      content = readFileSync(TASKS_FILE, 'utf-8');
      data = JSON.parse(content);
      
      expect(data.tasks[0].completed).toBe(true);
      expect(data.tasks[1].completed).toBe(false);
    });

    it('should handle multiple task completions correctly', { timeout: 5000 }, () => {
      generateTasks('theplant.system-exploration');
      
      // Complete first two tasks
      completeTask('T001');
      completeTask('T002');
      
      const content = readFileSync(TASKS_FILE, 'utf-8');
      const data = JSON.parse(content);
      
      expect(data.tasks[0].completed).toBe(true);
      expect(data.tasks[1].completed).toBe(true);
      expect(data.tasks[2].completed).toBe(false);
    });

    it('should not corrupt JSON when completing tasks', { timeout: 5000 }, () => {
      generateTasks('theplant.system-exploration');
      
      // Complete all tasks one by one
      const initialContent = readFileSync(TASKS_FILE, 'utf-8');
      const initialData = JSON.parse(initialContent);
      const taskCount = initialData.tasks.length;
      
      for (let i = 1; i <= taskCount; i++) {
        const taskId = `T${String(i).padStart(3, '0')}`;
        completeTask(taskId);
        
        // Verify JSON is still valid after each completion
        const content = readFileSync(TASKS_FILE, 'utf-8');
        expect(() => JSON.parse(content)).not.toThrow();
      }
      
      // Final verification
      const finalContent = readFileSync(TASKS_FILE, 'utf-8');
      const finalData = JSON.parse(finalContent);
      expect(finalData.tasks.every((t: { completed: boolean }) => t.completed)).toBe(true);
    });
  });

  // Test showing next task after completion
  describe('Show next task after completion', () => {
    it('should show next task content after completing current task', { timeout: 5000 }, () => {
      generateTasks('theplant.e2e-testing');
      
      // Complete first task
      logs = [];
      completeTask('T001');
      
      // Should show next task info
      expect(logs.some(l => l.includes('Next Task'))).toBe(true);
      expect(logs.some(l => l.includes('T002'))).toBe(true);
      expect(logs.some(l => l.includes('AI TASK'))).toBe(true);
      expect(logs.some(l => l.includes('--complete T002'))).toBe(true);
    });

    it('should show all completed message when last task is done', { timeout: 5000 }, () => {
      // Use test workflows directory for this test
      if (!existsSync(TEST_WORKFLOWS_DIR)) mkdirSync(TEST_WORKFLOWS_DIR, { recursive: true });
      writeFileSync(join(TEST_WORKFLOWS_DIR, 'test-circular-a.md'), CIRCULAR_WORKFLOW_A);
      writeFileSync(join(TEST_WORKFLOWS_DIR, 'test-circular-b.md'), CIRCULAR_WORKFLOW_B);
      
      setConfig({ 
        tasksFile: TASKS_FILE, 
        workflowsDir: TEST_WORKFLOWS_DIR, 
        log: mockLog,
        runLoopCommand: () => ['file1.ts', 'file2.ts'],
      });
      
      generateTasks('test-circular-a');
      
      const tasks = flattenWorkflow('test-circular-a');
      
      // Complete all tasks
      for (let i = 0; i < tasks.length; i++) {
        const taskId = `T${String(i + 1).padStart(3, '0')}`;
        completeTask(taskId);
      }
      
      // Last completion should show all completed
      expect(logs.some(l => l.includes('All tasks completed'))).toBe(true);
    });

    it('should show progress after completing task', { timeout: 5000 }, () => {
      generateTasks('theplant.e2e-testing');
      
      logs = [];
      completeTask('T001');
      
      // Should show progress
      expect(logs.some(l => l.includes('Progress'))).toBe(true);
    });
  });
});
