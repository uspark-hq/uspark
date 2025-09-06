import React, { useEffect, useState } from 'react';
import type { Session, Turn } from '../../../src/lib/api/sessions';

interface ChatStatusProps {
  session?: Session | null;
  currentTurn?: Turn | null;
}

export function ChatStatus({ session, currentTurn }: ChatStatusProps) {
  const [executionTime, setExecutionTime] = useState<number>(0);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    const hasActiveTurns = session?.turns?.some(
      t => t.status === 'running' || t.status === 'pending'
    ) ?? false;

    if (hasActiveTurns || currentTurn?.status === 'running') {
      setIsActive(true);
      const startTime = currentTurn?.createdAt ? currentTurn.createdAt : new Date();
      
      interval = setInterval(() => {
        const now = new Date();
        const elapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000);
        setExecutionTime(elapsed);
      }, 100);
    } else {
      setIsActive(false);
      if (currentTurn?.completedAt && currentTurn?.startedAt) {
        const start = currentTurn.startedAt;
        const end = currentTurn.completedAt;
        const elapsed = Math.floor((end.getTime() - start.getTime()) / 1000);
        setExecutionTime(elapsed);
      }
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [session, currentTurn]);

  const formatTime = (seconds: number): string => {
    if (seconds < 60) {
      return `${seconds}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getStatusColor = () => {
    if (!session) return '#6b7280';
    
    const hasActiveTurns = session.turns?.some(
      t => t.status === 'running' || t.status === 'pending'
    ) ?? false;
    
    const hasFailedTurns = session.turns?.some(
      t => t.status === 'failed'
    ) ?? false;
    
    if (hasActiveTurns) return '#3b82f6';
    if (hasFailedTurns) return '#ef4444';
    if (session.turns && session.turns.length > 0) return '#10b981';
    return '#6b7280';
  };

  const getStatusText = () => {
    if (!session) return 'No Session';
    
    const hasActiveTurns = session.turns?.some(
      t => t.status === 'running' || t.status === 'pending'
    ) ?? false;
    
    if (hasActiveTurns && currentTurn) {
      const blockCount = currentTurn.blocks?.length ?? 0;
      return `Processing (${blockCount} block${blockCount !== 1 ? 's' : ''})`;
    }
    
    const hasFailedTurns = session.turns?.some(
      t => t.status === 'failed'
    ) ?? false;
    
    if (!session.turns || session.turns.length === 0) return 'Ready';
    if (hasActiveTurns) return 'Processing...';
    if (hasFailedTurns) return 'Failed';
    return 'Completed';
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        padding: '8px 16px',
        backgroundColor: 'rgba(156, 163, 175, 0.05)',
        borderRadius: '6px',
        fontSize: '12px',
      }}
    >
      {/* Status Indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: getStatusColor(),
            boxShadow: isActive ? `0 0 0 2px ${getStatusColor()}40` : 'none',
            animation: isActive ? 'pulse-ring 1.5s infinite' : 'none',
          }}
        />
        <span
          style={{
            fontWeight: '500',
            color: getStatusColor(),
          }}
        >
          {getStatusText()}
        </span>
      </div>

      {/* Execution Time */}
      {(isActive || executionTime > 0) && (
        <>
          <div
            style={{
              width: '1px',
              height: '16px',
              backgroundColor: 'rgba(156, 163, 175, 0.2)',
            }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: 'rgba(156, 163, 175, 0.8)' }}>⏱️</span>
            <span style={{ color: 'var(--foreground)', fontFamily: 'monospace' }}>
              {formatTime(executionTime)}
            </span>
          </div>
        </>
      )}

      {/* Turn Counter */}
      {session && session.turns && session.turns.length > 0 && (
        <>
          <div
            style={{
              width: '1px',
              height: '16px',
              backgroundColor: 'rgba(156, 163, 175, 0.2)',
            }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: 'rgba(156, 163, 175, 0.8)' }}>💬</span>
            <span style={{ color: 'var(--foreground)' }}>
              {session.turns.length} turn{session.turns.length !== 1 ? 's' : ''}
            </span>
          </div>
        </>
      )}

      {/* Session ID */}
      {session && (
        <>
          <div
            style={{
              width: '1px',
              height: '16px',
              backgroundColor: 'rgba(156, 163, 175, 0.2)',
            }}
          />
          <div
            style={{
              fontSize: '11px',
              color: 'rgba(156, 163, 175, 0.6)',
              fontFamily: 'monospace',
            }}
          >
            Session: {session.id.slice(0, 8)}...
          </div>
        </>
      )}

      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes pulse-ring {
              0% {
                box-shadow: 0 0 0 0 ${getStatusColor()}60;
              }
              50% {
                box-shadow: 0 0 0 4px ${getStatusColor()}20;
              }
              100% {
                box-shadow: 0 0 0 0 ${getStatusColor()}00;
              }
            }
          `,
        }}
      />
    </div>
  );
}