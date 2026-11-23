import { useEffect, useRef, useCallback } from 'react';
import { useEditorStore } from '../store/useEditorStore';

export function useWebSocket(projectId: string | undefined) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);

  const {
    setWsStatus,
    setCurrentUser,
    setCollaborators,
    addCollaborator,
    removeCollaborator,
    updateLiveCursor,
    addConsoleLog,
    updateFileContentLocally,
    refreshPreview,
  } = useEditorStore();

  const connect = useCallback(() => {
    if (!projectId) return;

    setWsStatus('connecting');

    // Build WebSocket URL
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws/projects/${projectId}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setWsStatus('connected');
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        const { event: eventType, data } = message;

        switch (eventType) {
          case 'project.joined':
            if (data.currentUser) setCurrentUser(data.currentUser);
            if (data.activeUsers) setCollaborators(data.activeUsers);
            break;

          case 'user.joined':
            if (data.user) {
              addCollaborator(data.user);
              addConsoleLog({
                level: 'info',
                message: `${data.user.userName} joined the project session.`,
                timestamp: Date.now(),
              });
            }
            break;

          case 'user.left':
            if (data.user) {
              removeCollaborator(data.user.userId);
              addConsoleLog({
                level: 'info',
                message: `${data.user.userName} left the session.`,
                timestamp: Date.now(),
              });
            }
            break;

          case 'code.updated':
            if (data.filename && data.content !== undefined) {
              updateFileContentLocally(data.filename, data.content);
              refreshPreview();
            }
            break;

          case 'element.updated':
            if (data.updatedHtml && data.filename) {
              updateFileContentLocally(data.filename, data.updatedHtml);
              refreshPreview();
            }
            break;

          case 'cursor.moved':
            if (data.user && data.x !== undefined && data.y !== undefined) {
              updateLiveCursor(data.user.userId, {
                x: data.x,
                y: data.y,
                userColor: data.user.userColor,
                userName: data.user.userName,
              });
            }
            break;

          case 'project.saved':
            addConsoleLog({
              level: 'info',
              message: `Project saved: Version #${data.versionNumber} created by ${data.user?.userName || 'collaborator'}.`,
              timestamp: Date.now(),
            });
            break;

          case 'error':
            addConsoleLog({
              level: 'error',
              message: data.message || 'WebSocket server error',
              timestamp: Date.now(),
            });
            break;

          default:
            break;
        }
      } catch (err) {
        console.error('Error handling WebSocket message:', err);
      }
    };

    ws.onclose = () => {
      setWsStatus('disconnected');
      wsRef.current = null;
      // Reconnect after 3 seconds
      reconnectTimeoutRef.current = window.setTimeout(() => {
        connect();
      }, 3000);
    };

    ws.onerror = (err) => {
      console.warn('WebSocket connection error:', err);
      ws.close();
    };
  }, [
    projectId,
    setWsStatus,
    setCurrentUser,
    setCollaborators,
    addCollaborator,
    removeCollaborator,
    updateLiveCursor,
    addConsoleLog,
    updateFileContentLocally,
    refreshPreview,
  ]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);

  // Outgoing send functions
  const sendEvent = useCallback((event: string, data: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ event, data }));
    }
  }, []);

  const sendCursorMove = useCallback(
    (x: number, y: number) => {
      sendEvent('cursor.move', { x, y });
    },
    [sendEvent]
  );

  const sendElementSelect = useCallback(
    (elementId: string) => {
      sendEvent('element.select', { elementId });
    },
    [sendEvent]
  );

  const sendCodeUpdate = useCallback(
    (filename: string, content: string) => {
      sendEvent('code.update', { filename, content, changeSource: 'monaco' });
    },
    [sendEvent]
  );

  return {
    sendEvent,
    sendCursorMove,
    sendElementSelect,
    sendCodeUpdate,
  };
}
