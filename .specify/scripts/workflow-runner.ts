#!/usr/bin/env npx tsx
/**
 * Workflow Runner
 * 
 * Two-phase workflow execution:
 * 1. Generate: Parse workflow and flatten all steps (including nested workflows) into a tasks.md file
 * 2. Execute: Process tasks one by one, marking completed tasks with [X]
 * 
 * IMPORTANT FOR AI:
 * - NEVER directly modify .specify/memory/workflow-tasks.md manually
 * - Use --execute to run tasks and mark them complete
 * - The runner manages all task state in the tasks file itself
 * 
 * Usage:
 *   npx tsx .specify/scripts/workflow-runner.ts --generate <workflow-name>  # Generate tasks.md
 *   npx tsx .specify/scripts/workflow-runner.ts --execute                   # Execute next task
 *   npx tsx .specify/scripts/workflow-runner.ts --status                    # Show progress
 *   npx tsx .specify/scripts/workflow-runner.ts --reset                     # Clear tasks file
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync, unlinkSync, readdirSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';

// ============ Configuration ============

export interface WorkflowRunnerConfig {
  tasksFile: string;
  workflowsDir: string;
  log?: (...args: unknown[]) => void;
  runLoopCommand?: (command: string) => string[];  // Mock loop command execution for testing
}

const defaultConfig: WorkflowRunnerConfig = {
  tasksFile: '.workflow-tasks.json',
  workflowsDir: '.windsurf/workflows',
  log: console.log,
};

let config = { ...defaultConfig };

export function setConfig(newConfig: Partial<WorkflowRunnerConfig>): void {
  config = { ...defaultConfig, ...newConfig };
}

export function resetConfig(): void {
  config = { ...defaultConfig };
}

// ============ Types ============

export interface StepResult {
  success: boolean;
  output?: string;
  error?: string;
}

export interface ParsedStep {
  id: string;
  name: string;
  type: 'ai-task' | 'nested-workflow' | 'loop';
  aiPrompt?: string;
  workflow?: string;
  lineNumber: number;
  loopCommand?: string;
  loopItemVar?: string;
  sourceWorkflow: string;  // Which workflow this step came from
}

export interface FlattenedTask {
  id: string;              // T001, T002, etc.
  name: string;
  type: 'ai-task';         // All tasks are AI tasks now
  description: string;     // Full description for AI
  sourceWorkflow: string;
  sourceStep: string;
  completed: boolean;
  verifyCommand?: string;  // Optional verification command
}

// JSON storage format
export interface TasksFileData {
  workflowName: string;
  generatedAt: string;
  tasks: FlattenedTask[];
}

// ============ Markdown Parser ============

export function parseWorkflowMarkdown(workflowName: string): ParsedStep[] {
  const filePath = join(config.workflowsDir, `${workflowName}.md`);
  
  if (!existsSync(filePath)) {
    throw new Error(`Workflow file not found: ${filePath}`);
  }
  
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const steps: ParsedStep[] = [];
  
  // Helper to check if a line is a step header (### Step N: Name)
  // Must NOT be inside a code block
  const isStepHeader = (line: string): boolean => {
    return /^###\s+Step\s+\d+:\s+.+/.test(line);
  };
  
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    
    // Look for step headers: ### Step N: Name (must have "Step N:" prefix)
    const stepMatch = line.match(/^###\s+Step\s+\d+:\s+(.+?)(?:\s+\[.*\])*\s*$/);
    
    if (stepMatch) {
      const stepName = stepMatch[1].trim();
      const stepLineNumber = i + 1;
      const stepId = stepName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      
      let j = i + 1;
      let stepType: ParsedStep['type'] = 'ai-task';  // Default: all steps are AI tasks
      let workflow: string | undefined;
      let contentLines: string[] = [];
      let loopCommand: string | undefined;
      let loopItemVar: string | undefined;
      // Track code block nesting depth to handle nested code blocks in markdown examples
      let codeBlockDepth = 0;
      
      while (j < lines.length) {
        const nextLine = lines[j];
        
        // Track code block state to avoid matching ### inside code blocks
        // Handle nested code blocks by tracking depth
        if (nextLine.match(/^```/)) {
          if (nextLine.trim() === '```') {
            // Bare ``` - could be start or end
            if (codeBlockDepth > 0) {
              codeBlockDepth--;
            } else {
              codeBlockDepth++;
            }
          } else {
            // ```language - always a start
            codeBlockDepth++;
          }
        }
        
        // Only break on step headers when NOT inside any code block
        if (codeBlockDepth === 0 && isStepHeader(nextLine)) break;
        
        // Only two special markers: workflow and loop
        if (nextLine.match(/<!-- runner:workflow:(.+) -->/)) {
          stepType = 'nested-workflow';
          const match = nextLine.match(/<!-- runner:workflow:(.+) -->/);
          if (match) {
            workflow = match[1].trim();
          }
        } else if (nextLine.match(/<!-- runner:loop:(.+?) -->/)) {
          stepType = 'loop';
          const match = nextLine.match(/<!-- runner:loop:(.+?) -->/);
          if (match) {
            loopItemVar = match[1].trim();
          }
          // Read the bash command for loop
          j++;
          while (j < lines.length && !lines[j].startsWith('```bash')) j++;
          if (j < lines.length) {
            j++;
            const cmdLines: string[] = [];
            while (j < lines.length && !lines[j].startsWith('```')) {
              cmdLines.push(lines[j]);
              j++;
            }
            loopCommand = cmdLines.join('\n').trim();
          }
        } else if (!nextLine.startsWith('<!--')) {
          // Collect all non-marker content as AI task description
          contentLines.push(nextLine);
        }
        
        j++;
      }
      
      // Always add the step (default is ai-task)
      steps.push({
        id: stepId,
        name: stepName,
        type: stepType,
        workflow,
        aiPrompt: contentLines.join('\n').trim() || undefined,
        lineNumber: stepLineNumber,
        loopCommand,
        loopItemVar,
        sourceWorkflow: workflowName,
      });
      
      i = j;
    } else {
      i++;
    }
  }
  
  return steps;
}

// ============ Task Flattening ============

/**
 * Flatten a workflow into a list of executable tasks
 * This recursively expands nested workflows and loops
 * @param workflowName - The workflow to flatten
 * @param prefix - Path prefix for nested workflows
 * @param visitedWorkflows - Set of already visited workflows to detect circular calls
 */
