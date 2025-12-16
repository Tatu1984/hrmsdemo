'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, Folder, Plus, Target } from 'lucide-react';
import { formatDate, formatCurrency } from '@/lib/utils';
import { TaskDialog } from '@/components/forms/task-dialog';

interface Employee {
  id: string;
  name: string;
  employeeId?: string;
}

interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  dueDate: Date | null;
  employee: Employee | null;
  milestone?: string | null;
}

interface Project {
  id: string;
  projectId: string;
  name: string;
  projectType: string;
  status: string;
  totalBudget?: number | null;
  upfrontPayment?: number | null;
  milestones?: any;
  tasks: Task[];
}

interface ProjectTasksAccordionProps {
  project: Project;
  employees: Employee[];
}

export function ProjectTasksAccordion({ project, employees }: ProjectTasksAccordionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedMilestones, setExpandedMilestones] = useState<Set<string>>(new Set());

  // Get milestones from project
  const milestones = project.milestones?.milestones || [];

  // Group tasks by milestone
  const tasksByMilestone: Record<string, Task[]> = {};
  const unassignedTasks: Task[] = [];

  project.tasks.forEach(task => {
    if (task.milestone) {
      if (!tasksByMilestone[task.milestone]) {
        tasksByMilestone[task.milestone] = [];
      }
      tasksByMilestone[task.milestone].push(task);
    } else {
      unassignedTasks.push(task);
    }
  });

  const toggleMilestone = (milestoneId: string) => {
    const newExpanded = new Set(expandedMilestones);
    if (newExpanded.has(milestoneId)) {
      newExpanded.delete(milestoneId);
    } else {
      newExpanded.add(milestoneId);
    }
    setExpandedMilestones(newExpanded);
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: 'bg-gray-100 text-gray-700',
      IN_PROGRESS: 'bg-blue-100 text-blue-700',
      COMPLETED: 'bg-green-100 text-green-700',
      HOLD: 'bg-yellow-100 text-yellow-700',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      LOW: 'bg-gray-100 text-gray-600',
      MEDIUM: 'bg-blue-100 text-blue-600',
      HIGH: 'bg-orange-100 text-orange-600',
      URGENT: 'bg-red-100 text-red-600',
    };
    return colors[priority] || 'bg-gray-100 text-gray-600';
  };

  return (
    <Card>
      <CardHeader
        className="cursor-pointer hover:bg-gray-50"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isOpen ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
            <Folder className="w-5 h-5 text-blue-600" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">{project.name}</span>
                <Badge variant="outline" className="text-xs">{project.projectId}</Badge>
                <Badge className={getStatusColor(project.status)}>
                  {project.status}
                </Badge>
              </div>
              <div className="text-sm text-gray-500 mt-1">
                {project.projectType === 'MILESTONE' && milestones.length > 0 && (
                  <span>{milestones.length} Milestones</span>
                )}
                <span className="mx-2">•</span>
                <span>{project.tasks.length} Tasks</span>
                {project.totalBudget && (
                  <>
                    <span className="mx-2">•</span>
                    <span>Budget: {formatCurrency(project.totalBudget)}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <TaskDialog
              employees={employees}
              projects={[{ id: project.id, name: project.name }]}
              defaultProjectId={project.id}
              milestones={milestones}
            />
          </div>
        </div>
      </CardHeader>

      {isOpen && (
        <CardContent className="pt-0">
          {/* Milestone-based tasks */}
          {project.projectType === 'MILESTONE' && milestones.length > 0 && (
            <div className="space-y-3">
              {milestones.map((milestone: any, index: number) => {
                const milestoneTasks = tasksByMilestone[milestone.id] || [];
                const isExpanded = expandedMilestones.has(milestone.id);

                return (
                  <div key={`${project.id}-milestone-${milestone.id || index}`} className="border rounded-lg bg-gray-50">
                    <div
                      className="p-3 cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => toggleMilestone(milestone.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          <Target className="w-4 h-4 text-purple-600" />
                          <span className="font-medium">{milestone.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {milestoneTasks.length} tasks
                          </Badge>
                          {milestone.payment && (
                            <span className="text-xs text-gray-600">
                              Payment: {formatCurrency(milestone.payment)}
                            </span>
                          )}
                        </div>
                        <TaskDialog
                          employees={employees}
                          projects={[{ id: project.id, name: project.name }]}
                          defaultProjectId={project.id}
                          defaultMilestone={milestone.id}
                          milestones={milestones}
                          trigger={
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Plus className="w-4 h-4 mr-1" />
                              Add Task
                            </Button>
                          }
                        />
                      </div>
                      {milestone.successCriteria && (
                        <div className="text-xs text-gray-600 mt-1 ml-6">
                          {milestone.successCriteria}
                        </div>
                      )}
                    </div>

                    {isExpanded && (
                      <div className="px-3 pb-3">
                        {milestoneTasks.length === 0 ? (
                          <div className="text-sm text-gray-500 text-center py-4">
                            No tasks in this milestone yet
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {milestoneTasks.map((task) => (
                              <div key={task.id} className="bg-white p-3 rounded border">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="font-medium">{task.title}</div>
                                    <div className="text-xs text-gray-600 mt-1">{task.description}</div>
                                    <div className="flex items-center gap-2 mt-2">
                                      <Badge className={getStatusColor(task.status)} variant="outline">
                                        {task.status}
                                      </Badge>
                                      <Badge className={getPriorityColor(task.priority)} variant="outline">
                                        {task.priority}
                                      </Badge>
                                      {task.employee && (
                                        <span className="text-xs text-gray-600">
                                          Assigned to: {task.employee.name}
                                        </span>
                                      )}
                                      {task.dueDate && (
                                        <span className="text-xs text-gray-600">
                                          Due: {formatDate(task.dueDate)}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Unassigned tasks or all tasks for non-milestone projects */}
          {(unassignedTasks.length > 0 || project.projectType !== 'MILESTONE') && (
            <div className="mt-4">
              <div className="text-sm font-semibold mb-2 text-gray-600">
                {project.projectType === 'MILESTONE' ? 'Unassigned Tasks' : 'All Tasks'}
              </div>
              <div className="space-y-2">
                {(project.projectType === 'MILESTONE' ? unassignedTasks : project.tasks).map((task) => (
                  <div key={task.id} className="bg-gray-50 p-3 rounded border">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-medium">{task.title}</div>
                        <div className="text-xs text-gray-600 mt-1">{task.description}</div>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge className={getStatusColor(task.status)} variant="outline">
                            {task.status}
                          </Badge>
                          <Badge className={getPriorityColor(task.priority)} variant="outline">
                            {task.priority}
                          </Badge>
                          {task.employee && (
                            <span className="text-xs text-gray-600">
                              Assigned to: {task.employee.name}
                            </span>
                          )}
                          {task.dueDate && (
                            <span className="text-xs text-gray-600">
                              Due: {formatDate(task.dueDate)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {project.tasks.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No tasks in this project yet. Click "Add Task" to create one.
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
