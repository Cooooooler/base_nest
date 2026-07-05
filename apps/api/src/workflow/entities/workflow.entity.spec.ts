import { Workflow } from './workflow.entity';

describe('Workflow', () => {
  it('should create a workflow instance', () => {
    const wf = new Workflow();
    wf.name = 'Test';
    wf.graph = { nodes: [], edges: [] };
    wf.userId = 'user-1';
    expect(wf).toBeDefined();
    expect(wf.name).toBe('Test');
  });
});