export function flattenWorkflow(
  workflowName: string, 
  prefix: string = '', 
  visitedWorkflows: Set<string> = new Set()
): FlattenedTask[] {
  // Check for circular workflow calls
  if (visitedWorkflows.has(workflowName)) {
    config.log?.(`   ⚠️ Circular workflow call detected: ${workflowName} (skipping to prevent infinite loop)`);
    return [];
  }
  
  // Add current workflow to visited set
  visitedWorkflows.add(workflowName);
  
  const steps = parseWorkflowMarkdown(workflowName);
  const tasks: FlattenedTask[] = [];
  
  for (const step of steps) {
    const taskPrefix = prefix ? `${prefix} > ${workflowName}` : workflowName;
    
    switch (step.type) {
      case 'nested-workflow':
        // Recursively flatten nested workflow (pass visited set to detect circular calls)
        const nestedTasks = flattenWorkflow(step.workflow!, taskPrefix, new Set(visitedWorkflows));
        tasks.push(...nestedTasks);
        break;
        
      case 'loop':
        // Execute loop command internally to get items and expand into individual AI tasks
        if (step.loopCommand) {
          try {
            let items: string[];
            if (config.runLoopCommand) {
              // Use mock for testing
              items = config.runLoopCommand(step.loopCommand);
            } else {
              const output = execSync(step.loopCommand, { encoding: 'utf-8', stdio: 'pipe', shell: '/bin/bash' });
              items = output.trim().split('\n').filter(item => item.trim());
            }
            
            if (items.length === 0) {
              config.log?.(`   ⚠️ Loop "${step.name}" returned no items`);
            } else {
              config.log?.(`   📂 Loop "${step.name}" expanded to ${items.length} items`);
              
              for (const item of items) {
                // Replace $FILE or loop variable in the prompt
                const varName = step.loopItemVar || 'FILE';
                const expandedPrompt = (step.aiPrompt || '').replace(new RegExp(`\\$${varName}`, 'g'), item);
                
                tasks.push({
                  id: '',
                  name: `${step.name}: ${item}`,
                  type: 'ai-task',
                  description: expandedPrompt || `Process: ${item}`,
                  sourceWorkflow: taskPrefix,
                  sourceStep: step.id,
                  completed: false,
                });
              }
            }
          } catch (e: any) {
            config.log?.(`   ⚠️ Loop command failed: ${e.message}`);
            // Create a single task to handle the loop manually
            tasks.push({
              id: '',
              name: step.name,
              type: 'ai-task',
              description: `**Loop Task (command failed)**: ${step.name}\n\nLoop command: \`${step.loopCommand}\`\nError: ${e.message}\n\n${step.aiPrompt || ''}`,
              sourceWorkflow: taskPrefix,
              sourceStep: step.id,
              completed: false,
            });
          }
        }
        break;
        
      case 'ai-task':
        tasks.push({
          id: '',
          name: step.name,
          type: 'ai-task',
          description: step.aiPrompt || step.name,
          sourceWorkflow: taskPrefix,
          sourceStep: step.id,
          completed: false,
        });
        break;
    }
  }
  
  // Assign sequential IDs
  tasks.forEach((task, index) => {
    task.id = `T${String(index + 1).padStart(3, '0')}`;
  });
  
  return tasks;
}

