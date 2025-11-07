import React from 'react';
import { Card } from '@/components/ui';
import { DocumentIcon } from '@heroicons/react/24/outline';

interface ProjectDocumentsProps {
  projectId: string;
}

const ProjectDocuments: React.FC<ProjectDocumentsProps> = ({ projectId }) => {
  return (
    <div className="space-y-6">
      <Card className="p-8 text-center">
        <DocumentIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">项目文档管理</h3>
        <p className="text-gray-600">此功能正在开发中，敬请期待</p>
      </Card>
    </div>
  );
};

export default ProjectDocuments;