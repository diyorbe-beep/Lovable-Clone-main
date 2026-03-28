import { Server as SocketIOServer } from 'socket.io';
import { NextApiRequest, NextApiResponse } from 'next';
import { auth } from '@clerk/nextjs/server';

export class CollaborationSocket {
  private io: SocketIOServer;
  private projectRooms: Map<string, Set<string>> = new Map();

  constructor(res: NextApiResponse) {
    this.io = new SocketIOServer(res, {
      cors: {
        origin: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        methods: ["GET", "POST"]
      }
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log('User connected:', socket.id);

      socket.on('join-project', async (data) => {
        const { projectId, userId } = data;
        
        // Verify user has access to project
        if (await this.verifyProjectAccess(userId, projectId)) {
          socket.join(`project-${projectId}`);
          
          if (!this.projectRooms.has(projectId)) {
            this.projectRooms.set(projectId, new Set());
          }
          this.projectRooms.get(projectId)!.add(socket.id);

          socket.emit('joined-project', { projectId });
          socket.to(`project-${projectId}`).emit('user-joined', { userId });
        }
      });

      socket.on('leave-project', (data) => {
        const { projectId, userId } = data;
        socket.leave(`project-${projectId}`);
        
        const room = this.projectRooms.get(projectId);
        if (room) {
          room.delete(socket.id);
          if (room.size === 0) {
            this.projectRooms.delete(projectId);
          }
        }

        socket.to(`project-${projectId}`).emit('user-left', { userId });
      });

      socket.on('code-change', (data) => {
        const { projectId, change, userId } = data;
        socket.to(`project-${projectId}`).emit('code-change', {
          change,
          userId,
          timestamp: Date.now()
        });
      });

      socket.on('cursor-position', (data) => {
        const { projectId, position, userId } = data;
        socket.to(`project-${projectId}`).emit('cursor-position', {
          position,
          userId
        });
      });

      socket.on('selection-change', (data) => {
        const { projectId, selection, userId } = data;
        socket.to(`project-${projectId}`).emit('selection-change', {
          selection,
          userId
        });
      });

      socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        // Clean up from all rooms
        this.projectRooms.forEach((users, projectId) => {
          users.delete(socket.id);
          if (users.size === 0) {
            this.projectRooms.delete(projectId);
          }
        });
      });
    });
  }

  private async verifyProjectAccess(userId: string, projectId: string): Promise<boolean> {
    // Implement project access verification
    return true; // Placeholder
  }

  public broadcastToProject(projectId: string, event: string, data: any) {
    this.io.to(`project-${projectId}`).emit(event, data);
  }

  public getProjectUsers(projectId: string): number {
    return this.projectRooms.get(projectId)?.size || 0;
  }
}