// ============ Tasks File Management (JSON) ============

function saveTasksFile(data: TasksFileData): void {
  const dir = dirname(config.tasksFile);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(config.tasksFile, JSON.stringify(data, null, 2));
}

function parseTasksFile(): TasksFileData | null {
  if (!existsSync(config.tasksFile)) {
    return null;
  }
  
  try {
    const content = readFileSync(config.tasksFile, 'utf-8');
    const data = JSON.parse(content) as TasksFileData;
    return data;
  } catch (e) {
    config.log?.(`❌ Error parsing tasks file: ${e}`);
    return null;
  }
}

function updateTaskStatus(taskId: string, completed: boolean): void {
  const data = parseTasksFile();
  
  if (!data) {
    config.log?.('❌ No tasks file found. Run --generate first.');
    return;
  }
  
  const task = data.tasks.find(t => t.id === taskId);
  if (task) {
    task.completed = completed;
    saveTasksFile(data);
  }
}

// ============ Task Execution ============

function executeTask(task: FlattenedTask): StepResult {
  config.log?.(`\n📌 Executing: ${task.id} - ${task.name}`);
  config.log?.(`   Source: ${task.sourceWorkflow}`);
  
  // All tasks are AI tasks - show description and wait for completion
  config.log?.(`\n🤖 AI TASK:`);
  config.log?.(`\n${task.description}`);
  config.log?.(`\n📋 After completing this task, run:`);
  config.log?.(`   npx tsx .specify/scripts/workflow-runner.ts --complete ${task.id}`);
  
  return { success: false, error: 'AI task required' };
}

// ============ Commands ============

export function generateTasks(workflowName: string): void {
  config.log?.(`\n🔄 Generating tasks for workflow: ${workflowName}`);
  
  try {
    const tasks = flattenWorkflow(workflowName);
    
    if (tasks.length === 0) {
      config.log?.(`⚠️  No executable tasks found in ${workflowName}`);
      return;
    }
    
    const data: TasksFileData = {
      workflowName,
      generatedAt: new Date().toISOString(),
      tasks,
    };
    
    saveTasksFile(data);
    
    config.log?.(`\n✅ Generated ${tasks.length} tasks`);
    config.log?.(`\n📋 Task Summary:`);
    
    const aiCount = tasks.filter(t => t.type === 'ai-task').length;
    
    config.log?.(`   - AI tasks: ${aiCount}`);
    
    config.log?.(`\n🚀 To start execution, run:`);
    config.log?.(`   npx tsx .specify/scripts/workflow-runner.ts --execute`);
    
  } catch (e: any) {
    config.log?.(`❌ Error: ${e.message}`);
  }
}

export function executeNextTask(): void {
  const parsed = parseTasksFile();
  
  if (!parsed) {
    config.log?.('❌ No tasks file found. Run --generate <workflow-name> first.');
    return;
  }
  
  const { workflowName, tasks } = parsed;
  const nextTask = tasks.find(t => !t.completed);
  
  if (!nextTask) {
    config.log?.(`\n🎉 All tasks completed for workflow: ${workflowName}`);
    config.log?.('🗑️  Tasks file cleaned up');
    unlinkSync(config.tasksFile);
    return;
  }
  
  const completedCount = tasks.filter(t => t.completed).length;
  config.log?.(`\n📊 Progress: ${completedCount}/${tasks.length} tasks completed`);
  
  const result = executeTask(nextTask);
  
  if (result.success) {
    updateTaskStatus(nextTask.id, true);
    config.log?.(`\n✅ Task ${nextTask.id} completed`);
    
    // Check if there are more tasks
    const remaining = tasks.filter(t => !t.completed && t.id !== nextTask.id).length;
    if (remaining > 0) {
      config.log?.(`\n🔄 ${remaining} tasks remaining. Run again to continue:`);
      config.log?.(`   npx tsx .specify/scripts/workflow-runner.ts --execute`);
    } else {
      config.log?.(`\n🎉 All tasks completed!`);
    }
  }
}

