'use client';

import { useState } from 'react';
import { 
  Code, 
  Users, 
  Clock, 
  Star, 
  MoreVertical, 
  Play, 
  Pause, 
  Copy, 
  Trash2,
  Edit,
  Share2,
  Eye,
  GitBranch,
  Zap,
  CheckCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator 
} from '@/components/ui/dropdown-menu';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface Project {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'paused' | 'completed' | 'archived';
  framework: string;
  language: string;
  lastModified: Date;
  createdAt: Date;
  collaborators: Array<{
    id: string;
    name: string;
    avatar?: string;
  }>;
  progress: number;
  stars: number;
  views: number;
  isPublic: boolean;
  tags: string[];
  aiFeatures: {
    codeGeneration: boolean;
    autoRefactoring: boolean;
    smartSuggestions: boolean;
  };
}

interface ProjectCardProps {
  project: Project;
  onEdit?: (project: Project) => void;
  onDelete?: (projectId: string) => void;
  onDuplicate?: (project: Project) => void;
  onShare?: (project: Project) => void;
  onToggleStatus?: (projectId: string, status: string) => void;
  onView?: (project: Project) => void;
}

export default function ProjectCard({ 
  project, 
  onEdit, 
  onDelete, 
  onDuplicate, 
  onShare, 
  onToggleStatus,
  onView 
}: ProjectCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isStatusChanging, setIsStatusChanging] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500';
      case 'paused':
        return 'bg-yellow-500';
      case 'completed':
        return 'bg-blue-500';
      case 'archived':
        return 'bg-gray-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return 'Active';
      case 'paused':
        return 'Paused';
      case 'completed':
        return 'Completed';
      case 'archived':
        return 'Archived';
      default:
        return 'Unknown';
    }
  };

  const getFrameworkIcon = (framework: string) => {
    switch (framework.toLowerCase()) {
      case 'react':
        return '⚛️';
      case 'vue':
        return '🟢';
      case 'angular':
        return '🔴';
      case 'next':
        return '▲';
      case 'nuxt':
        return '🟢';
      default:
        return '📦';
    }
  };

  const handleStatusToggle = async () => {
    if (!onToggleStatus) return;
    
    setIsStatusChanging(true);
    try {
      const newStatus = project.status === 'active' ? 'paused' : 'active';
      await onToggleStatus(project.id, newStatus);
    } catch (error) {
      console.error('Failed to toggle status:', error);
    } finally {
      setIsStatusChanging(false);
    }
  };

  const formatLastModified = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return `${days} day${days > 1 ? 's' : ''} ago`;
    } else if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
      return 'Just now';
    }
  };

  return (
    <Card 
      className={`transition-all duration-200 hover:shadow-lg cursor-pointer ${
        isHovered ? 'transform scale-[1.02]' : ''
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onView?.(project)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-lg">{getFrameworkIcon(project.framework)}</span>
              <CardTitle className="text-lg font-semibold line-clamp-1">
                {project.name}
              </CardTitle>
              <div className={`w-2 h-2 rounded-full ${getStatusColor(project.status)}`} />
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
              {project.description}
            </p>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 w-8 p-0"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onView?.(project); }}>
                <Eye className="h-4 w-4 mr-2" />
                View Project
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit?.(project); }}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDuplicate?.(project); }}>
                <Copy className="h-4 w-4 mr-2" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onShare?.(project); }}>
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={(e) => { e.stopPropagation(); handleStatusToggle(); }}
                disabled={isStatusChanging}
              >
                {project.status === 'active' ? (
                  <Pause className="h-4 w-4 mr-2" />
                ) : (
                  <Play className="h-4 w-4 mr-2" />
                )}
                {project.status === 'active' ? 'Pause' : 'Resume'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={(e) => { e.stopPropagation(); onDelete?.(project.id); }}
                className="text-red-600"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        {/* Tags */}
        <div className="flex flex-wrap gap-1 mt-2">
          {project.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
          {project.tags.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{project.tags.length - 3}
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {/* AI Features */}
        <div className="flex items-center space-x-2 mb-3">
          <Zap className="h-4 w-4 text-indigo-500" />
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">AI Features:</span>
          <div className="flex items-center space-x-1">
            {project.aiFeatures.codeGeneration && (
              <Badge variant="outline" className="text-xs">CodeGen</Badge>
            )}
            {project.aiFeatures.autoRefactoring && (
              <Badge variant="outline" className="text-xs">Refactor</Badge>
            )}
            {project.aiFeatures.smartSuggestions && (
              <Badge variant="outline" className="text-xs">Smart</Badge>
            )}
          </div>
        </div>
        
        {/* Progress */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
              Progress
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {project.progress}%
            </span>
          </div>
          <Progress value={project.progress} className="h-2" />
        </div>
        
        {/* Collaborators */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Users className="h-4 w-4 text-gray-500" />
            <div className="flex -space-x-2">
              {project.collaborators.slice(0, 3).map((collaborator) => (
                <Avatar key={collaborator.id} className="h-6 w-6 border-2 border-white dark:border-gray-800">
                  <AvatarImage src={collaborator.avatar} alt={collaborator.name} />
                  <AvatarFallback className="text-xs">
                    {collaborator.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              ))}
              {project.collaborators.length > 3 && (
                <div className="h-6 w-6 rounded-full bg-gray-200 dark:bg-gray-700 border-2 border-white dark:border-gray-800 flex items-center justify-center">
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                    +{project.collaborators.length - 3}
                  </span>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-3 text-xs text-gray-500 dark:text-gray-400">
            <div className="flex items-center space-x-1">
              <Star className="h-3 w-3" />
              <span>{project.stars}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Eye className="h-3 w-3" />
              <span>{project.views}</span>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3 text-xs text-gray-500 dark:text-gray-400">
            <div className="flex items-center space-x-1">
              <Code className="h-3 w-3" />
              <span>{project.language}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Clock className="h-3 w-3" />
              <span>{formatLastModified(project.lastModified)}</span>
            </div>
          </div>
          
          {project.isPublic && (
            <Badge variant="outline" className="text-xs">
              <Share2 className="h-3 w-3 mr-1" />
              Public
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
