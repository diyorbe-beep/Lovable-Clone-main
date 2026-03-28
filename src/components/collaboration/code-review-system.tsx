'use client';

import { useState, useEffect } from 'react';
import { 
  GitPullRequest, 
  MessageSquare, 
  CheckCircle, 
  XCircle, 
  Clock, 
  User, 
  Code, 
  FileText, 
  AlertCircle,
  CheckSquare,
  XSquare,
  Eye,
  ThumbsUp,
  ThumbsDown,
  MessageCircle,
  Users,
  Calendar,
  Zap,
  Shield
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface PullRequest {
  id: string;
  title: string;
  description: string;
  author: {
    name: string;
    avatar?: string;
    email: string;
  };
  status: 'open' | 'closed' | 'merged' | 'draft';
  createdAt: Date;
  updatedAt: Date;
  reviewers: Array<{
    name: string;
    avatar?: string;
    status: 'pending' | 'approved' | 'changes_requested';
    comment?: string;
  }>;
  changes: {
    additions: number;
    deletions: number;
    files: number;
  };
  conflicts: number;
  checks: {
    passed: number;
    failed: number;
    pending: number;
  };
  labels: string[];
  comments: Array<{
    id: string;
    author: string;
    content: string;
    createdAt: Date;
    type: 'comment' | 'suggestion' | 'issue';
  }>;
}

interface ReviewComment {
  id: string;
  line: number;
  content: string;
  type: 'suggestion' | 'issue' | 'praise';
  author: string;
  createdAt: Date;
  resolved?: boolean;
}

export default function CodeReviewSystem() {
  const [pullRequests, setPullRequests] = useState<PullRequest[]>([]);
  const [selectedPR, setSelectedPR] = useState<PullRequest | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [newComment, setNewComment] = useState('');
  const [reviewAction, setReviewAction] = useState<'approve' | 'changes' | 'comment'>('comment');

  useEffect(() => {
    // Mock data - in real app, fetch from API
    const mockPRs: PullRequest[] = [
      {
        id: 'pr-1',
        title: 'Add user authentication system',
        description: 'Implement JWT-based authentication with refresh tokens',
        author: {
          name: 'John Doe',
          email: 'john@example.com',
          avatar: '/avatars/john.jpg'
        },
        status: 'open',
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-01-16'),
        reviewers: [
          { name: 'Jane Smith', status: 'approved', comment: 'Looks good!' },
          { name: 'Bob Johnson', status: 'changes_requested', comment: 'Need to add error handling' },
          { name: 'Alice Brown', status: 'pending' }
        ],
        changes: {
          additions: 245,
          deletions: 12,
          files: 8
        },
        conflicts: 0,
        checks: {
          passed: 12,
          failed: 1,
          pending: 2
        },
        labels: ['authentication', 'security', 'feature'],
        comments: [
          {
            id: 'c1',
            author: 'Jane Smith',
            content: 'Great implementation! The refresh token logic is solid.',
            createdAt: new Date('2024-01-15'),
            type: 'comment'
          },
          {
            id: 'c2',
            author: 'Bob Johnson',
            content: 'Consider adding rate limiting to prevent brute force attacks',
            createdAt: new Date('2024-01-16'),
            type: 'suggestion'
          }
        ]
      },
      {
        id: 'pr-2',
        title: 'Fix memory leak in data processing',
        description: 'Resolve memory leak issue in the data processing pipeline',
        author: {
          name: 'Alice Brown',
          email: 'alice@example.com',
          avatar: '/avatars/alice.jpg'
        },
        status: 'merged',
        createdAt: new Date('2024-01-14'),
        updatedAt: new Date('2024-01-15'),
        reviewers: [
          { name: 'John Doe', status: 'approved' },
          { name: 'Jane Smith', status: 'approved' }
        ],
        changes: {
          additions: 15,
          deletions: 8,
          files: 3
        },
        conflicts: 0,
        checks: {
          passed: 8,
          failed: 0,
          pending: 0
        },
        labels: ['bugfix', 'performance'],
        comments: []
      }
    ];

    setPullRequests(mockPRs);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'closed':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'merged':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'draft':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getReviewerStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'text-green-600';
      case 'changes_requested':
        return 'text-red-600';
      case 'pending':
        return 'text-yellow-600';
      default:
        return 'text-gray-600';
    }
  };

  const getReviewerIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckSquare className="h-4 w-4" />;
      case 'changes_requested':
        return <XSquare className="h-4 w-4" />;
      case 'pending':
        return <Clock className="h-4 w-4" />;
      default:
        return <Eye className="h-4 w-4" />;
    }
  };

  const submitReview = async () => {
    if (!selectedPR || !newComment.trim()) return;

    // Mock implementation - in real app, submit to API
    const comment = {
      id: `c-${Date.now()}`,
      author: 'Current User',
      content: newComment,
      createdAt: new Date(),
      type: reviewAction === 'approve' ? 'comment' : reviewAction
    };

    setSelectedPR(prev => prev ? {
      ...prev,
      comments: [...prev.comments, comment]
    } : null);

    setNewComment('');
  };

  const openPRs = pullRequests.filter(pr => pr.status === 'open');
  const closedPRs = pullRequests.filter(pr => pr.status === 'closed');
  const mergedPRs = pullRequests.filter(pr => pr.status === 'merged');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
            <GitPullRequest className="h-6 w-6 mr-2 text-indigo-600" />
            Code Review System
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Advanced pull request management and code review workflow
          </p>
        </div>
        <Button>
          <GitPullRequest className="h-4 w-4 mr-2" />
          New Pull Request
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Open PRs</p>
                <p className="text-2xl font-bold">{openPRs.length}</p>
              </div>
              <GitPullRequest className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Pending Reviews</p>
                <p className="text-2xl font-bold">
                  {openPRs.reduce((acc, pr) => acc + pr.reviewers.filter(r => r.status === 'pending').length, 0)}
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Merged PRs</p>
                <p className="text-2xl font-bold">{mergedPRs.length}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Active Reviewers</p>
                <p className="text-2xl font-bold">
                  {new Set(pullRequests.flatMap(pr => pr.reviewers.map(r => r.name))).size}
                </p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pull Requests List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Pull Requests</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {pullRequests.map((pr) => (
                <div
                  key={pr.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedPR?.id === pr.id
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                  onClick={() => setSelectedPR(pr)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm line-clamp-1">{pr.title}</h4>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge className={getStatusColor(pr.status)}>
                          {pr.status}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          #{pr.id.split('-')[1]}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 mt-2 text-xs text-gray-500">
                        <span>+{pr.changes.additions}</span>
                        <span>-{pr.changes.deletions}</span>
                        <span>📁 {pr.changes.files}</span>
                      </div>
                    </div>
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={pr.author.avatar} alt={pr.author.name} />
                      <AvatarFallback className="text-xs">
                        {pr.author.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Pull Request Details */}
        <div className="lg:col-span-2">
          {selectedPR ? (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="changes">Changes</TabsTrigger>
                <TabsTrigger value="review">Review</TabsTrigger>
                <TabsTrigger value="comments">Comments</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center">
                        <GitPullRequest className="h-5 w-5 mr-2" />
                        {selectedPR.title}
                      </CardTitle>
                      <Badge className={getStatusColor(selectedPR.status)}>
                        {selectedPR.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-gray-600 dark:text-gray-400">
                      {selectedPR.description}
                    </p>

                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={selectedPR.author.avatar} alt={selectedPR.author.name} />
                          <AvatarFallback>
                            {selectedPR.author.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{selectedPR.author.name}</p>
                          <p className="text-sm text-gray-500">{selectedPR.author.email}</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Created</p>
                        <p className="font-medium">{selectedPR.createdAt.toLocaleDateString()}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Updated</p>
                        <p className="font-medium">{selectedPR.updatedAt.toLocaleDateString()}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {selectedPR.labels.map((label) => (
                        <Badge key={label} variant="outline">
                          {label}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Review Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {selectedPR.reviewers.map((reviewer, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={reviewer.avatar} alt={reviewer.name} />
                              <AvatarFallback className="text-xs">
                                {reviewer.name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{reviewer.name}</p>
                              {reviewer.comment && (
                                <p className="text-sm text-gray-500">{reviewer.comment}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {getReviewerIcon(reviewer.status)}
                            <span className={`text-sm ${getReviewerStatusColor(reviewer.status)}`}>
                              {reviewer.status.replace('_', ' ')}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Checks</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Passed</span>
                        <div className="flex items-center space-x-2">
                          <Progress value={(selectedPR.checks.passed / (selectedPR.checks.passed + selectedPR.checks.failed + selectedPR.checks.pending)) * 100} className="w-32 h-2" />
                          <span className="text-sm font-medium text-green-600">{selectedPR.checks.passed}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Failed</span>
                        <span className="text-sm font-medium text-red-600">{selectedPR.checks.failed}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Pending</span>
                        <span className="text-sm font-medium text-yellow-600">{selectedPR.checks.pending}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="changes" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>File Changes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 border rounded">
                        <div className="flex items-center space-x-3">
                          <FileText className="h-4 w-4" />
                          <span className="font-medium">src/auth/jwt.ts</span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm">
                          <span className="text-green-600">+45</span>
                          <span className="text-red-600">-3</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-3 border rounded">
                        <div className="flex items-center space-x-3">
                          <FileText className="h-4 w-4" />
                          <span className="font-medium">src/auth/refresh.ts</span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm">
                          <span className="text-green-600">+28</span>
                          <span className="text-red-600">-1</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="review" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Submit Review</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center space-x-4">
                      <Button
                        variant={reviewAction === 'approve' ? 'default' : 'outline'}
                        onClick={() => setReviewAction('approve')}
                        className="flex items-center"
                      >
                        <ThumbsUp className="h-4 w-4 mr-2" />
                        Approve
                      </Button>
                      <Button
                        variant={reviewAction === 'changes' ? 'default' : 'outline'}
                        onClick={() => setReviewAction('changes')}
                        className="flex items-center"
                      >
                        <ThumbsDown className="h-4 w-4 mr-2" />
                        Request Changes
                      </Button>
                      <Button
                        variant={reviewAction === 'comment' ? 'default' : 'outline'}
                        onClick={() => setReviewAction('comment')}
                        className="flex items-center"
                      >
                        <MessageCircle className="h-4 w-4 mr-2" />
                        Comment
                      </Button>
                    </div>

                    <Textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Leave your review comments here..."
                      className="min-h-32"
                    />

                    <Button onClick={submitReview} disabled={!newComment.trim()}>
                      Submit Review
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="comments" className="space-y-4">
                {selectedPR.comments.map((comment) => (
                  <Card key={comment.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start space-x-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>
                            {comment.author.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">{comment.author}</span>
                            <Badge variant="outline">{comment.type}</Badge>
                            <span className="text-sm text-gray-500">
                              {comment.createdAt.toLocaleDateString()}
                            </span>
                          </div>
                          <p className="mt-2 text-gray-700 dark:text-gray-300">
                            {comment.content}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>
            </Tabs>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <GitPullRequest className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Select a Pull Request
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Choose a pull request from the list to view details and review
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