export function completeTask(taskId: string): void {
  const parsed = parseTasksFile();
  
  if (!parsed) {
    config.log?.('❌ No tasks file found.');
    return;
  }
  
  const task = parsed.tasks.find(t => t.id === taskId);
  
  if (!task) {
    config.log?.(`❌ Task ${taskId} not found.`);
    config.log?.(`   Available tasks: ${parsed.tasks.map(t => t.id).join(', ')}`);
    return;
  }
  
  if (task.completed) {
    config.log?.(`✅ Task ${taskId} is already completed.`);
    return;
  }
  
  // If task has verify command, run it
  if (task.verifyCommand) {
    if (!runVerification(task.verifyCommand)) {
      config.log?.(`❌ Verification failed for task ${taskId}.`);
      config.log?.(`   Verify command: ${task.verifyCommand}`);
      return;
    }
  }
  
  updateTaskStatus(taskId, true);
  config.log?.(`✅ Task ${taskId} marked as completed.`);
  
  // Find and show next task automatically for faster AI interaction
  const currentIndex = parsed.tasks.findIndex(t => t.id === taskId);
  const nextTask = parsed.tasks.slice(currentIndex + 1).find(t => !t.completed);
  
  if (nextTask) {
    const completedCount = parsed.tasks.filter(t => t.completed).length + 1;
    const totalCount = parsed.tasks.length;
    
    config.log?.(`\n📊 Progress: ${completedCount}/${totalCount} tasks completed`);
    config.log?.(`\n${'='.repeat(60)}`);
    config.log?.(`📌 Executing Next Task: ${nextTask.id} - ${nextTask.name}`);
    config.log?.(`   Source: ${nextTask.sourceWorkflow}`);
    config.log?.(`${'='.repeat(60)}`);
    config.log?.(`\n🤖 AI TASK:\n`);
    config.log?.(nextTask.description);
    config.log?.(`\n${'='.repeat(60)}`);
    config.log?.(`📋 After completing this task, run:`);
    config.log?.(`   npx tsx .specify/scripts/workflow-runner.ts --complete ${nextTask.id}`);
  } else {
    config.log?.(`\n🎉 All tasks completed!`);
  }
}

export function showStatus(): void {
  const parsed = parseTasksFile();
  
  if (!parsed) {
    config.log?.('No tasks file found. Run --generate <workflow-name> first.');
    return;
  }
  
  const { workflowName, tasks } = parsed;
  const completedCount = tasks.filter(t => t.completed).length;
  
  config.log?.(`\n📊 Workflow Status: ${workflowName}`);
  config.log?.(`   Total: ${tasks.length} tasks`);
  config.log?.(`   Completed: ${completedCount}`);
  config.log?.(`   Remaining: ${tasks.length - completedCount}`);
  config.log?.(`\n   Tasks:`);
  
  for (const task of tasks) {
    const status = task.completed ? '✅' : '⬚';
    const typeLabel = task.type === 'shell' ? '[SHELL]' : task.type === 'file-check' ? '[FILE]' : '[AI]';
    config.log?.(`   ${status} ${task.id} ${typeLabel} ${task.name}`);
  }
}

export function resetTasks(): void {
  if (existsSync(config.tasksFile)) {
    unlinkSync(config.tasksFile);
    config.log?.('✅ Tasks file reset');
  } else {
    config.log?.('No tasks file to reset.');
  }
}

export function listWorkflows(): void {
  const files = readdirSync(config.workflowsDir).filter((f: string) => f.endsWith('.md'));
  
  config.log?.(`\nAvailable workflows in ${config.workflowsDir}/:\n`);
  
  for (const file of files) {
    const name = file.replace('.md', '');
    try {
      const steps = parseWorkflowMarkdown(name);
      const stepCount = steps.length;
      config.log?.(`  ${name} (${stepCount} steps)`);
    } catch {
      config.log?.(`  ${name} (parse error)`);
    }
  }
}

/**
 * Run a workflow - checks if tasks exist and prompts AI to confirm session state
 */
