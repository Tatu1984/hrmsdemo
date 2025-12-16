'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

interface AddConnectionDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddConnectionDialog({ open, onClose, onSuccess }: AddConnectionDialogProps) {
  const [step, setStep] = useState<'platform' | 'config'>('platform');
  const [platform, setPlatform] = useState<'AZURE_DEVOPS' | 'ASANA' | 'CONFLUENCE' | null>(null);
  const [testing, setTesting] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<'success' | 'failed' | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    accessToken: '',
    organizationUrl: '',
    organizationName: '',
    workspaceId: '',
    confluenceSpaceKey: '',
    confluenceEmail: '',
  });

  const handleReset = () => {
    setStep('platform');
    setPlatform(null);
    setFormData({
      name: '',
      accessToken: '',
      organizationUrl: '',
      organizationName: '',
      workspaceId: '',
      confluenceSpaceKey: '',
      confluenceEmail: '',
    });
    setError(null);
    setTestResult(null);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handlePlatformSelect = (selectedPlatform: 'AZURE_DEVOPS' | 'ASANA' | 'CONFLUENCE') => {
    setPlatform(selectedPlatform);
    const platformName = selectedPlatform === 'AZURE_DEVOPS' ? 'My Azure DevOps' :
                        selectedPlatform === 'ASANA' ? 'My Asana' : 'My Confluence';
    setFormData({
      ...formData,
      name: platformName,
    });
    setStep('config');
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setError(null);
    setTestResult(null);

    try {
      const response = await fetch('/api/integrations/connections/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform,
          ...formData,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setTestResult('success');
      } else {
        setTestResult('failed');
        setError(result.error || 'Connection test failed');
      }
    } catch (err) {
      setTestResult('failed');
      setError('Failed to test connection');
    } finally {
      setTesting(false);
    }
  };

  const handleCreate = async () => {
    setCreating(true);
    setError(null);

    try {
      const response = await fetch('/api/integrations/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform,
          authType: 'PAT',
          ...formData,
        }),
      });

      if (response.ok) {
        onSuccess();
        handleClose();
      } else {
        const result = await response.json();
        setError(result.error || 'Failed to create connection');
      }
    } catch (err) {
      setError('Failed to create connection');
    } finally {
      setCreating(false);
    }
  };

  const renderPlatformSelection = () => (
    <div className="space-y-4">
      <DialogDescription>
        Choose which platform you want to connect to your HRMS system
      </DialogDescription>

      <div className="grid grid-cols-2 gap-4 mt-6">
        {/* Azure DevOps */}
        <button
          onClick={() => handlePlatformSelect('AZURE_DEVOPS')}
          className="p-6 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all group"
        >
          <div className="w-16 h-16 bg-blue-600 rounded-lg mx-auto mb-4 flex items-center justify-center text-white font-bold text-2xl group-hover:scale-110 transition-transform">
            AZ
          </div>
          <h3 className="font-semibold text-lg">Azure DevOps</h3>
          <p className="text-sm text-gray-500 mt-2">
            Sync work items, commits, and PRs
          </p>
        </button>

        {/* Asana */}
        <button
          onClick={() => handlePlatformSelect('ASANA')}
          className="p-6 border-2 border-gray-200 rounded-lg hover:border-pink-500 hover:bg-pink-50 transition-all group"
        >
          <div className="w-16 h-16 bg-pink-500 rounded-lg mx-auto mb-4 flex items-center justify-center text-white font-bold text-2xl group-hover:scale-110 transition-transform">
            AS
          </div>
          <h3 className="font-semibold text-lg">Asana</h3>
          <p className="text-sm text-gray-500 mt-2">
            Sync tasks and projects
          </p>
        </button>

        {/* Confluence */}
        <button
          onClick={() => handlePlatformSelect('CONFLUENCE')}
          className="p-6 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all group"
        >
          <div className="w-16 h-16 bg-blue-700 rounded-lg mx-auto mb-4 flex items-center justify-center text-white font-bold text-2xl group-hover:scale-110 transition-transform">
            CF
          </div>
          <h3 className="font-semibold text-lg">Confluence</h3>
          <p className="text-sm text-gray-500 mt-2">
            Sync pages and documentation
          </p>
        </button>
      </div>
    </div>
  );

  const renderAzureDevOpsConfig = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-3 pb-4 border-b">
        <div className="w-12 h-12 bg-blue-600 rounded flex items-center justify-center text-white font-bold">
          AZ
        </div>
        <div>
          <h3 className="font-semibold">Azure DevOps Configuration</h3>
          <p className="text-sm text-gray-500">Connect your Azure DevOps organization</p>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Connection Name</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g., My Azure DevOps"
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Organization URL *</label>
        <input
          type="url"
          value={formData.organizationUrl}
          onChange={(e) => setFormData({ ...formData, organizationUrl: e.target.value })}
          placeholder="https://dev.azure.com/your-organization"
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <p className="text-xs text-gray-500 mt-1">
          Your Azure DevOps organization URL
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Personal Access Token (PAT) *</label>
        <input
          type="password"
          value={formData.accessToken}
          onChange={(e) => setFormData({ ...formData, accessToken: e.target.value })}
          placeholder="Enter your PAT"
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
        />
        <p className="text-xs text-gray-500 mt-1">
          Create a PAT with <strong>Work Items (Read)</strong> and <strong>Code (Read)</strong> permissions
        </p>
      </div>

      {renderTestAndCreate()}
    </div>
  );

  const renderAsanaConfig = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-3 pb-4 border-b">
        <div className="w-12 h-12 bg-pink-500 rounded flex items-center justify-center text-white font-bold">
          AS
        </div>
        <div>
          <h3 className="font-semibold">Asana Configuration</h3>
          <p className="text-sm text-gray-500">Connect your Asana workspace</p>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Connection Name</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g., My Asana"
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Personal Access Token *</label>
        <input
          type="password"
          value={formData.accessToken}
          onChange={(e) => setFormData({ ...formData, accessToken: e.target.value })}
          placeholder="Enter your Asana PAT"
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent font-mono text-sm"
        />
        <p className="text-xs text-gray-500 mt-1">
          Get your PAT from Asana Settings → Apps → Personal Access Tokens
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Workspace ID (Optional)</label>
        <input
          type="text"
          value={formData.workspaceId}
          onChange={(e) => setFormData({ ...formData, workspaceId: e.target.value })}
          placeholder="Will auto-detect if left empty"
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
        />
      </div>

      {renderTestAndCreate()}
    </div>
  );

  const renderConfluenceConfig = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-3 pb-4 border-b">
        <div className="w-12 h-12 bg-blue-700 rounded flex items-center justify-center text-white font-bold">
          CF
        </div>
        <div>
          <h3 className="font-semibold">Confluence Configuration</h3>
          <p className="text-sm text-gray-500">Connect your Confluence workspace</p>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Connection Name</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g., My Confluence"
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Organization URL *</label>
        <input
          type="url"
          value={formData.organizationUrl}
          onChange={(e) => setFormData({ ...formData, organizationUrl: e.target.value })}
          onBlur={(e) => {
            const url = e.target.value.trim();
            if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
              setFormData({ ...formData, organizationUrl: `https://${url}` });
            }
          }}
          placeholder="https://your-domain.atlassian.net"
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <p className="text-xs text-gray-500 mt-1">
          Your Confluence Cloud URL (https:// will be added automatically)
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Email *</label>
        <input
          type="email"
          value={formData.confluenceEmail}
          onChange={(e) => setFormData({ ...formData, confluenceEmail: e.target.value })}
          placeholder="your-email@company.com"
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <p className="text-xs text-gray-500 mt-1">
          Your Atlassian account email
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">API Token *</label>
        <input
          type="password"
          value={formData.accessToken}
          onChange={(e) => setFormData({ ...formData, accessToken: e.target.value })}
          placeholder="Enter your API Token"
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
        />
        <p className="text-xs text-gray-500 mt-1">
          Get your API token from Atlassian Account Settings → Security → API tokens
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Space Key (Optional)</label>
        <input
          type="text"
          value={formData.confluenceSpaceKey}
          onChange={(e) => setFormData({ ...formData, confluenceSpaceKey: e.target.value })}
          placeholder="Will sync all spaces if left empty"
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {renderTestAndCreate()}
    </div>
  );

  const renderTestAndCreate = () => (
    <div className="space-y-3 pt-4">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {testResult === 'success' && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-sm text-green-700">
          <CheckCircle2 className="w-4 h-4" />
          <span>Connection test successful! You can now create the connection.</span>
        </div>
      )}

      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={handleClose}
          className="flex-1"
        >
          Cancel
        </Button>

        <Button
          onClick={testResult === 'success' ? handleCreate : handleTestConnection}
          disabled={!formData.accessToken || testing || creating}
          className="flex-1"
        >
          {testing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {creating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {testResult === 'success' ? 'Create Connection' : 'Test Connection'}
        </Button>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {step === 'platform' ? 'Add Integration' : `Configure ${platform === 'AZURE_DEVOPS' ? 'Azure DevOps' : platform === 'ASANA' ? 'Asana' : 'Confluence'}`}
          </DialogTitle>
        </DialogHeader>

        {step === 'platform' && renderPlatformSelection()}
        {step === 'config' && platform === 'AZURE_DEVOPS' && renderAzureDevOpsConfig()}
        {step === 'config' && platform === 'ASANA' && renderAsanaConfig()}
        {step === 'config' && platform === 'CONFLUENCE' && renderConfluenceConfig()}
      </DialogContent>
    </Dialog>
  );
}