export function runWorkflow(workflowName: string): void {
  const parsed = parseTasksFile();
  
  if (parsed && parsed.workflowName === workflowName) {
    // Tasks file exists for this workflow
    const completedCount = parsed.tasks.filter(t => t.completed).length;
    const totalCount = parsed.tasks.length;
    
    config.log?.(`\n📋 Found existing tasks for workflow: ${workflowName}`);
    config.log?.(`   Progress: ${completedCount}/${totalCount} tasks completed`);
    config.log?.(`\n⚠️  AI SESSION CHECK REQUIRED:`);
    config.log?.(`   Have you been executing this workflow in the CURRENT session?`);
    config.log?.(``);
    config.log?.(`   If YES (same session, continuing work):`); 
    config.log?.(`     → Run: npx tsx .specify/scripts/workflow-runner.ts --execute`);
    config.log?.(``);
    config.log?.(`   If NO (new session, starting fresh):`); 
    config.log?.(`     → Run: npx tsx .specify/scripts/workflow-runner.ts --generate ${workflowName}`);
    config.log?.(`     This will regenerate the task list from scratch.`);
    return;
  }
  
  if (parsed && parsed.workflowName !== workflowName) {
    // Different workflow in progress
    config.log?.(`\n⚠️  A different workflow is in progress: ${parsed.workflowName}`);
    config.log?.(`   To switch to ${workflowName}, first reset:`); 
    config.log?.(`     → Run: npx tsx .specify/scripts/workflow-runner.ts --reset`);
    config.log?.(`     → Then: npx tsx .specify/scripts/workflow-runner.ts ${workflowName}`);
    return;
  }
  
  // No tasks file - generate new one
  config.log?.(`\n🆕 Starting new workflow: ${workflowName}`);
  generateTasks(workflowName);
}

// ============ Main ============

// Only run main logic when executed directly (not when imported as module)
const isMainModule = import.meta.url === `file://${process.argv[1]}` || 
                     process.argv[1]?.endsWith('workflow-runner.ts');

if (isMainModule) {
  const args = process.argv.slice(2);

  if (args.includes('--generate')) {
  const genIndex = args.indexOf('--generate');
  const workflowName = args[genIndex + 1];
  if (!workflowName) {
    console.log('❌ Please provide a workflow name.');
    console.log('   Usage: npx tsx .specify/scripts/workflow-runner.ts --generate <workflow-name>');
  } else {
    generateTasks(workflowName);
  }
} else if (args.includes('--execute')) {
  executeNextTask();
} else if (args.includes('--complete')) {
  const completeIndex = args.indexOf('--complete');
  const taskId = args[completeIndex + 1];
  if (!taskId) {
    console.log('❌ Please provide a task ID.');
    console.log('   Usage: npx tsx .specify/scripts/workflow-runner.ts --complete <task-id>');
  } else {
    completeTask(taskId);
  }
} else if (args.includes('--status')) {
  showStatus();
} else if (args.includes('--reset')) {
  resetTasks();
} else if (args.includes('--list')) {
  listWorkflows();
} else if (args.length > 0 && !args[0].startsWith('--')) {
  // Direct workflow name provided
  const workflowName = args[0];
  runWorkflow(workflowName);
} else {
  console.log(`
Workflow Runner
===============

Two-phase workflow execution:
1. Generate: Flatten workflow into tasks.md
2. Execute: Process tasks one by one

Usage:
  npx tsx .specify/scripts/workflow-runner.ts <workflow-name>     # Start/resume workflow
  npx tsx .specify/scripts/workflow-runner.ts --generate <name>   # Force regenerate tasks
  npx tsx .specify/scripts/workflow-runner.ts --execute           # Execute next task
  npx tsx .specify/scripts/workflow-runner.ts --complete <id>     # Mark AI task done
  npx tsx .specify/scripts/workflow-runner.ts --status            # Show progress
  npx tsx .specify/scripts/workflow-runner.ts --reset             # Clear tasks
  npx tsx .specify/scripts/workflow-runner.ts --list              # List workflows

IMPORTANT FOR AI:
  - NEVER directly modify .workflow-tasks.md
  - Use --complete <task-id> to mark AI tasks as done
  - The runner manages all task state automatically
  - When starting a workflow, AI should confirm if it was already executed in this session

Workflow:
  1. Run --generate <workflow> to create tasks.md
  2. Run --execute to process next task
  3. For AI tasks, complete the work then run --complete <task-id>
  4. Repeat --execute until all tasks done
`);
  listWorkflows();
  }
}
